import { App, Plugin, Notice, TFile, TFolder } from 'obsidian';
import { WikiJSSyncSettings, DEFAULT_SETTINGS } from './types';
import { WikiJSSyncSettingTab } from './settings';
import { WikiJSClient } from './wikijs-client';
import { SyncEngine } from './sync-engine';

export default class WikiJSSyncPlugin extends Plugin {
  settings: WikiJSSyncSettings;
  client: WikiJSClient;
  syncEngine: SyncEngine;
  autoSyncInterval: number | null = null;
  statusBarItem: HTMLElement;

  async onload() {
    await this.loadSettings();

    // Initialize API client
    this.client = new WikiJSClient(this.settings.wikiUrl, this.settings.apiKey);

    // Initialize sync engine
    this.syncEngine = new SyncEngine(this.app, this.client, this.settings);

    // Add ribbon icon
    this.addRibbonIcon('sync', 'Sync with WikiJS', async () => {
      await this.manualSync();
    });

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    // Add settings tab
    this.addSettingTab(new WikiJSSyncSettingTab(this.app, this));

    // Register commands
    this.registerCommands();

    // Start auto-sync if enabled
    if (this.settings.autoSync) {
      this.startAutoSync();
    }

    // Start file watcher
    this.syncEngine.startWatching();

    console.log('WikiJS Sync plugin loaded');
  }

  onunload() {
    this.stopAutoSync();
    console.log('WikiJS Sync plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.syncEngine.updateSettings(this.settings);
  }

  registerCommands() {
    // Manual sync command
    this.addCommand({
      id: 'sync-wikijs',
      name: 'Sync with WikiJS',
      callback: async () => {
        await this.manualSync();
      },
    });

    // Force push to WikiJS
    this.addCommand({
      id: 'push-to-wikijs',
      name: 'Push all to WikiJS',
      callback: async () => {
        const oldDirection = this.settings.syncDirection;
        this.settings.syncDirection = 'obsidian-to-wiki';
        await this.manualSync();
        this.settings.syncDirection = oldDirection;
      },
    });

    // Force pull from WikiJS
    this.addCommand({
      id: 'pull-from-wikijs',
      name: 'Pull all from WikiJS',
      callback: async () => {
        const oldDirection = this.settings.syncDirection;
        this.settings.syncDirection = 'wiki-to-obsidian';
        await this.manualSync();
        this.settings.syncDirection = oldDirection;
      },
    });

    // Sync current file
    this.addCommand({
      id: 'sync-current-file',
      name: 'Sync current file with WikiJS',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          await this.syncCurrentFile(activeFile);
        } else {
          new Notice('No active file');
        }
      },
    });

    // Show sync status
    this.addCommand({
      id: 'show-sync-status',
      name: 'Show WikiJS sync status',
      callback: () => {
        this.showSyncStatus();
      },
    });
  }

  async manualSync() {
    new Notice('Starting WikiJS sync...');
    this.updateStatusBar('Syncing...');

    const result = await this.syncEngine.sync();

    if (result.success) {
      this.settings.lastSync = new Date().toISOString();
      await this.saveSettings();
    }

    this.updateStatusBar();

    // Show detailed results if there were issues
    if (result.conflicts.length > 0 || result.errors.length > 0) {
      this.showSyncResults(result);
    }
  }

  async syncCurrentFile(file: TFile) {
    new Notice(`Syncing ${file.basename}...`);

    // Create a temporary sync engine with single file
    const tempSettings = { ...this.settings };
    tempSettings.excludedFiles = this.settings.excludedFiles.filter((f) => f !== file.path);

    const tempEngine = new SyncEngine(this.app, this.client, tempSettings);
    const result = await tempEngine.sync();

    if (result.synced > 0) {
      new Notice(`Successfully synced ${file.basename}`);
    } else if (result.failed > 0) {
      new Notice(`Failed to sync ${file.basename}: ${result.errors[0]}`);
    }
  }

  startAutoSync() {
    this.stopAutoSync();

    const intervalMs = this.settings.syncInterval * 60 * 1000;
    this.autoSyncInterval = window.setInterval(async () => {
      await this.manualSync();
    }, intervalMs);

    new Notice(`Auto-sync enabled (every ${this.settings.syncInterval} minutes)`);
  }

  stopAutoSync() {
    if (this.autoSyncInterval) {
      window.clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  restartAutoSync() {
    if (this.settings.autoSync) {
      this.startAutoSync();
    }
  }

  async testConnection(): Promise<boolean> {
    return await this.client.testConnection();
  }

  updateApiClient() {
    this.client = new WikiJSClient(this.settings.wikiUrl, this.settings.apiKey);
    this.syncEngine = new SyncEngine(this.app, this.client, this.settings);
  }

  updateStatusBar(text?: string) {
    if (text) {
      this.statusBarItem.setText(`WikiJS: ${text}`);
      return;
    }

    if (this.settings.lastSync) {
      const lastSync = new Date(this.settings.lastSync);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));

      if (diffMinutes < 1) {
        this.statusBarItem.setText('WikiJS: Just synced');
      } else if (diffMinutes < 60) {
        this.statusBarItem.setText(`WikiJS: ${diffMinutes}m ago`);
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        this.statusBarItem.setText(`WikiJS: ${diffHours}h ago`);
      }
    } else {
      this.statusBarItem.setText('WikiJS: Never synced');
    }
  }

  showSyncStatus() {
    const { lastSync, syncDirection, autoSync } = this.settings;

    let statusText = 'WikiJS Sync Status\n\n';
    statusText += `Direction: ${this.formatSyncDirection(syncDirection)}\n`;
    statusText += `Auto-sync: ${
      autoSync ? `Enabled (every ${this.settings.syncInterval}m)` : 'Disabled'
    }\n`;

    if (lastSync) {
      statusText += `Last sync: ${new Date(lastSync).toLocaleString()}\n`;
    } else {
      statusText += 'Last sync: Never\n';
    }

    new Notice(statusText, 5000);
  }

  showSyncResults(result: any) {
    let message = `Sync Results:\n`;
    message += `✓ Synced: ${result.synced}\n`;

    if (result.failed > 0) {
      message += `✗ Failed: ${result.failed}\n`;
    }

    if (result.conflicts.length > 0) {
      message += `⚠ Conflicts: ${result.conflicts.length}\n`;
      message += 'See console for details.';
      console.log('Sync conflicts:', result.conflicts);
    }

    if (result.errors.length > 0) {
      console.error('Sync errors:', result.errors);
    }

    new Notice(message, 10000);
  }

  formatSyncDirection(direction: string): string {
    switch (direction) {
      case 'bidirectional':
        return 'Bidirectional ↔';
      case 'obsidian-to-wiki':
        return 'Obsidian → WikiJS';
      case 'wiki-to-obsidian':
        return 'WikiJS → Obsidian';
      default:
        return direction;
    }
  }

  // Context menu integration
  onFileMenu(menu: any, file: TFile | TFolder) {
    if (file instanceof TFile && file.extension === 'md') {
      menu.addItem((item: any) => {
        item
          .setTitle('Sync with WikiJS')
          .setIcon('sync')
          .onClick(async () => {
            await this.syncCurrentFile(file);
          });
      });
    }
  }
}
