import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import SettingsSyncPlugin from './main';
import { SettingsSyncSettings, SettingsProfile } from './types';
import { SettingsComparisonViewer } from './settings-comparison';

export class SettingsSyncSettingTab extends PluginSettingTab {
  plugin: SettingsSyncPlugin;

  constructor(app: App, plugin: SettingsSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Settings Sync Configuration' });

    // Sync status indicator
    const statusContainer = containerEl.createDiv('sync-status-container');
    this.renderSyncStatus(statusContainer);

    // Git Repository Settings
    new Setting(containerEl)
      .setName('Git repository URL')
      .setDesc('The Git repository URL for syncing settings')
      .addText(text => text
        .setPlaceholder('https://github.com/user/obsidian-settings.git')
        .setValue(this.plugin.settings.gitRepo)
        .onChange(async (value) => {
          this.plugin.settings.gitRepo = value;
          await this.plugin.saveSettings();
        }));

    // Auto Sync Settings
    new Setting(containerEl)
      .setName('Auto sync')
      .setDesc('Automatically sync settings at regular intervals')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSync)
        .onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
          if (value) {
            this.plugin.startAutoSync();
          } else {
            this.plugin.stopAutoSync();
          }
        }));

    if (this.plugin.settings.autoSync) {
      new Setting(containerEl)
        .setName('Sync interval')
        .setDesc('Interval in minutes between automatic syncs')
        .addSlider(slider => slider
          .setLimits(5, 120, 5)
          .setValue(this.plugin.settings.syncInterval)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.syncInterval = value;
            await this.plugin.saveSettings();
            this.plugin.restartAutoSync();
          }));
    }

    // Profile Management
    containerEl.createEl('h3', { text: 'Profile Management' });

    new Setting(containerEl)
      .setName('Active profile')
      .setDesc('Select the active settings profile')
      .addDropdown(dropdown => {
        dropdown.addOption('', 'None');
        this.plugin.settings.profiles.forEach(profile => {
          dropdown.addOption(profile.id, profile.name);
        });
        dropdown.setValue(this.plugin.settings.activeProfile)
          .onChange(async (value) => {
            this.plugin.settings.activeProfile = value;
            await this.plugin.saveSettings();
            await this.plugin.applyProfile(value);
          });
      });

    new Setting(containerEl)
      .setName('Create new profile')
      .setDesc('Create a new settings profile from current settings')
      .addButton(button => button
        .setButtonText('Create Profile')
        .onClick(async () => {
          await this.plugin.createProfileFromCurrent();
          this.display();
        }));

    // Excluded Files
    containerEl.createEl('h3', { text: 'Sync Configuration' });

    new Setting(containerEl)
      .setName('Excluded files')
      .setDesc('Files to exclude from syncing (one per line)')
      .addTextArea(text => text
        .setPlaceholder('workspace.json\nworkspace-mobile.json')
        .setValue(this.plugin.settings.excludedFiles.join('\n'))
        .onChange(async (value) => {
          this.plugin.settings.excludedFiles = value.split('\n').filter(f => f.trim());
          await this.plugin.saveSettings();
        }));

    // Sensitive Keys
    new Setting(containerEl)
      .setName('Sensitive keys')
      .setDesc('Keys containing sensitive data to filter out (one per line)')
      .addTextArea(text => text
        .setPlaceholder('apiKey\ntoken\npassword')
        .setValue(this.plugin.settings.sensitiveKeys.join('\n'))
        .onChange(async (value) => {
          this.plugin.settings.sensitiveKeys = value.split('\n').filter(k => k.trim());
          await this.plugin.saveSettings();
        }));

    // Actions
    containerEl.createEl('h3', { text: 'Actions' });

    new Setting(containerEl)
      .setName('Manual sync')
      .setDesc('Manually trigger a settings sync')
      .addButton(button => button
        .setButtonText('Sync Now')
        .onClick(async () => {
          await this.plugin.syncSettings();
        }));

    new Setting(containerEl)
      .setName('Initialize vault')
      .setDesc('Initialize a new vault with settings from repository')
      .addButton(button => button
        .setButtonText('Initialize')
        .onClick(async () => {
          await this.plugin.initializeVault();
        }));

    new Setting(containerEl)
      .setName('Compare settings')
      .setDesc('Compare settings between profiles or with current settings')
      .addButton(button => button
        .setButtonText('Open Comparison')
        .onClick(() => {
          const viewer = new SettingsComparisonViewer(this.app, this.plugin);
          viewer.open();
        }));

    // Last Sync Info
    if (this.plugin.settings.lastSync) {
      new Setting(containerEl)
        .setName('Last sync')
        .setDesc(`Last synchronized: ${new Date(this.plugin.settings.lastSync).toLocaleString()}`);
    }

    this.addStyles();
  }

  private renderSyncStatus(container: HTMLElement) {
    container.empty();
    
    const statusEl = container.createDiv('sync-status');
    const iconEl = statusEl.createSpan('sync-status-icon');
    const textEl = statusEl.createSpan('sync-status-text');
    
    if (this.plugin.syncManager?.syncInProgress) {
      setIcon(iconEl, 'sync');
      iconEl.addClass('sync-in-progress');
      textEl.setText('Syncing...');
    } else if (this.plugin.settings.lastSync) {
      const lastSync = new Date(this.plugin.settings.lastSync);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));
      
      if (diffMinutes < 5) {
        setIcon(iconEl, 'check');
        iconEl.addClass('sync-success');
        textEl.setText('Recently synced');
      } else if (diffMinutes < 60) {
        setIcon(iconEl, 'check');
        iconEl.addClass('sync-ok');
        textEl.setText(`Synced ${diffMinutes} minutes ago`);
      } else {
        setIcon(iconEl, 'alert-circle');
        iconEl.addClass('sync-warning');
        textEl.setText(`Last sync: ${lastSync.toLocaleString()}`);
      }
    } else {
      setIcon(iconEl, 'alert-triangle');
      iconEl.addClass('sync-error');
      textEl.setText('Never synced');
    }
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sync-status-container {
        margin-bottom: 20px;
        padding: 15px;
        background-color: var(--background-secondary);
        border-radius: 5px;
      }
      
      .sync-status {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .sync-status-icon {
        display: flex;
        align-items: center;
      }
      
      .sync-status-icon svg {
        width: 18px;
        height: 18px;
      }
      
      .sync-status-icon.sync-in-progress svg {
        animation: spin 1s linear infinite;
        color: var(--interactive-accent);
      }
      
      .sync-status-icon.sync-success svg {
        color: var(--text-success);
      }
      
      .sync-status-icon.sync-ok svg {
        color: var(--text-success);
      }
      
      .sync-status-icon.sync-warning svg {
        color: var(--text-warning);
      }
      
      .sync-status-icon.sync-error svg {
        color: var(--text-error);
      }
      
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(style);
  }
}