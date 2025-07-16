import { TFile, TFolder, Vault } from 'obsidian';
import { PathMapping } from './types';

export class PathMapper {
  private vault: Vault;
  private mappings: PathMapping[];
  private cache: Map<string, string>;

  constructor(vault: Vault, mappings: PathMapping[] = []) {
    this.vault = vault;
    this.mappings = mappings;
    this.cache = new Map();
  }

  /**
   * Convert Obsidian path to WikiJS path
   */
  obsidianToWiki(obsidianPath: string): string {
    // Check cache first
    if (this.cache.has(obsidianPath)) {
      return this.cache.get(obsidianPath)!;
    }

    // Check custom mappings
    for (const mapping of this.mappings) {
      if (mapping.enabled && obsidianPath.startsWith(mapping.obsidianPath)) {
        const relativePath = obsidianPath.slice(mapping.obsidianPath.length);
        const wikiPath = this.joinPaths(mapping.wikiPath, relativePath);
        const normalized = this.normalizeWikiPath(wikiPath);
        this.cache.set(obsidianPath, normalized);
        return normalized;
      }
    }

    // Default conversion
    const normalized = this.normalizeWikiPath(obsidianPath);
    this.cache.set(obsidianPath, normalized);
    return normalized;
  }

  /**
   * Convert WikiJS path to Obsidian path
   */
  wikiToObsidian(wikiPath: string): string {
    // Check reverse mappings
    for (const mapping of this.mappings) {
      if (mapping.enabled && wikiPath.startsWith(mapping.wikiPath)) {
        const relativePath = wikiPath.slice(mapping.wikiPath.length);
        return this.joinPaths(mapping.obsidianPath, relativePath);
      }
    }

    // Default conversion
    return this.normalizeObsidianPath(wikiPath);
  }

  /**
   * Normalize WikiJS path
   */
  private normalizeWikiPath(path: string): string {
    // Remove file extension
    let normalized = path.replace(/\.md$/i, '');

    // Replace spaces with hyphens
    normalized = normalized.replace(/\s+/g, '-');

    // Convert to lowercase
    normalized = normalized.toLowerCase();

    // Remove special characters except hyphens and slashes
    normalized = normalized.replace(/[^a-z0-9\-\/]/g, '');

    // Remove multiple consecutive hyphens
    normalized = normalized.replace(/-+/g, '-');

    // Remove leading/trailing slashes and hyphens
    normalized = normalized.replace(/^[\/\-]+|[\/\-]+$/g, '');

    // Ensure path starts with /
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    return normalized;
  }

  /**
   * Normalize Obsidian path
   */
  private normalizeObsidianPath(path: string): string {
    // Remove leading slash
    let normalized = path.replace(/^\//, '');

    // Add .md extension if not present
    if (!normalized.endsWith('.md')) {
      normalized += '.md';
    }

    return normalized;
  }

  /**
   * Join paths safely
   */
  private joinPaths(base: string, relative: string): string {
    // Remove trailing slash from base
    base = base.replace(/\/$/, '');

    // Remove leading slash from relative
    relative = relative.replace(/^\//, '');

    return base + '/' + relative;
  }

  /**
   * Build page tree from vault structure
   */
  async buildPageTree(): Promise<PageTreeNode[]> {
    const root = this.vault.getRoot();
    return this.buildTreeRecursive(root);
  }

  /**
   * Build tree recursively
   */
  private buildTreeRecursive(folder: TFolder, basePath: string = ''): PageTreeNode[] {
    const nodes: PageTreeNode[] = [];

    for (const child of folder.children) {
      if (child instanceof TFolder) {
        // Skip excluded folders
        if (this.isExcludedFolder(child.path)) {
          continue;
        }

        const node: PageTreeNode = {
          name: child.name,
          path: this.obsidianToWiki(child.path),
          isFolder: true,
          children: this.buildTreeRecursive(child, child.path),
        };

        nodes.push(node);
      } else if (child instanceof TFile && child.extension === 'md') {
        const node: PageTreeNode = {
          name: child.basename,
          path: this.obsidianToWiki(child.path),
          isFolder: false,
        };

        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Check if folder should be excluded
   */
  private isExcludedFolder(path: string): boolean {
    const excludedFolders = ['.obsidian', '.trash', 'templates'];
    return excludedFolders.some((excluded) => path.includes(excluded));
  }

  /**
   * Get all mapped paths
   */
  getAllMappedPaths(): Array<{ obsidian: string; wiki: string }> {
    const allFiles = this.vault.getMarkdownFiles();
    const mappedPaths: Array<{ obsidian: string; wiki: string }> = [];

    for (const file of allFiles) {
      if (!this.isExcludedFolder(file.path)) {
        mappedPaths.push({
          obsidian: file.path,
          wiki: this.obsidianToWiki(file.path),
        });
      }
    }

    return mappedPaths;
  }

  /**
   * Update path mappings
   */
  updateMappings(mappings: PathMapping[]): void {
    this.mappings = mappings;
    this.cache.clear(); // Clear cache when mappings change
  }

  /**
   * Add a new mapping
   */
  addMapping(mapping: PathMapping): void {
    this.mappings.push(mapping);
    this.cache.clear();
  }

  /**
   * Remove a mapping
   */
  removeMapping(obsidianPath: string): void {
    this.mappings = this.mappings.filter((m) => m.obsidianPath !== obsidianPath);
    this.cache.clear();
  }

  /**
   * Validate path mapping
   */
  validateMapping(mapping: PathMapping): boolean {
    // Check if paths are valid
    if (!mapping.obsidianPath || !mapping.wikiPath) {
      return false;
    }

    // Check if Obsidian path exists
    const folder = this.vault.getAbstractFileByPath(mapping.obsidianPath);
    if (!folder || !(folder instanceof TFolder)) {
      return false;
    }

    // Check for circular mappings
    for (const existing of this.mappings) {
      if (
        existing.obsidianPath === mapping.obsidianPath &&
        existing.wikiPath === mapping.wikiPath
      ) {
        return false; // Duplicate
      }
    }

    return true;
  }

  /**
   * Handle special characters in paths
   */
  private handleSpecialCharacters(path: string): string {
    const replacements: Record<string, string> = {
      ä: 'ae',
      ö: 'oe',
      ü: 'ue',
      Ä: 'Ae',
      Ö: 'Oe',
      Ü: 'Ue',
      ß: 'ss',
      é: 'e',
      è: 'e',
      ê: 'e',
      à: 'a',
      ç: 'c',
      ñ: 'n',
    };

    let result = path;
    for (const [char, replacement] of Object.entries(replacements)) {
      result = result.replace(new RegExp(char, 'g'), replacement);
    }

    return result;
  }

  /**
   * Clear path cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

interface PageTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: PageTreeNode[];
}
