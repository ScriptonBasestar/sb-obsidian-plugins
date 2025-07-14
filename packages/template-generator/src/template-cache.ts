import { TFile, Vault, TAbstractFile } from 'obsidian';
import { ParsedTemplate, TemplateParser } from './template-parser';

interface CacheEntry {
  template: ParsedTemplate;
  lastModified: number;
  fileSize: number;
}

export class TemplateCache {
  private cache = new Map<string, CacheEntry>();
  private vault: Vault;
  private templateFolder: string;
  private lastScanTime = 0;
  private scanInterval = 5000; // 5 seconds

  constructor(vault: Vault, templateFolder: string) {
    this.vault = vault;
    this.templateFolder = templateFolder;
    this.setupFileWatcher();
  }

  private setupFileWatcher(): void {
    // Listen for file changes in the vault
    this.vault.on('create', (file: TAbstractFile) => {
      if (file instanceof TFile && this.isTemplateFile(file)) {
        this.invalidateCache();
      }
    });

    this.vault.on('delete', (file: TAbstractFile) => {
      if (file instanceof TFile && this.isTemplateFile(file)) {
        this.removeFromCache(file.path);
        this.invalidateCache();
      }
    });

    this.vault.on('modify', (file: TAbstractFile) => {
      if (file instanceof TFile && this.isTemplateFile(file)) {
        this.removeFromCache(file.path);
        this.invalidateCache();
      }
    });

    this.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
      if ((file instanceof TFile && this.isTemplateFile(file)) || oldPath.startsWith(this.templateFolder)) {
        this.removeFromCache(oldPath);
        if (file instanceof TFile) {
          this.removeFromCache(file.path);
        }
        this.invalidateCache();
      }
    });
  }

  private isTemplateFile(file: TFile): boolean {
    return file.path.startsWith(this.templateFolder) && file.extension === 'md';
  }

  async getTemplates(): Promise<Array<ParsedTemplate>> {
    const now = Date.now();

    // Check if we need to scan for new files
    if (now - this.lastScanTime > this.scanInterval) {
      await this.scanForNewFiles();
      this.lastScanTime = now;
    }

    const cachedTemplates: ParsedTemplate[] = [];

    // Get all template files
    const templateFiles = this.vault.getFiles().filter((file) => this.isTemplateFile(file));

    for (const file of templateFiles) {
      const template = await this.getTemplate(file);
      if (template) {
        cachedTemplates.push(template);
      }
    }

    return cachedTemplates;
  }

  async getTemplate(file: TFile): Promise<ParsedTemplate | null> {
    const cacheKey = file.path;
    const cached = this.cache.get(cacheKey);

    // Check if cache is valid
    if (cached && this.isCacheValid(cached, file)) {
      return cached.template;
    }

    // Cache miss or invalid, load and parse template
    try {
      const content = await this.vault.read(file);
      const parsedTemplate = TemplateParser.parseTemplate(file.basename, content, file.path);

      // Update cache
      this.cache.set(cacheKey, {
        template: parsedTemplate,
        lastModified: file.stat.mtime,
        fileSize: file.stat.size,
      });

      return parsedTemplate;
    } catch (error) {
      console.warn(`Failed to read and cache template file: ${file.path}`, error);
      return null;
    }
  }

  private isCacheValid(cached: CacheEntry, file: TFile): boolean {
    return cached.lastModified === file.stat.mtime && cached.fileSize === file.stat.size;
  }

  private async scanForNewFiles(): Promise<void> {
    const templateFiles = this.vault.getFiles().filter((file) => this.isTemplateFile(file));

    // Remove cache entries for files that no longer exist
    const existingPaths = new Set(templateFiles.map((f) => f.path));
    const cachedPaths = Array.from(this.cache.keys());

    for (const cachedPath of cachedPaths) {
      if (!existingPaths.has(cachedPath)) {
        this.cache.delete(cachedPath);
      }
    }
  }

  removeFromCache(filePath: string): void {
    this.cache.delete(filePath);
  }

  invalidateCache(): void {
    // Mark for rescan on next access
    this.lastScanTime = 0;
  }

  clearCache(): void {
    this.cache.clear();
    this.lastScanTime = 0;
  }

  updateTemplateFolder(newFolder: string): void {
    if (this.templateFolder !== newFolder) {
      this.templateFolder = newFolder;
      this.clearCache();
    }
  }

  getCacheStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ path: string; lastModified: number; isValid: boolean }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([path, entry]) => {
      const file = this.vault.getAbstractFileByPath(path) as TFile;
      return {
        path,
        lastModified: entry.lastModified,
        isValid: file ? this.isCacheValid(entry, file) : false,
      };
    });

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      entries,
    };
  }

  // Preload templates for better performance
  async preloadTemplates(): Promise<void> {
    const templateFiles = this.vault.getFiles().filter((file) => this.isTemplateFile(file));

    const loadPromises = templateFiles.map((file) => this.getTemplate(file));
    await Promise.allSettled(loadPromises);

    console.log(`Preloaded ${templateFiles.length} templates into cache`);
  }

  // Get template by name (useful for quick lookups)
  async getTemplateByName(name: string): Promise<ParsedTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find((t) => t.name === name) || null;
  }

  // Get templates by category (from metadata)
  async getTemplatesByCategory(category: string): Promise<ParsedTemplate[]> {
    const templates = await this.getTemplates();
    return templates.filter((t) => t.metadata.category === category);
  }

  // Get templates by tag
  async getTemplatesByTag(tag: string): Promise<ParsedTemplate[]> {
    const templates = await this.getTemplates();
    return templates.filter((t) => t.metadata.tags && t.metadata.tags.includes(tag));
  }

  // Search templates by content or metadata
  async searchTemplates(query: string): Promise<ParsedTemplate[]> {
    const templates = await this.getTemplates();
    const lowerQuery = query.toLowerCase();

    return templates.filter((template) => {
      // Search in name
      if (template.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search in metadata
      if (template.metadata.title?.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      if (template.metadata.description?.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      if (template.metadata.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // Search in content (limit to avoid performance issues)
      if (template.body.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      return false;
    });
  }
}
