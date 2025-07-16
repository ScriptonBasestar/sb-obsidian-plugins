import { App, Modal, Notice, Plugin } from 'obsidian';
import { SettingsSyncSettings, DEFAULT_SETTINGS, SettingsProfile, SyncResult } from './types';
import { SettingsSyncSettingTab } from './settings';
import { SettingsParser } from './settings-parser';
import { ProfileManager } from './profile-manager';
import { GitManager } from './git-manager';
import { SyncManager } from './sync-manager';
import { InitWizard } from './init-wizard';

export default class SettingsSyncPlugin extends Plugin {
  settings: SettingsSyncSettings;
  settingsParser: SettingsParser;
  profileManager: ProfileManager;
  gitManager: GitManager;
  syncManager: SyncManager;
  autoSyncInterval: number | null = null;

  async onload() {
    await this.loadSettings();

    // Initialize components
    this.settingsParser = new SettingsParser(this.app, this.settings.sensitiveKeys);
    this.profileManager = new ProfileManager(this.app, this);
    this.gitManager = new GitManager(this.app, this);
    this.syncManager = new SyncManager(this.app, this);

    // Add ribbon icon
    this.addRibbonIcon('git-branch', 'Settings Sync', async () => {
      await this.syncSettings();
    });

    // Add settings tab
    this.addSettingTab(new SettingsSyncSettingTab(this.app, this));

    // Register commands
    this.registerCommands();

    // Start auto-sync if enabled
    if (this.settings.autoSync) {
      this.startAutoSync();
    }

    console.log('Settings Sync plugin loaded');
  }

  onunload() {
    this.stopAutoSync();
    console.log('Settings Sync plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  registerCommands() {
    // Sync command
    this.addCommand({
      id: 'sync-settings',
      name: 'Sync settings',
      callback: async () => {
        await this.syncSettings();
      }
    });

    // Initialize vault command
    this.addCommand({
      id: 'init-vault',
      name: 'Initialize vault with shared settings',
      callback: async () => {
        await this.initializeVault();
      }
    });

    // Create profile command
    this.addCommand({
      id: 'create-profile',
      name: 'Create settings profile from current settings',
      callback: async () => {
        await this.createProfileFromCurrent();
      }
    });

    // Switch profile command
    this.addCommand({
      id: 'switch-profile',
      name: 'Switch settings profile',
      callback: async () => {
        await this.showProfileSelector();
      }
    });

    // Export settings command
    this.addCommand({
      id: 'export-settings',
      name: 'Export current settings',
      callback: async () => {
        await this.exportSettings();
      }
    });

    // Import settings command
    this.addCommand({
      id: 'import-settings',
      name: 'Import settings',
      callback: async () => {
        await this.importSettings();
      }
    });
  }

  async syncSettings() {
    if (!this.settings.gitRepo) {
      new Notice('Please configure a Git repository in settings');
      return;
    }

    new Notice('Syncing settings...');
    
    try {
      const result = await this.syncManager.sync();
      
      if (result.success) {
        this.settings.lastSync = new Date().toISOString();
        await this.saveSettings();
        new Notice('Settings synced successfully');
      } else {
        new Notice(`Sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      new Notice('Error syncing settings');
    }
  }

  async initializeVault() {
    const wizard = new InitWizard(this.app, this);
    await wizard.show();
  }

  async createProfileFromCurrent() {
    const profileName = await this.promptForProfileName();
    if (!profileName) return;

    try {
      const profile = await this.profileManager.createProfile(profileName);
      this.settings.profiles.push(profile);
      await this.saveSettings();
      new Notice(`Profile "${profileName}" created successfully`);
    } catch (error) {
      console.error('Error creating profile:', error);
      new Notice('Failed to create profile');
    }
  }

  async applyProfile(profileId: string) {
    if (!profileId) return;

    const profile = this.settings.profiles.find(p => p.id === profileId);
    if (!profile) {
      new Notice('Profile not found');
      return;
    }

    try {
      await this.profileManager.applyProfile(profile);
      new Notice(`Applied profile: ${profile.name}`);
    } catch (error) {
      console.error('Error applying profile:', error);
      new Notice('Failed to apply profile');
    }
  }

  async showProfileSelector() {
    const profiles = this.settings.profiles;
    if (profiles.length === 0) {
      new Notice('No profiles available');
      return;
    }

    const modal = new ProfileSelectorModal(this.app, profiles, async (profile) => {
      this.settings.activeProfile = profile.id;
      await this.saveSettings();
      await this.applyProfile(profile.id);
    });
    modal.open();
  }

  async exportSettings() {
    try {
      const settings = await this.settingsParser.parseAllSettings();
      const content = JSON.stringify(settings, null, 2);
      const filename = `obsidian-settings-${new Date().toISOString().split('T')[0]}.json`;
      
      await this.app.vault.create(filename, content);
      new Notice(`Settings exported to ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      new Notice('Failed to export settings');
    }
  }

  async importSettings() {
    // This would typically show a file picker modal
    new Notice('Import settings feature coming soon');
  }

  startAutoSync() {
    this.stopAutoSync();
    
    const intervalMs = this.settings.syncInterval * 60 * 1000;
    this.autoSyncInterval = window.setInterval(async () => {
      await this.syncSettings();
    }, intervalMs);
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

  private async promptForProfileName(): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new ProfileNameModal(this.app, (name) => {
        resolve(name);
      });
      modal.open();
    });
  }
}

class ProfileSelectorModal extends Modal {
  profiles: SettingsProfile[];
  onSelect: (profile: SettingsProfile) => void;

  constructor(app: App, profiles: SettingsProfile[], onSelect: (profile: SettingsProfile) => void) {
    super(app);
    this.profiles = profiles;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Select Profile' });

    this.profiles.forEach(profile => {
      const item = contentEl.createDiv('profile-item');
      item.createEl('h3', { text: profile.name });
      item.createEl('p', { text: profile.description });
      item.createEl('small', { text: `Created: ${new Date(profile.createdAt).toLocaleDateString()}` });
      
      item.addEventListener('click', () => {
        this.onSelect(profile);
        this.close();
      });
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class ProfileNameModal extends Modal {
  onSubmit: (name: string) => void;

  constructor(app: App, onSubmit: (name: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Create Profile' });

    const inputEl = contentEl.createEl('input', {
      type: 'text',
      placeholder: 'Profile name'
    });
    inputEl.focus();

    const descEl = contentEl.createEl('textarea', {
      placeholder: 'Profile description (optional)'
    });

    const submitBtn = contentEl.createEl('button', { text: 'Create' });
    submitBtn.addEventListener('click', () => {
      const name = inputEl.value.trim();
      if (name) {
        this.onSubmit(name);
        this.close();
      }
    });

    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitBtn.click();
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}