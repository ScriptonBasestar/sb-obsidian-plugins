import { App, Notice } from 'obsidian';
import SettingsSyncPlugin from './main';
import { SyncResult, ChangeItem, ObsidianSettings } from './types';
import { SettingsParser } from './settings-parser';
import { GitManager } from './git-manager';

export class SyncManager {
  private app: App;
  private plugin: SettingsSyncPlugin;
  private parser: SettingsParser;
  private git: GitManager;
  syncInProgress: boolean = false;

  constructor(app: App, plugin: SettingsSyncPlugin) {
    this.app = app;
    this.plugin = plugin;
    this.parser = new SettingsParser(app, plugin.settings.sensitiveKeys);
    this.git = plugin.gitManager;
  }

  /**
   * Main sync method
   */
  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        message: 'Sync already in progress'
      };
    }

    this.syncInProgress = true;

    try {
      // Initialize repository if needed
      if (!await this.isRepositoryInitialized()) {
        await this.initializeRepository();
      }

      // Export current settings
      await this.exportSettings();

      // Check for changes
      const status = await this.git.getStatus();
      const hasLocalChanges = status.some(([, , workdir]) => workdir !== 1);

      // Pull remote changes
      const pulledChanges = await this.git.pull();
      
      // Handle conflicts
      if (await this.git.hasConflicts()) {
        return await this.handleConflicts();
      }

      // Apply pulled changes
      if (pulledChanges.length > 0) {
        await this.applyChanges(pulledChanges);
      }

      // Push local changes
      if (hasLocalChanges) {
        await this.git.commit('Update settings from Obsidian');
        await this.git.push();
      }

      return {
        success: true,
        message: 'Settings synced successfully',
        changes: pulledChanges
      };

    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        message: `Sync failed: ${error.message}`
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Export current settings to git repository
   */
  async exportSettings(): Promise<void> {
    try {
      const settings = await this.parser.parseAllSettings();
      const settingsDir = `${this.app.vault.configDir}/.settings-sync/settings`;

      // Ensure directory exists
      await this.ensureDirectoryExists(settingsDir);

      // Write settings files
      const files = [
        { name: 'app.json', data: settings.app },
        { name: 'appearance.json', data: settings.appearance },
        { name: 'hotkeys.json', data: settings.hotkeys },
        { name: 'core-plugins.json', data: settings.core },
        { name: 'community-plugins.json', data: settings.community }
      ];

      for (const file of files) {
        if (file.data) {
          const path = `${settingsDir}/${file.name}`;
          await this.app.vault.adapter.write(path, JSON.stringify(file.data, null, 2));
        }
      }

      // Export plugin settings
      if (settings.plugins) {
        const pluginsDir = `${settingsDir}/plugins`;
        await this.ensureDirectoryExists(pluginsDir);

        for (const [pluginId, pluginSettings] of Object.entries(settings.plugins)) {
          const pluginDir = `${pluginsDir}/${pluginId}`;
          await this.ensureDirectoryExists(pluginDir);
          await this.app.vault.adapter.write(
            `${pluginDir}/data.json`,
            JSON.stringify(pluginSettings, null, 2)
          );
        }
      }

      // Export themes and snippets lists
      if (settings.themes?.length > 0) {
        await this.app.vault.adapter.write(
          `${settingsDir}/themes.json`,
          JSON.stringify(settings.themes, null, 2)
        );
      }

      if (settings.snippets?.length > 0) {
        await this.app.vault.adapter.write(
          `${settingsDir}/snippets.json`,
          JSON.stringify(settings.snippets, null, 2)
        );
      }

    } catch (error) {
      console.error('Failed to export settings:', error);
      throw error;
    }
  }

  /**
   * Import settings from git repository
   */
  async importSettings(): Promise<void> {
    try {
      const settingsDir = `${this.app.vault.configDir}/.settings-sync/settings`;
      const settings: ObsidianSettings = {};

      // Read core settings
      settings.app = await this.readJsonFile(`${settingsDir}/app.json`);
      settings.appearance = await this.readJsonFile(`${settingsDir}/appearance.json`);
      settings.hotkeys = await this.readJsonFile(`${settingsDir}/hotkeys.json`);
      settings.core = await this.readJsonFile(`${settingsDir}/core-plugins.json`);
      settings.community = await this.readJsonFile(`${settingsDir}/community-plugins.json`);
      settings.themes = await this.readJsonFile(`${settingsDir}/themes.json`) || [];
      settings.snippets = await this.readJsonFile(`${settingsDir}/snippets.json`) || [];

      // Read plugin settings
      settings.plugins = {};
      const pluginsDir = `${settingsDir}/plugins`;
      
      if (await this.app.vault.adapter.exists(pluginsDir)) {
        const pluginFolders = (await this.app.vault.adapter.list(pluginsDir)).folders;
        
        for (const folder of pluginFolders) {
          const pluginId = folder.split('/').pop();
          if (pluginId) {
            const dataPath = `${folder}/data.json`;
            if (await this.app.vault.adapter.exists(dataPath)) {
              settings.plugins[pluginId] = await this.readJsonFile(dataPath);
            }
          }
        }
      }

      // Apply settings to vault
      await this.parser.serializeSettings(settings, this.plugin.settings.excludedFiles);

    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  /**
   * Apply changes from remote
   */
  private async applyChanges(changes: ChangeItem[]): Promise<void> {
    // Re-import all settings to apply changes
    await this.importSettings();
    
    // Notify user of changes
    if (changes.length > 0) {
      new Notice(`Applied ${changes.length} setting changes from remote`);
    }
  }

  /**
   * Handle merge conflicts
   */
  private async handleConflicts(): Promise<SyncResult> {
    const conflicts = await this.getConflictedFiles();
    
    // For now, we'll auto-resolve by keeping local changes
    // In the future, this could show a UI for manual resolution
    for (const filepath of conflicts) {
      await this.git.resolveConflict(filepath, 'ours');
    }

    await this.git.commit('Resolved conflicts - kept local changes');

    return {
      success: true,
      message: 'Conflicts resolved automatically (kept local changes)',
      conflicts
    };
  }

  /**
   * Get list of conflicted files
   */
  private async getConflictedFiles(): Promise<string[]> {
    const status = await this.git.getStatus();
    return status
      .filter(([, , workdir]) => workdir === 7) // 7 = conflict
      .map(([filepath]) => filepath);
  }

  /**
   * Check if repository is initialized
   */
  private async isRepositoryInitialized(): Promise<boolean> {
    const gitDir = `${this.app.vault.configDir}/.settings-sync/.git`;
    return await this.app.vault.adapter.exists(gitDir);
  }

  /**
   * Initialize repository
   */
  private async initializeRepository(): Promise<void> {
    await this.git.initRepository();
    
    if (this.plugin.settings.gitRepo) {
      await this.git.addRemote(this.plugin.settings.gitRepo);
      
      // Try to pull existing settings
      try {
        await this.git.pull();
        await this.importSettings();
        new Notice('Repository initialized and settings imported');
      } catch (error) {
        // Repository might be empty, that's okay
        new Notice('Repository initialized');
      }
    }
  }

  /**
   * Read JSON file
   */
  private async readJsonFile(path: string): Promise<any> {
    try {
      if (await this.app.vault.adapter.exists(path)) {
        const content = await this.app.vault.adapter.read(path);
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`Failed to read ${path}:`, error);
    }
    return null;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(path: string): Promise<void> {
    if (!await this.app.vault.adapter.exists(path)) {
      await this.app.vault.adapter.mkdir(path);
    }
  }

  /**
   * Watch for setting changes
   */
  startWatching(): void {
    // This would implement file watching to detect changes
    // For now, we rely on manual sync or auto-sync intervals
  }

  /**
   * Stop watching for changes
   */
  stopWatching(): void {
    // Stop file watching
  }
}