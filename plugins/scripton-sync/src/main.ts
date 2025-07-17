import { App, Modal, Notice, Plugin } from 'obsidian';

import { BackupManager } from './backup-manager';
import { GitService } from './core/git-service';
import { ScriptonCloudClient } from './core/scripton-cloud-client';
import { AutoCommitService } from './features/auto-commit-service';
import { BranchStrategyManager } from './features/branch-strategy';
import { ProfileManager } from './profile-manager';
import { ScriptonSyncSettingTab } from './settings';
import { SettingsParser } from './settings-parser';
import { SyncManager } from './sync-manager';
import {
  ScriptonSyncSettings,
  DEFAULT_SETTINGS,
  SettingsProfile,
  SyncResult,
  ExtendedFileSystemAdapter,
  BranchConfig,
  ScriptonCloudConfig,
} from './types';

export default class ScriptonSyncPlugin extends Plugin {
  settings: ScriptonSyncSettings;
  settingsParser: SettingsParser;
  profileManager: ProfileManager;
  syncManager: SyncManager;
  backupManager: BackupManager;
  gitService: GitService;
  cloudClient: ScriptonCloudClient;
  autoCommitService: AutoCommitService;
  branchManager: BranchStrategyManager;
  autoSyncInterval: number | null = null;
  private statusBarItem: HTMLElement;

  public async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize core services
    const basePath = (this.app.vault.adapter as ExtendedFileSystemAdapter).basePath ?? '';
    this.gitService = new GitService(basePath);

    // Initialize cloud client
    if (this.settings.scriptonCloudUrl && this.settings.scriptonCloudApiKey) {
      this.cloudClient = new ScriptonCloudClient({
        apiUrl: this.settings.scriptonCloudUrl,
        apiKey: this.settings.scriptonCloudApiKey,
      });
    }

    // Initialize managers
    this.settingsParser = new SettingsParser(this.app, this.settings.sensitiveKeys);
    this.profileManager = new ProfileManager(this.app, this);
    this.syncManager = new SyncManager(this.app, this);
    this.backupManager = new BackupManager(this.app, this.settings.sensitiveKeys);
    this.branchManager = new BranchStrategyManager(this.gitService);
    this.autoCommitService = new AutoCommitService(
      this.gitService,
      this.settings,
      this.app.vault,
      this.branchManager
    );

    // Add ribbon icon
    this.addRibbonIcon('git-branch', 'Scripton Sync', async () => {
      await this.showSyncMenu();
    });

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar('Scripton Sync Ready');

    // Add settings tab
    this.addSettingTab(new ScriptonSyncSettingTab(this.app, this));

    // Register commands
    this.registerCommands();

    // Initialize git and branch strategy if configured
    if (await this.gitService.isInitialized()) {
      await this.initializeBranchStrategy();
    }

    // Start services if enabled
    if (this.settings.autoSync) {
      this.startAutoSync();
    }

    if (this.settings.enableAutoCommit) {
      this.autoCommitService.start();
    }

    // Auto pull on startup if enabled
    if (this.settings.enableAutoPull && this.settings.pullOnStartup) {
      this.scheduleStartupPull();
    }

    console.warn('Scripton Sync plugin loaded');
  }

  public onunload(): void {
    this.stopAutoSync();
    this.autoCommitService.stop();
    console.warn('Scripton Sync plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Update services with new settings
    this.autoCommitService.updateSettings(this.settings);

    if (this.settings.scriptonCloudUrl && this.settings.scriptonCloudApiKey) {
      if (!this.cloudClient) {
        this.cloudClient = new ScriptonCloudClient({
          apiUrl: this.settings.scriptonCloudUrl,
          apiKey: this.settings.scriptonCloudApiKey,
        });
      } else {
        this.cloudClient.updateConfig({
          apiUrl: this.settings.scriptonCloudUrl,
          apiKey: this.settings.scriptonCloudApiKey,
        });
      }
    }
  }

  registerCommands() {
    // Git sync commands
    this.addCommand({
      id: 'sync-all',
      name: 'Sync all (pull, commit, push)',
      callback: async () => {
        await this.syncAll();
      },
    });

    this.addCommand({
      id: 'commit',
      name: 'Commit changes',
      callback: async () => {
        await this.commitChanges();
      },
    });

    this.addCommand({
      id: 'push',
      name: 'Push to remote',
      callback: async () => {
        await this.pushChanges();
      },
    });

    this.addCommand({
      id: 'pull',
      name: 'Pull from remote',
      callback: async () => {
        await this.pullChanges();
      },
    });

    // Profile commands
    this.addCommand({
      id: 'create-profile',
      name: 'Create settings profile from current settings',
      callback: async () => {
        await this.createProfileFromCurrent();
      },
    });

    this.addCommand({
      id: 'switch-profile',
      name: 'Switch settings profile',
      callback: async () => {
        await this.showProfileSelector();
      },
    });

    // Cloud commands
    this.addCommand({
      id: 'download-cloud-settings',
      name: 'Download settings from Scripton Cloud',
      callback: async () => {
        await this.downloadCloudSettings();
      },
    });

    this.addCommand({
      id: 'upload-cloud-settings',
      name: 'Upload settings to Scripton Cloud',
      callback: async () => {
        await this.uploadCloudSettings();
      },
    });

    // Settings sync command
    this.addCommand({
      id: 'sync-settings',
      name: 'Sync settings (legacy)',
      callback: async () => {
        await this.syncSettings();
      },
    });

    // Initialize commands
    this.addCommand({
      id: 'init-git',
      name: 'Initialize Git repository',
      callback: async () => {
        await this.initGitRepository();
      },
    });

    this.addCommand({
      id: 'init-vault',
      name: 'Initialize vault with shared settings',
      callback: async () => {
        await this.initializeVault();
      },
    });
  }

  /**
   * Initialize branch strategy
   */
  async initializeBranchStrategy(): Promise<void> {
    const config: BranchConfig = {
      strategy: this.settings.branchStrategy,
      defaultBranch: this.settings.defaultBranch,
      developPrefix: this.settings.tempBranchPrefix,
      featurePrefix: 'feature/',
      autoCreateHostBranch: true,
      autoMergeToDefault: this.settings.autoMergeToDefault,
      squashMerge: this.settings.mergeStrategy === 'squash',
    };

    await this.branchManager.initializeStrategy(config);
  }

  /**
   * Initialize Git repository
   */
  async initGitRepository(): Promise<void> {
    try {
      const result = await this.gitService.init(this.settings.defaultBranch);

      if (result.success) {
        // Configure author if available
        if (this.settings.gitConfig?.author) {
          await this.gitService.configureAuthor(this.settings.gitConfig.author);
        }

        // Initialize branch strategy
        await this.initializeBranchStrategy();

        new Notice('Git repository initialized successfully');
      } else {
        new Notice(`Failed to initialize repository: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to initialize Git repository:', error);
      new Notice('Failed to initialize Git repository');
    }
  }

  /**
   * Show sync menu
   */
  async showSyncMenu(): Promise<void> {
    const status = await this.gitService.getStatus();

    // Create a simple modal to show sync options
    const modal = new Modal(this.app);
    modal.titleEl.setText('Scripton Sync');

    const contentEl = modal.contentEl;
    contentEl.createEl('p', { text: `Current branch: ${status.currentBranch}` });

    if (status.hasChanges) {
      contentEl.createEl('p', {
        text: `${status.unstaged.length + status.untracked.length} files changed`,
      });
    }

    const buttonsEl = contentEl.createDiv('sync-menu-buttons');

    buttonsEl.createEl('button', { text: 'Sync All' }).onclick = async () => {
      modal.close();
      await this.syncAll();
    };

    buttonsEl.createEl('button', { text: 'Commit' }).onclick = async () => {
      modal.close();
      await this.commitChanges();
    };

    buttonsEl.createEl('button', { text: 'Push' }).onclick = async () => {
      modal.close();
      await this.pushChanges();
    };

    buttonsEl.createEl('button', { text: 'Pull' }).onclick = async () => {
      modal.close();
      await this.pullChanges();
    };

    modal.open();
  }

  /**
   * Sync all (pull, commit, push)
   */
  async syncAll(): Promise<void> {
    this.updateStatusBar('Syncing...');

    try {
      // Pull first
      await this.pullChanges();

      // Commit changes
      await this.commitChanges();

      // Push changes
      await this.pushChanges();

      new Notice('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      new Notice('Sync failed. Check console for details.');
    } finally {
      this.updateStatusBar('Scripton Sync Ready');
    }
  }

  /**
   * Commit changes
   */
  async commitChanges(): Promise<void> {
    try {
      const result = await this.autoCommitService.manualCommit();

      if (result.success) {
        new Notice(`Committed ${result.filesChanged} files`);
      } else if (result.filesChanged === 0) {
        new Notice('No changes to commit');
      } else {
        new Notice(`Commit failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Commit failed:', error);
      new Notice('Commit failed');
    }
  }

  /**
   * Push changes
   */
  async pushChanges(): Promise<void> {
    try {
      const currentBranch = await this.gitService.getCurrentBranch();
      const result = await this.gitService.push('origin', currentBranch, true);

      if (result.success) {
        new Notice('Pushed successfully');
      } else {
        new Notice(`Push failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Push failed:', error);
      new Notice('Push failed');
    }
  }

  /**
   * Pull changes
   */
  async pullChanges(): Promise<void> {
    try {
      const result = await this.gitService.pull();

      if (result.success) {
        new Notice('Pulled successfully');
      } else if (result.conflicts) {
        new Notice('Pull failed: Merge conflicts detected');

        if (this.settings.openEditorOnConflict) {
          const _conflicts = await this.gitService.getConflictFiles();
          // Handle conflicts based on settings
        }
      } else {
        new Notice(`Pull failed: ${result.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Pull failed:', error);
      new Notice('Pull failed');
    }
  }

  /**
   * Schedule startup pull
   */
  private scheduleStartupPull(): void {
    const delay = this.settings.pullOnStartupDelay * 1000;

    setTimeout(async () => {
      try {
        await this.pullChanges();

        if (!this.settings.pullOnStartupSilent) {
          new Notice('Startup pull completed');
        }
      } catch (error) {
        console.error('Startup pull failed:', error);

        if (!this.settings.pullOnStartupSilent) {
          new Notice('Startup pull failed');
        }
      }
    }, delay);
  }

  /**
   * Start auto commit
   */
  startAutoCommit(): void {
    this.autoCommitService.start();
  }

  /**
   * Stop auto commit
   */
  stopAutoCommit(): void {
    this.autoCommitService.stop();
  }

  /**
   * Restart auto commit
   */
  restartAutoCommit(): void {
    this.autoCommitService.stop();
    this.autoCommitService.start();
  }

  /**
   * Test cloud connection
   */
  async testCloudConnection(): Promise<boolean> {
    if (this.cloudClient === undefined) {
      return false;
    }

    try {
      return await this.cloudClient.validateApiKey();
    } catch (error) {
      console.error('Cloud connection test failed:', error);
      return false;
    }
  }

  /**
   * Download settings from cloud
   */
  async downloadCloudSettings(): Promise<void> {
    if (this.cloudClient === undefined) {
      new Notice('Cloud client not configured');
      return;
    }

    try {
      const profiles = await this.cloudClient.getProfiles();

      if (profiles.length === 0) {
        new Notice('No profiles found in cloud');
        return;
      }

      // Show profile selector
      // For now, just use the first profile
      const profile = profiles[0];
      const result = await this.cloudClient.applyProfile(profile.id);

      if (result.success) {
        new Notice('Cloud settings downloaded successfully');
      } else {
        new Notice(`Failed to download settings: ${result.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to download cloud settings:', error);
      new Notice('Failed to download cloud settings');
    }
  }

  /**
   * Upload settings to cloud
   */
  async uploadCloudSettings(): Promise<void> {
    if (this.cloudClient === undefined) {
      new Notice('Cloud client not configured');
      return;
    }

    try {
      const profile = await this.profileManager.createFromCurrent();
      const result = await this.cloudClient.uploadProfile(profile);

      if (result.success) {
        new Notice('Settings uploaded to cloud successfully');
      } else {
        new Notice(`Failed to upload settings: ${result.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to upload settings:', error);
      new Notice('Failed to upload settings');
    }
  }

  /**
   * Clean old branches
   */
  async cleanOldBranches(): Promise<void> {
    try {
      const config: BranchConfig = {
        strategy: this.settings.branchStrategy,
        defaultBranch: this.settings.defaultBranch,
        developPrefix: this.settings.tempBranchPrefix,
        featurePrefix: 'feature/',
        autoCreateHostBranch: true,
        autoMergeToDefault: this.settings.autoMergeToDefault,
        squashMerge: this.settings.mergeStrategy === 'squash',
      };

      const result = await this.branchManager.cleanupOldBranches(config);

      if (result.success) {
        new Notice(`Cleaned ${result.data?.deletedCount ?? 0} old branches`);
      } else {
        new Notice(`Failed to clean branches: ${result.error ?? 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to clean old branches:', error);
      new Notice('Failed to clean old branches');
    }
  }

  /**
   * Reset settings to default
   */
  async resetSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
    await this.saveSettings();
    new Notice('Settings reset to default');
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    syncing: boolean;
    hasChanges: boolean;
    lastSync: string | null;
  } {
    // This would be implemented with actual sync status tracking
    return {
      syncing: false,
      hasChanges: false,
      lastSync: this.settings.lastSync || null,
    };
  }

  /**
   * Update status bar
   */
  private updateStatusBar(text: string): void {
    this.statusBarItem.setText(text);
  }

  // Legacy methods for compatibility
  async syncSettings(): Promise<void> {
    await this.syncAll();
  }

  async createProfileFromCurrent(): Promise<void> {
    await this.profileManager.createFromCurrent();
  }

  async applyProfile(profileId: string): Promise<void> {
    await this.profileManager.applyProfile(profileId);
  }

  async exportProfile(profileId: string): Promise<void> {
    await this.profileManager.exportProfile(profileId);
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.profileManager.deleteProfile(profileId);
  }

  async showProfileSelector(): Promise<void> {
    await this.profileManager.showSelector();
  }

  async initializeVault(): Promise<void> {
    // This would show an initialization wizard
    await Promise.resolve();
    new Notice('Vault initialization not implemented yet');
  }

  public startAutoSync(): void {
    if (this.autoSyncInterval !== null) {
      this.stopAutoSync();
    }

    const interval = this.settings.syncInterval * 60 * 1000;
    this.autoSyncInterval = window.setInterval(async () => {
      await this.syncAll();
    }, interval);
  }

  public stopAutoSync(): void {
    if (this.autoSyncInterval !== null) {
      window.clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }
}
