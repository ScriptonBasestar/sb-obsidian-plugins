import { TFile, Vault } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as toml from 'toml';
import * as moment from 'moment';
import { ConversionEngine } from '../conversion-engine';
import {
  HugoSettings,
  ExportProfile,
  ConversionResult,
  ConversionError,
  ParsedContent,
} from '../types';

export class HugoExporter {
  private vault: Vault;
  private conversionEngine: ConversionEngine;
  private settings: HugoSettings;
  private profile: ExportProfile;

  constructor(vault: Vault, profile: ExportProfile) {
    this.vault = vault;
    this.conversionEngine = new ConversionEngine(vault);
    this.profile = profile;
    this.settings = profile.settings.hugo!;
  }

  /**
   * Export files to Hugo format
   */
  async exportFiles(files: TFile[], outputPath: string): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: true,
      processedFiles: 0,
      skippedFiles: 0,
      errors: [],
      warnings: [],
      outputPath,
      assets: [],
    };

    try {
      // Ensure output directories exist
      await this.ensureDirectories(outputPath);

      // Process each file
      for (const file of files) {
        try {
          if (this.shouldSkipFile(file)) {
            result.skippedFiles++;
            continue;
          }

          await this.exportFile(file, outputPath, result);
          result.processedFiles++;
        } catch (error) {
          result.errors.push({
            file: file.path,
            error: error.message,
          });
        }
      }

      // Copy assets if configured
      if (this.profile.assetHandling?.copyImages) {
        await this.copyAssets(files, outputPath, result);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push({
        file: 'general',
        error: error.message,
      });
    }

    return result;
  }

  /**
   * Export a single file to Hugo format
   */
  private async exportFile(
    file: TFile,
    outputPath: string,
    result: ConversionResult
  ): Promise<void> {
    const parsed = await this.conversionEngine.parseFile(file);
    const hugoContent = await this.convertToHugo(file, parsed);
    const targetPath = this.getTargetPath(file, outputPath);

    // Ensure target directory exists
    await fs.ensureDir(path.dirname(targetPath));

    // Write the converted content
    await fs.writeFile(targetPath, hugoContent, 'utf8');

    // Validate content and collect warnings
    const validation = this.conversionEngine.validateContent(hugoContent);
    result.warnings.push(...validation.warnings);
  }

  /**
   * Convert parsed content to Hugo format
   */
  private async convertToHugo(file: TFile, parsed: ParsedContent): Promise<string> {
    // Process frontmatter
    const hugoFrontmatter = this.convertFrontmatter(file, parsed.frontmatter);

    // Process content
    let content = parsed.content;

    // Convert wikilinks to Hugo ref shortcodes or markdown links
    content = this.convertWikiLinks(content);

    // Convert embedded images
    content = this.convertImages(content);

    // Process code blocks and math
    content = this.conversionEngine.processCodeBlocks(content, 'hugo');

    // Apply Hugo shortcodes
    content = this.applyShortcodes(content);

    // Clean content
    content = this.conversionEngine.cleanContent(content);

    // Generate final content with frontmatter
    return this.formatContent(hugoFrontmatter, content);
  }

  /**
   * Convert Obsidian frontmatter to Hugo frontmatter
   */
  private convertFrontmatter(file: TFile, obsidianMeta: Record<string, any>): Record<string, any> {
    const hugo: Record<string, any> = {};

    // Basic fields
    hugo.title = obsidianMeta.title || file.basename;
    hugo.date = obsidianMeta.date || moment(file.stat.ctime).format('YYYY-MM-DDTHH:mm:ssZ');
    hugo.lastmod = obsidianMeta.lastmod || moment(file.stat.mtime).format('YYYY-MM-DDTHH:mm:ssZ');
    hugo.draft = obsidianMeta.draft || false;

    // Description
    if (obsidianMeta.description) {
      hugo.description = obsidianMeta.description;
    }

    // Tags and categories
    if (this.settings.taxonomies.tags.enabled && obsidianMeta.tags) {
      const tags = Array.isArray(obsidianMeta.tags) ? obsidianMeta.tags : [obsidianMeta.tags];
      hugo[this.settings.taxonomies.tags.fieldName] = this.transformTaxonomy(
        tags,
        this.settings.taxonomies.tags.transform
      );
    }

    if (this.settings.taxonomies.categories.enabled && obsidianMeta.categories) {
      const categories = Array.isArray(obsidianMeta.categories)
        ? obsidianMeta.categories
        : [obsidianMeta.categories];
      hugo[this.settings.taxonomies.categories.fieldName] = this.transformTaxonomy(
        categories,
        this.settings.taxonomies.categories.transform
      );
    }

    // Series
    if (this.settings.taxonomies.series.enabled && obsidianMeta.series) {
      hugo[this.settings.taxonomies.series.fieldName] = obsidianMeta.series;
    }

    // Weight/order
    if (obsidianMeta.weight !== undefined) {
      hugo.weight = parseInt(obsidianMeta.weight.toString());
    }

    // Type and layout
    const section = this.getSection(file.path);
    if (section) {
      hugo.type = section;
    }

    if (obsidianMeta.layout) {
      hugo.layout = obsidianMeta.layout;
    }

    // URL and aliases
    if (obsidianMeta.url) {
      hugo.url = obsidianMeta.url;
    }

    if (obsidianMeta.aliases) {
      hugo.aliases = Array.isArray(obsidianMeta.aliases)
        ? obsidianMeta.aliases
        : [obsidianMeta.aliases];
    }

    // Custom fields from profile template
    if (this.profile.templates.frontmatterTemplate) {
      const customFields = this.applyFrontmatterTemplate(obsidianMeta);
      Object.assign(hugo, customFields);
    }

    return hugo;
  }

  /**
   * Convert wikilinks to Hugo format
   */
  private convertWikiLinks(content: string): string {
    return content.replace(/\[\[([^\]]+?)\]\]/g, (match, linkContent) => {
      const [target, alias] = linkContent.includes('|')
        ? linkContent.split('|', 2)
        : [linkContent, linkContent];

      const cleanTarget = target.trim();
      const displayText = alias?.trim() || cleanTarget;

      // Use Hugo ref shortcode for internal links
      const slug = this.conversionEngine.slugify(cleanTarget);
      return `[${displayText}]({{< ref "${slug}" >}})`;
    });
  }

  /**
   * Convert embedded images to Hugo format
   */
  private convertImages(content: string): string {
    return content.replace(/!\[\[([^\]]+?)\]\]/g, (match, imagePath) => {
      const cleanPath = imagePath.trim();

      // Hugo static file path
      const staticPath = path.join('/', cleanPath);

      // Extract filename for alt text
      const filename = cleanPath.split('/').pop()?.split('.')[0] || 'image';

      return `![${filename}](${staticPath})`;
    });
  }

  /**
   * Apply Hugo shortcodes
   */
  private applyShortcodes(content: string): string {
    // Apply custom shortcode mappings
    for (const [pattern, shortcode] of Object.entries(this.settings.shortcodeMapping)) {
      const regex = new RegExp(pattern, 'g');
      content = content.replace(regex, shortcode);
    }

    // Common transformations

    // Callouts to Hugo notices
    content = content.replace(
      /> \[!(\w+)\]\s*([^\n]*)\n((?:> [^\n]*\n)*)/g,
      (match, type, title, body) => {
        const cleanBody = body.replace(/^> /gm, '').trim();
        const noticeType = type.toLowerCase();
        return `{{< notice ${noticeType} >}}\n${
          title ? title + '\n\n' : ''
        }${cleanBody}\n{{< /notice >}}`;
      }
    );

    // YouTube embeds
    content = content.replace(
      /https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g,
      '{{< youtube $1 >}}'
    );

    return content;
  }

  /**
   * Format content with frontmatter
   */
  private formatContent(frontmatter: Record<string, any>, content: string): string {
    let frontmatterStr = '';

    switch (this.settings.frontmatterFormat) {
      case 'yaml':
        frontmatterStr = `---\n${yaml.dump(frontmatter, {
          sortKeys: false,
          lineWidth: -1,
        })}---\n\n`;
        break;
      case 'toml':
        frontmatterStr = `+++\n${this.objectToToml(frontmatter)}\n+++\n\n`;
        break;
      case 'json':
        frontmatterStr = `{\n${JSON.stringify(frontmatter, null, 2)}\n}\n\n`;
        break;
    }

    return frontmatterStr + content;
  }

  /**
   * Convert object to TOML format
   */
  private objectToToml(obj: Record<string, any>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        lines.push(`${key} = [${value.map((v) => `"${v}"`).join(', ')}]`);
      } else if (typeof value === 'string') {
        lines.push(`${key} = "${value}"`);
      } else if (typeof value === 'boolean') {
        lines.push(`${key} = ${value}`);
      } else if (typeof value === 'number') {
        lines.push(`${key} = ${value}`);
      } else if (value instanceof Date) {
        lines.push(`${key} = ${value.toISOString()}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get target file path for export
   */
  private getTargetPath(file: TFile, outputPath: string): string {
    let relativePath = file.path;

    // Apply path mappings
    for (const mapping of this.profile.pathMappings) {
      if (mapping.enabled && file.path.startsWith(mapping.obsidianPath)) {
        relativePath = file.path.replace(mapping.obsidianPath, mapping.targetPath);
        break;
      }
    }

    // Apply section mapping
    const section = this.getSection(relativePath);
    if (section && this.settings.sectionMapping[section]) {
      relativePath = relativePath.replace(section, this.settings.sectionMapping[section]);
    }

    // Ensure .md extension
    if (!relativePath.endsWith('.md')) {
      relativePath += '.md';
    }

    return path.join(outputPath, this.settings.contentDir, relativePath);
  }

  /**
   * Get Hugo section from file path
   */
  private getSection(filePath: string): string | null {
    const parts = filePath.split('/');
    return parts.length > 1 ? parts[0] : null;
  }

  /**
   * Transform taxonomy values
   */
  private transformTaxonomy(values: string[], transform?: string): string[] {
    if (!transform) return values;

    return values.map((value) => {
      switch (transform) {
        case 'lowercase':
          return value.toLowerCase();
        case 'uppercase':
          return value.toUpperCase();
        case 'capitalize':
          return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        default:
          return value;
      }
    });
  }

  /**
   * Apply frontmatter template
   */
  private applyFrontmatterTemplate(metadata: Record<string, any>): Record<string, any> {
    // This would implement Handlebars template processing
    // For now, return empty object
    return {};
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(outputPath: string): Promise<void> {
    const dirs = [
      path.join(outputPath, this.settings.contentDir),
      path.join(outputPath, this.settings.staticDir),
    ];

    for (const dir of dirs) {
      await fs.ensureDir(dir);
    }
  }

  /**
   * Copy assets to Hugo static directory
   */
  private async copyAssets(
    files: TFile[],
    outputPath: string,
    result: ConversionResult
  ): Promise<void> {
    const staticDir = path.join(outputPath, this.settings.staticDir);
    const allFiles = this.vault.getFiles();

    for (const file of allFiles) {
      if (this.isAssetFile(file)) {
        try {
          const targetPath = path.join(staticDir, file.path);
          await fs.ensureDir(path.dirname(targetPath));

          const buffer = await this.vault.readBinary(file);
          await fs.writeFile(targetPath, buffer);

          result.assets.push({
            originalPath: file.path,
            targetPath,
            size: buffer.byteLength,
            type: this.isImageFile(file) ? 'image' : 'attachment',
          });
        } catch (error) {
          result.warnings.push(`Failed to copy asset ${file.path}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Check if file should be skipped
   */
  private shouldSkipFile(file: TFile): boolean {
    if (file.extension !== 'md') return true;

    const filter = this.profile.filters;

    // Check include/exclude folders
    if (filter.includeFolders.length > 0) {
      const inIncluded = filter.includeFolders.some((folder) => file.path.startsWith(folder));
      if (!inIncluded) return true;
    }

    if (filter.excludeFolders.some((folder) => file.path.startsWith(folder))) {
      return true;
    }

    // Check include/exclude files
    if (filter.includeFiles.length > 0) {
      const inIncluded = filter.includeFiles.some((pattern) => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(file.path);
      });
      if (!inIncluded) return true;
    }

    if (
      filter.excludeFiles.some((pattern) => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(file.path);
      })
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is an asset
   */
  private isAssetFile(file: TFile): boolean {
    const assetExtensions = [
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'svg',
      'pdf',
      'doc',
      'docx',
      'txt',
      'zip',
      'rar',
      'mp3',
      'mp4',
      'avi',
      'mov',
    ];
    return assetExtensions.includes(file.extension.toLowerCase());
  }

  /**
   * Check if file is an image
   */
  private isImageFile(file: TFile): boolean {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(file.extension.toLowerCase());
  }
}
