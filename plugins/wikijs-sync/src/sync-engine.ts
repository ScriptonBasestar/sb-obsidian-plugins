import { App, TFile, Notice, Vault, FileSystemAdapter } from 'obsidian';
import { WikiJSClient } from './wikijs-client';
import { MetadataConverter } from './metadata-converter';
import { PathMapper } from './path-mapper';
import { PerformanceUtils } from './performance-utils';
import { WikiJSSyncSettings, SyncResult, ConflictItem, WikiPage, WikiPageInput } from './types';

export class SyncEngine {
  private app: App;
  private vault: Vault;
  private client: WikiJSClient;
  private metadataConverter: MetadataConverter;
  private pathMapper: PathMapper;
  private settings: WikiJSSyncSettings;
  private syncInProgress: boolean = false;
  private lastSyncTimes: Map<string, number> = new Map();
  private checksumCache = PerformanceUtils.createCache<string, string>(30 * 60 * 1000); // 30 min TTL
  private syncQueue = PerformanceUtils.createQueue<void>();

  constructor(app: App, client: WikiJSClient, settings: WikiJSSyncSettings) {
    this.app = app;
    this.vault = app.vault;
    this.client = client;
    this.settings = settings;
    this.metadataConverter = new MetadataConverter(settings.metadataMapping);
    this.pathMapper = new PathMapper(vault, settings.pathMapping);
  }

  /**
   * Main sync method
   */
  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        message: 'Sync already in progress',
        synced: 0,
        failed: 0,
        conflicts: [],
        errors: [],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      message: '',
      synced: 0,
      failed: 0,
      conflicts: [],
      errors: [],
    };

    try {
      new Notice('Starting WikiJS sync...');

      // Test connection first
      const connected = await this.client.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to WikiJS');
      }

      // Sync based on direction
      switch (this.settings.syncDirection) {
        case 'obsidian-to-wiki':
          await this.syncObsidianToWiki(result);
          break;
        case 'wiki-to-obsidian':
          await this.syncWikiToObsidian(result);
          break;
        case 'bidirectional':
          await this.syncBidirectional(result);
          break;
      }

      // Update last sync time
      this.settings.lastSync = new Date().toISOString();

      result.message = `Sync completed: ${result.synced} synced, ${result.failed} failed, ${result.conflicts.length} conflicts`;
      new Notice(result.message);
    } catch (error) {
      console.error('Sync error:', error);
      result.success = false;
      result.message = `Sync failed: ${error.message}`;
      result.errors.push(error.message);
      new Notice(result.message);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync from Obsidian to WikiJS
   */
  private async syncObsidianToWiki(result: SyncResult): Promise<void> {
    const files = this.vault.getMarkdownFiles().filter((file) => !this.shouldSkipFile(file));

    // Process files in batches for better performance
    await PerformanceUtils.batchProcess(
      files,
      async (file) => {
        try {
          await this.syncFileToWiki(file, result);
        } catch (error) {
          console.error(`Failed to sync ${file.path}:`, error);
          result.failed++;
          result.errors.push(`${file.path}: ${error.message}`);
        }
      },
      {
        batchSize: 5,
        concurrency: 2,
        onProgress: (processed, total) => {
          new Notice(`Syncing... ${processed}/${total}`, 2000);
        },
      }
    );
  }

  /**
   * Sync from WikiJS to Obsidian
   */
  private async syncWikiToObsidian(result: SyncResult): Promise<void> {
    const wikiPages = await this.client.listPages(1000, 0);

    for (const wikiPage of wikiPages) {
      try {
        await this.syncPageToObsidian(wikiPage, result);
      } catch (error) {
        console.error(`Failed to sync ${wikiPage.path}:`, error);
        result.failed++;
        result.errors.push(`${wikiPage.path}: ${error.message}`);
      }
    }
  }

  /**
   * Bidirectional sync
   */
  private async syncBidirectional(result: SyncResult): Promise<void> {
    const files = this.vault.getMarkdownFiles();
    const wikiPages = await this.client.listPages(1000, 0);
    const wikiPageMap = new Map(wikiPages.map((p) => [p.path, p]));

    // Sync existing files
    for (const file of files) {
      if (this.shouldSkipFile(file)) {
        continue;
      }

      const wikiPath = this.pathMapper.obsidianToWiki(file.path);
      const wikiPage = wikiPageMap.get(wikiPath);

      try {
        if (wikiPage) {
          // Both exist - check for conflicts
          await this.syncBidirectionalFile(file, wikiPage, result);
          wikiPageMap.delete(wikiPath); // Mark as processed
        } else {
          // Only in Obsidian - create in Wiki
          await this.syncFileToWiki(file, result);
        }
      } catch (error) {
        console.error(`Failed to sync ${file.path}:`, error);
        result.failed++;
        result.errors.push(`${file.path}: ${error.message}`);
      }
    }

    // Sync remaining Wiki pages (only in Wiki)
    for (const wikiPage of wikiPageMap.values()) {
      try {
        await this.syncPageToObsidian(wikiPage, result);
      } catch (error) {
        console.error(`Failed to sync ${wikiPage.path}:`, error);
        result.failed++;
        result.errors.push(`${wikiPage.path}: ${error.message}`);
      }
    }
  }

  /**
   * Sync a single file to WikiJS
   */
  private async syncFileToWiki(file: TFile, result: SyncResult): Promise<void> {
    const content = await this.vault.read(file);
    const wikiPath = this.pathMapper.obsidianToWiki(file.path);

    // Calculate checksum to skip unchanged files
    const contentChecksum = await PerformanceUtils.calculateChecksum(content);
    const cachedChecksum = this.checksumCache.get(file.path);

    if (cachedChecksum === contentChecksum) {
      return; // Skip unchanged file
    }

    // Parse frontmatter and content
    const { frontmatter, body } = this.metadataConverter.extractFrontmatter(content);
    const metadata = this.metadataConverter.obsidianToWiki(frontmatter);

    // Prepare page input
    const pageInput: WikiPageInput = {
      path: wikiPath,
      title: frontmatter.title || file.basename,
      content: body,
      description: metadata.description,
      tags: metadata.tags,
      editor: 'markdown',
    };

    // Check if page exists
    const existingPage = await this.client.getPage(wikiPath);

    let response;
    if (existingPage) {
      // Update existing page
      response = await this.client.updatePage(existingPage.id, pageInput);
    } else {
      // Create new page
      response = await this.client.createPage(pageInput);
    }

    if (response.succeeded) {
      result.synced++;
      this.updateLastSyncTime(file.path);
      this.checksumCache.set(file.path, contentChecksum);
    } else {
      throw new Error(response.message || 'Unknown error');
    }
  }

  /**
   * Sync a single page to Obsidian
   */
  private async syncPageToObsidian(wikiPage: WikiPage, result: SyncResult): Promise<void> {
    const obsidianPath = this.pathMapper.wikiToObsidian(wikiPage.path);
    const file = this.vault.getAbstractFileByPath(obsidianPath);

    // Convert metadata
    const frontmatter = this.metadataConverter.wikiToObsidian(wikiPage);
    const content = this.metadataConverter.mergeFrontmatter(wikiPage.content, frontmatter);

    if (file instanceof TFile) {
      // Update existing file
      await this.vault.modify(file, content);
    } else {
      // Create new file
      await this.ensureDirectoryExists(obsidianPath);
      await this.vault.create(obsidianPath, content);
    }

    result.synced++;
    this.updateLastSyncTime(obsidianPath);
  }

  /**
   * Handle bidirectional sync for a file
   */
  private async syncBidirectionalFile(
    file: TFile,
    wikiPage: WikiPage,
    result: SyncResult
  ): Promise<void> {
    const fileModTime = file.stat.mtime;
    const wikiModTime = new Date(wikiPage.updatedAt).getTime();
    const lastSync = this.getLastSyncTime(file.path);

    // Determine which version is newer
    const fileChanged = fileModTime > lastSync;
    const wikiChanged = wikiModTime > lastSync;

    if (fileChanged && wikiChanged) {
      // Conflict detected
      const conflict: ConflictItem = {
        path: file.path,
        type: 'content',
        localModified: new Date(fileModTime).toISOString(),
        remoteModified: wikiPage.updatedAt,
      };

      // Auto-resolve based on settings or add to conflicts
      if (this.settings.conflictResolution === 'local') {
        conflict.resolution = 'local';
        await this.syncFileToWiki(file, result);
      } else if (this.settings.conflictResolution === 'remote') {
        conflict.resolution = 'remote';
        await this.syncPageToObsidian(wikiPage, result);
      } else {
        result.conflicts.push(conflict);
      }
    } else if (fileChanged) {
      // Local is newer
      await this.syncFileToWiki(file, result);
    } else if (wikiChanged) {
      // Remote is newer
      await this.syncPageToObsidian(wikiPage, result);
    }
    // If neither changed, skip
  }

  /**
   * Check if file should be skipped
   */
  private shouldSkipFile(file: TFile): boolean {
    // Check excluded folders
    for (const excluded of this.settings.excludedFolders) {
      if (file.path.includes(excluded)) {
        return true;
      }
    }

    // Check excluded files
    for (const excluded of this.settings.excludedFiles) {
      if (file.path === excluded || file.name === excluded) {
        return true;
      }
    }

    return false;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const parts = filePath.split('/');
    parts.pop(); // Remove filename

    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!this.vault.getAbstractFileByPath(currentPath)) {
        await this.vault.createFolder(currentPath);
      }
    }
  }

  /**
   * Get last sync time for a file
   */
  private getLastSyncTime(path: string): number {
    return this.lastSyncTimes.get(path) || 0;
  }

  /**
   * Update last sync time for a file
   */
  private updateLastSyncTime(path: string): void {
    this.lastSyncTimes.set(path, Date.now());
  }

  /**
   * Update settings
   */
  updateSettings(settings: WikiJSSyncSettings): void {
    this.settings = settings;
    this.metadataConverter.updateMapping(settings.metadataMapping);
    this.pathMapper.updateMappings(settings.pathMapping);
  }

  /**
   * Watch for file changes
   */
  startWatching(): void {
    if (!this.settings.autoSync) {
      return;
    }

    // Set up file watcher
    this.app.vault.on('modify', async (file) => {
      if (file instanceof TFile && !this.shouldSkipFile(file)) {
        // Debounce to avoid too many syncs
        setTimeout(() => {
          if (!this.syncInProgress) {
            this.syncSingleFile(file);
          }
        }, 5000); // Wait 5 seconds after modification
      }
    });
  }

  /**
   * Sync a single file
   */
  private async syncSingleFile(file: TFile): Promise<void> {
    // Add to queue for sequential processing
    this.syncQueue.add(async () => {
      const result: SyncResult = {
        success: true,
        message: '',
        synced: 0,
        failed: 0,
        conflicts: [],
        errors: [],
      };

      try {
        await this.syncFileToWiki(file, result);
        if (result.synced > 0) {
          new Notice(`Synced ${file.basename} to WikiJS`);
        }
      } catch (error) {
        console.error(`Failed to sync ${file.path}:`, error);
        new Notice(`Failed to sync ${file.basename}: ${error.message}`);
      }
    });
  }
}
