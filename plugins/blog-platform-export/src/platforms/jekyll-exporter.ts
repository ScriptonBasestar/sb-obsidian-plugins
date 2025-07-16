import { TFile, Vault } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as moment from 'moment';
import { ConversionEngine } from '../conversion-engine';
import {
  JekyllSettings,
  ExportProfile,
  ConversionResult,
  ConversionError,
  ParsedContent,
} from '../types';

export class JekyllExporter {
  private vault: Vault;
  private conversionEngine: ConversionEngine;
  private settings: JekyllSettings;
  private profile: ExportProfile;

  constructor(vault: Vault, profile: ExportProfile) {
    this.vault = vault;
    this.conversionEngine = new ConversionEngine(vault);
    this.profile = profile;
    this.settings = profile.settings.jekyll!;
  }

  /**
   * Export files to Jekyll format
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
   * Export a single file to Jekyll format
   */
  private async exportFile(
    file: TFile,
    outputPath: string,
    result: ConversionResult
  ): Promise<void> {
    const parsed = await this.conversionEngine.parseFile(file);
    const jekyllContent = await this.convertToJekyll(file, parsed);
    const targetPath = this.getTargetPath(file, outputPath, parsed.frontmatter);

    // Ensure target directory exists
    await fs.ensureDir(path.dirname(targetPath));

    // Write the converted content
    await fs.writeFile(targetPath, jekyllContent, 'utf8');

    // Validate content and collect warnings
    const validation = this.conversionEngine.validateContent(jekyllContent);
    result.warnings.push(...validation.warnings);
  }

  /**
   * Convert parsed content to Jekyll format
   */
  private async convertToJekyll(file: TFile, parsed: ParsedContent): Promise<string> {
    // Process frontmatter
    const jekyllFrontmatter = this.convertFrontmatter(file, parsed.frontmatter);

    // Process content
    let content = parsed.content;

    // Convert wikilinks to Jekyll-compatible links
    content = this.convertWikiLinks(content);

    // Convert embedded images
    content = this.convertImages(content);

    // Process code blocks and math
    content = this.conversionEngine.processCodeBlocks(content, 'jekyll');

    // Apply Jekyll-specific transformations
    content = this.applyJekyllTransformations(content);

    // Clean content
    content = this.conversionEngine.cleanContent(content);

    // Generate final content with frontmatter
    return this.formatContent(jekyllFrontmatter, content);
  }

  /**
   * Convert Obsidian frontmatter to Jekyll frontmatter
   */
  private convertFrontmatter(file: TFile, obsidianMeta: Record<string, any>): Record<string, any> {
    const jekyll: Record<string, any> = {};

    // Basic fields
    jekyll.title = obsidianMeta.title || file.basename;
    jekyll.date = obsidianMeta.date || moment(file.stat.ctime).format('YYYY-MM-DD HH:mm:ss ZZ');
    jekyll.author = obsidianMeta.author || 'Unknown';

    // Layout
    jekyll.layout = obsidianMeta.layout || this.getDefaultLayout(file.path);

    // Categories and tags
    if (obsidianMeta.categories) {
      const categories = Array.isArray(obsidianMeta.categories)
        ? obsidianMeta.categories
        : [obsidianMeta.categories];
      jekyll.categories = this.applyCategoryMapping(categories);
    }

    if (obsidianMeta.tags) {
      const tags = Array.isArray(obsidianMeta.tags) ? obsidianMeta.tags : [obsidianMeta.tags];
      jekyll.tags = tags;
    }

    // Description and excerpt
    if (obsidianMeta.description) {
      jekyll.description = obsidianMeta.description;
      jekyll.excerpt = obsidianMeta.description;
    }

    // Draft status
    jekyll.published = obsidianMeta.published !== false && !obsidianMeta.draft;

    // Permalink
    if (obsidianMeta.permalink) {
      jekyll.permalink = obsidianMeta.permalink;
    } else if (this.settings.permalinkStructure) {
      jekyll.permalink = this.generatePermalink(file, obsidianMeta);
    }

    // Image/featured image
    if (obsidianMeta.image || obsidianMeta.featured_image) {
      jekyll.image = obsidianMeta.image || obsidianMeta.featured_image;
    }

    // SEO fields
    if (obsidianMeta.keywords) {
      jekyll.keywords = Array.isArray(obsidianMeta.keywords)
        ? obsidianMeta.keywords
        : [obsidianMeta.keywords];
    }

    // Social media
    if (obsidianMeta.twitter) {
      jekyll.twitter = obsidianMeta.twitter;
    }

    // Custom fields
    const customFields = ['series', 'weight', 'toc', 'math', 'mermaid', 'comments'];
    for (const field of customFields) {
      if (obsidianMeta[field] !== undefined) {
        jekyll[field] = obsidianMeta[field];
      }
    }

    // Apply layout mapping
    if (this.settings.layoutMapping[jekyll.layout]) {
      jekyll.layout = this.settings.layoutMapping[jekyll.layout];
    }

    return jekyll;
  }

  /**
   * Convert wikilinks to Jekyll format
   */
  private convertWikiLinks(content: string): string {
    return content.replace(/\[\[([^\]]+?)\]\]/g, (match, linkContent) => {
      const [target, alias] = linkContent.includes('|')
        ? linkContent.split('|', 2)
        : [linkContent, linkContent];

      const cleanTarget = target.trim();
      const displayText = alias?.trim() || cleanTarget;

      // Convert to Jekyll post link format
      const slug = this.conversionEngine.slugify(cleanTarget);
      return `[${displayText}]({% post_url ${slug} %})`;
    });
  }

  /**
   * Convert embedded images to Jekyll format
   */
  private convertImages(content: string): string {
    return content.replace(/!\[\[([^\]]+?)\]\]/g, (match, imagePath) => {
      const cleanPath = imagePath.trim();

      // Jekyll assets path
      const assetsPath = `/assets/images/${cleanPath}`;

      // Extract filename for alt text
      const filename = cleanPath.split('/').pop()?.split('.')[0] || 'image';

      return `![${filename}](${assetsPath})`;
    });
  }

  /**
   * Apply Jekyll-specific transformations
   */
  private applyJekyllTransformations(content: string): string {
    // Convert callouts to Jekyll includes
    content = content.replace(
      /> \[!(\w+)\]\s*([^\n]*)\n((?:> [^\n]*\n)*)/g,
      (match, type, title, body) => {
        const cleanBody = body.replace(/^> /gm, '').trim();
        const includeType = type.toLowerCase();
        return `{% include ${includeType}.html title="${title}" content="${cleanBody}" %}`;
      }
    );

    // Convert code blocks with language to Jekyll highlight tags
    content = content.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `{% highlight ${lang} %}\n${code.trim()}\n{% endhighlight %}`;
    });

    // Convert math blocks
    content = content.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
      return `{% raw %}\n$$\n${math.trim()}\n$$\n{% endraw %}`;
    });

    // YouTube embeds
    content = content.replace(
      /https:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g,
      '{% include youtube.html id="$1" %}'
    );

    // Gist embeds
    content = content.replace(
      /https:\/\/gist\.github\.com\/([^\/]+)\/([a-f0-9]+)/g,
      '{% gist $1/$2 %}'
    );

    return content;
  }

  /**
   * Format content with Jekyll frontmatter
   */
  private formatContent(frontmatter: Record<string, any>, content: string): string {
    const frontmatterStr = `---\n${yaml.dump(frontmatter, {
      sortKeys: false,
      lineWidth: -1,
    })}---\n\n`;

    return frontmatterStr + content;
  }

  /**
   * Get target file path for Jekyll export
   */
  private getTargetPath(file: TFile, outputPath: string, frontmatter: Record<string, any>): string {
    const isPost = this.isPost(file.path, frontmatter);

    if (isPost) {
      // Posts go to _posts with date prefix
      const filename = this.generatePostFilename(file, frontmatter);
      return path.join(outputPath, this.settings.postsDir, filename);
    } else if (frontmatter.published === false || frontmatter.draft) {
      // Drafts go to _drafts
      return path.join(outputPath, this.settings.draftsDir, `${file.basename}.md`);
    } else {
      // Regular pages
      let relativePath = file.path;

      // Apply path mappings
      for (const mapping of this.profile.pathMappings) {
        if (mapping.enabled && file.path.startsWith(mapping.obsidianPath)) {
          relativePath = file.path.replace(mapping.obsidianPath, mapping.targetPath);
          break;
        }
      }

      // Check if it's a collection
      const collection = this.getCollection(relativePath);
      if (collection) {
        return path.join(
          outputPath,
          this.settings.collectionsDir,
          collection,
          `${file.basename}.md`
        );
      }

      // Regular page
      return path.join(outputPath, relativePath);
    }
  }

  /**
   * Generate Jekyll post filename with date prefix
   */
  private generatePostFilename(file: TFile, frontmatter: Record<string, any>): string {
    const date = frontmatter.date || moment(file.stat.ctime);
    const dateStr = moment(date).format('YYYY-MM-DD');
    const slug = this.conversionEngine.slugify(frontmatter.title || file.basename);

    return `${dateStr}-${slug}.md`;
  }

  /**
   * Generate permalink based on structure
   */
  private generatePermalink(file: TFile, frontmatter: Record<string, any>): string {
    let permalink = this.settings.permalinkStructure;

    const date = moment(frontmatter.date || file.stat.ctime);
    const replacements: Record<string, string> = {
      ':year': date.format('YYYY'),
      ':month': date.format('MM'),
      ':day': date.format('DD'),
      ':title': this.conversionEngine.slugify(frontmatter.title || file.basename),
      ':categories': frontmatter.categories ? frontmatter.categories.join('/') : '',
      ':slug': this.conversionEngine.slugify(file.basename),
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      permalink = permalink.replace(placeholder, value);
    }

    return permalink;
  }

  /**
   * Apply category mapping
   */
  private applyCategoryMapping(categories: string[]): string[] {
    return categories.map((category) => {
      return this.settings.categoryMapping[category] || category;
    });
  }

  /**
   * Get default layout based on file path
   */
  private getDefaultLayout(filePath: string): string {
    if (this.isPost(filePath)) {
      return 'post';
    } else if (filePath.includes('/pages/')) {
      return 'page';
    } else {
      return 'default';
    }
  }

  /**
   * Check if file should be treated as a post
   */
  private isPost(filePath: string, frontmatter?: Record<string, any>): boolean {
    if (frontmatter?.layout === 'post') return true;
    if (filePath.includes('/posts/') || filePath.includes('/blog/')) return true;
    if (frontmatter?.categories || frontmatter?.tags) return true;
    return false;
  }

  /**
   * Get collection name from file path
   */
  private getCollection(filePath: string): string | null {
    const collections = ['tutorials', 'projects', 'documentation', 'guides'];

    for (const collection of collections) {
      if (filePath.includes(`/${collection}/`)) {
        return collection;
      }
    }

    return null;
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(outputPath: string): Promise<void> {
    const dirs = [
      path.join(outputPath, this.settings.postsDir),
      path.join(outputPath, this.settings.draftsDir),
      path.join(outputPath, this.settings.collectionsDir),
      path.join(outputPath, this.settings.includesDir),
      path.join(outputPath, this.settings.dataDir),
      path.join(outputPath, 'assets', 'images'),
      path.join(outputPath, 'assets', 'files'),
    ];

    for (const dir of dirs) {
      await fs.ensureDir(dir);
    }
  }

  /**
   * Copy assets to Jekyll assets directory
   */
  private async copyAssets(
    files: TFile[],
    outputPath: string,
    result: ConversionResult
  ): Promise<void> {
    const allFiles = this.vault.getFiles();

    for (const file of allFiles) {
      if (this.isAssetFile(file)) {
        try {
          const isImage = this.isImageFile(file);
          const assetsSubdir = isImage ? 'images' : 'files';
          const targetPath = path.join(outputPath, 'assets', assetsSubdir, file.path);

          await fs.ensureDir(path.dirname(targetPath));

          const buffer = await this.vault.readBinary(file);
          await fs.writeFile(targetPath, buffer);

          result.assets.push({
            originalPath: file.path,
            targetPath,
            size: buffer.byteLength,
            type: isImage ? 'image' : 'attachment',
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
