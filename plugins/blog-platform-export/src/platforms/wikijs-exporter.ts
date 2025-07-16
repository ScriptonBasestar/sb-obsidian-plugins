import { TFile, Vault } from 'obsidian';
import { WikiJSClient } from '@sb-obsidian-plugins/wikijs-sync/src/wikijs-client';
import { MetadataConverter } from '@sb-obsidian-plugins/wikijs-sync/src/metadata-converter';
import { PathMapper } from '@sb-obsidian-plugins/wikijs-sync/src/path-mapper';
import { ConversionEngine } from '../conversion-engine';
import {
  WikiJSSettings,
  ExportProfile,
  ConversionResult,
  ConversionError,
  ParsedContent,
} from '../types';

export class WikiJSExporter {
  private vault: Vault;
  private conversionEngine: ConversionEngine;
  private settings: WikiJSSettings;
  private profile: ExportProfile;
  private client: WikiJSClient;
  private metadataConverter: MetadataConverter;
  private pathMapper: PathMapper;

  constructor(vault: Vault, profile: ExportProfile) {
    this.vault = vault;
    this.conversionEngine = new ConversionEngine(vault);
    this.profile = profile;
    this.settings = profile.settings.wikijs!;

    // Initialize WikiJS components
    this.client = new WikiJSClient(this.settings.wikiUrl, this.settings.apiKey);
    this.metadataConverter = new MetadataConverter({
      tags: {
        enabled: true,
        prefix: this.settings.tagPrefix || '',
      },
      categories: {
        enabled: true,
        fieldName: 'categories',
      },
      customFields: [],
    });

    // Convert export profile path mappings to WikiJS format
    const wikiPathMappings = this.profile.pathMappings.map((mapping) => ({
      obsidianPath: mapping.obsidianPath,
      wikiPath: mapping.targetPath,
      enabled: mapping.enabled,
    }));

    this.pathMapper = new PathMapper(vault, wikiPathMappings);
  }

  /**
   * Export files to WikiJS
   */
  async exportFiles(files: TFile[], outputPath?: string): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: true,
      processedFiles: 0,
      skippedFiles: 0,
      errors: [],
      warnings: [],
      outputPath: this.settings.wikiUrl,
      assets: [],
    };

    try {
      // Test connection first
      const connected = await this.client.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to WikiJS. Please check your settings.');
      }

      // Process each file
      for (const file of files) {
        try {
          if (this.shouldSkipFile(file)) {
            result.skippedFiles++;
            continue;
          }

          await this.exportFile(file, result);
          result.processedFiles++;
        } catch (error) {
          result.errors.push({
            file: file.path,
            error: error.message,
          });
        }
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
   * Export a single file to WikiJS
   */
  private async exportFile(file: TFile, result: ConversionResult): Promise<void> {
    const parsed = await this.conversionEngine.parseFile(file);
    const wikiPageData = await this.convertToWikiJS(file, parsed);

    // Check if page already exists
    const existingPage = await this.client.getPage(wikiPageData.path);

    let response;
    if (existingPage) {
      // Update existing page
      response = await this.client.updatePage(existingPage.id, wikiPageData);
    } else {
      // Create new page
      response = await this.client.createPage(wikiPageData);
    }

    if (!response.succeeded) {
      throw new Error(response.message || 'Failed to create/update page in WikiJS');
    }

    // Validate content and collect warnings
    const validation = this.conversionEngine.validateContent(wikiPageData.content);
    result.warnings.push(...validation.warnings);
  }

  /**
   * Convert parsed content to WikiJS format
   */
  private async convertToWikiJS(file: TFile, parsed: ParsedContent): Promise<any> {
    // Convert frontmatter to WikiJS metadata
    const wikiMetadata = this.metadataConverter.obsidianToWiki(parsed.frontmatter);

    // Process content
    let content = parsed.content;

    // Convert wikilinks to standard markdown links
    const linkMapping = await this.buildLinkMapping();
    content = this.conversionEngine.convertWikiLinksToMarkdown(content, linkMapping);

    // Convert embedded images to standard markdown
    const imageMapping = await this.buildImageMapping();
    content = this.conversionEngine.convertEmbeddedImages(content, imageMapping);

    // Process code blocks and math for WikiJS
    content = this.conversionEngine.processCodeBlocks(content, 'wikijs');

    // Clean content
    content = this.conversionEngine.cleanContent(content);

    // Get WikiJS path
    const wikiPath = this.pathMapper.obsidianToWiki(file.path);

    // Build page data
    const pageData = {
      path: this.addPathPrefix(wikiPath),
      title: parsed.frontmatter.title || file.basename,
      content: content,
      description: wikiMetadata.description || this.extractDescription(content),
      tags: wikiMetadata.tags || [],
      isPublished: this.settings.publishByDefault !== false,
      isPrivate: parsed.frontmatter.private || false,
      locale: this.settings.locale || 'en',
      editor: this.settings.defaultEditor || 'markdown',
    };

    return pageData;
  }

  /**
   * Build link mapping for wikilink conversion
   */
  private async buildLinkMapping(): Promise<Map<string, string>> {
    const mapping = new Map<string, string>();
    const files = this.vault.getMarkdownFiles();

    for (const file of files) {
      if (!this.shouldSkipFile(file)) {
        const wikiPath = this.pathMapper.obsidianToWiki(file.path);
        const finalPath = this.addPathPrefix(wikiPath);

        // Map both filename and full path
        mapping.set(file.basename, finalPath);
        mapping.set(file.path, finalPath);

        // Map without extension
        const nameWithoutExt = file.basename.replace(/\.md$/, '');
        mapping.set(nameWithoutExt, finalPath);
      }
    }

    return mapping;
  }

  /**
   * Build image mapping for embedded image conversion
   */
  private async buildImageMapping(): Promise<Map<string, string>> {
    const mapping = new Map<string, string>();
    const files = this.vault.getFiles();

    for (const file of files) {
      if (this.isImageFile(file)) {
        // For WikiJS, we'll use the asset upload endpoint or reference by path
        // This is a simplified approach - in practice you'd upload to WikiJS assets
        const assetUrl = `/assets/${file.path}`;
        mapping.set(file.path, assetUrl);
        mapping.set(file.name, assetUrl);
      }
    }

    return mapping;
  }

  /**
   * Add path prefix if configured
   */
  private addPathPrefix(wikiPath: string): string {
    if (this.settings.pathPrefix) {
      const prefix = this.settings.pathPrefix.startsWith('/')
        ? this.settings.pathPrefix
        : '/' + this.settings.pathPrefix;

      return prefix + (wikiPath.startsWith('/') ? wikiPath : '/' + wikiPath);
    }

    return wikiPath;
  }

  /**
   * Extract description from content
   */
  private extractDescription(content: string): string {
    // Get first paragraph
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
        return trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
      }
    }
    return '';
  }

  /**
   * Create pages in batch
   */
  async createPagesInBatch(pages: any[]): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: true,
      processedFiles: 0,
      skippedFiles: 0,
      errors: [],
      warnings: [],
      outputPath: this.settings.wikiUrl,
      assets: [],
    };

    const batchSize = 5; // Process 5 pages at a time

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);

      const batchPromises = batch.map(async (pageData) => {
        try {
          const response = await this.client.createPage(pageData);
          if (response.succeeded) {
            result.processedFiles++;
          } else {
            result.errors.push({
              file: pageData.path,
              error: response.message || 'Unknown error',
            });
          }
        } catch (error) {
          result.errors.push({
            file: pageData.path,
            error: error.message,
          });
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < pages.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Sync directory structure with WikiJS
   */
  async syncDirectoryStructure(): Promise<void> {
    const pageTree = await this.pathMapper.buildPageTree();

    // WikiJS doesn't require explicit directory creation
    // Pages are automatically organized by their path
    console.log('Directory structure mapped:', pageTree);
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

    // Check tags if specified
    if (filter.includeTags.length > 0 || filter.excludeTags.length > 0) {
      // Would need to parse frontmatter to check tags
      // For now, skip this check
    }

    return false;
  }

  /**
   * Check if file is an image
   */
  private isImageFile(file: TFile): boolean {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(file.extension.toLowerCase());
  }

  /**
   * Test connection to WikiJS
   */
  async testConnection(): Promise<boolean> {
    return await this.client.testConnection();
  }

  /**
   * Get WikiJS instance info
   */
  async getInstanceInfo(): Promise<any> {
    try {
      // This would call a WikiJS API endpoint to get instance information
      // For now, return basic info
      return {
        url: this.settings.wikiUrl,
        connected: await this.testConnection(),
        locale: this.settings.locale || 'en',
      };
    } catch (error) {
      return {
        url: this.settings.wikiUrl,
        connected: false,
        error: error.message,
      };
    }
  }
}
