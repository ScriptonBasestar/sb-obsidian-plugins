import { App, PluginSettingTab, Setting, Notice } from 'obsidian';

import ScriptonSyncPlugin from './main';
import { BranchStrategy } from './types';

export class ScriptonSyncSettingTab extends PluginSettingTab {
  public plugin: ScriptonSyncPlugin;

  constructor(app: App, plugin: ScriptonSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  public display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Scripton Sync Configuration' });

    // Sync status indicator
    const statusContainer = containerEl.createDiv('sync-status-container');
    this.renderSyncStatus(statusContainer);

    // Tab navigation
    const tabContainer = containerEl.createDiv('tab-nav-container');
    const contentContainer = containerEl.createDiv('tab-content-container');

    const tabs = [
      { id: 'cloud', name: 'Scripton Cloud', icon: 'cloud' },
      { id: 'git', name: 'Git Settings', icon: 'git-branch' },
      { id: 'sync', name: 'Auto Sync', icon: 'sync' },
      { id: 'profiles', name: 'Profiles', icon: 'users' },
      { id: 'advanced', name: 'Advanced', icon: 'settings' },
    ];

    let activeTab = 'cloud';

    const renderTab = (tabId: string): void => {
      contentContainer.empty();
      activeTab = tabId;

      // Update tab styles
      tabContainer.querySelectorAll('.tab-nav-item').forEach((el) => {
        el.removeClass('is-active');
      });
      tabContainer.querySelector(`[data-tab="${tabId}"]`)?.addClass('is-active');

      switch (tabId) {
        case 'cloud':
          this.renderCloudSettings(contentContainer);
          break;
        case 'git':
          this.renderGitSettings(contentContainer);
          break;
        case 'sync':
          this.renderSyncSettings(contentContainer);
          break;
        case 'profiles':
          this.renderProfileSettings(contentContainer);
          break;
        case 'advanced':
          this.renderAdvancedSettings(contentContainer);
          break;
      }
    };

    // Create tab navigation
    tabs.forEach((tab) => {
      const tabEl = tabContainer.createDiv({
        cls: 'tab-nav-item',
        attr: { 'data-tab': tab.id },
      });

      if (tab.id === activeTab) {
        tabEl.addClass('is-active');
      }

      tabEl.createSpan({ cls: `tab-nav-icon lucide-${tab.icon}` });
      tabEl.createSpan({ text: tab.name });

      tabEl.addEventListener('click', () => renderTab(tab.id));
    });

    // Initial render
    renderTab(activeTab);
  }

  private renderSyncStatus(container: HTMLElement): void {
    container.empty();

    const status = this.plugin.getSyncStatus();
    const statusEl = container.createDiv('sync-status');

    statusEl.createSpan({
      cls: `sync-status-indicator ${
        status.syncing ? 'syncing' : status.hasChanges ? 'pending' : 'synced'
      }`,
    });

    statusEl.createSpan({
      text: status.syncing ? 'Syncing...' : status.hasChanges ? 'Changes pending' : 'Synced',
      cls: 'sync-status-text',
    });

    if (status.lastSync !== null) {
      statusEl.createSpan({
        text: `Last sync: ${new Date(status.lastSync).toLocaleString()}`,
        cls: 'sync-status-time',
      });
    }
  }

  private renderCloudSettings(container: HTMLElement): void {
    container.createEl('h3', { text: 'Scripton Cloud Settings' });

    new Setting(container)
      .setName('Cloud URL')
      .setDesc('Scripton Cloud server URL')
      .addText((text) =>
        text
          .setPlaceholder('https://scripton.cloud')
          .setValue(this.plugin.settings.scriptonCloudUrl ?? '')
          .onChange(async (value) => {
            this.plugin.settings.scriptonCloudUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(container)
      .setName('API Key')
      .setDesc('Your Scripton Cloud API key')
      .addText((text) =>
        text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.scriptonCloudApiKey ?? '')
          .onChange(async (value) => {
            this.plugin.settings.scriptonCloudApiKey = value;
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText('Test Connection').onClick(async () => {
          const result = await this.plugin.testCloudConnection();
          if (result) {
            new Notice('Connection successful!');
          } else {
            new Notice('Connection failed. Please check your settings.');
          }
        })
      );

    new Setting(container)
      .setName('Download Cloud Settings')
      .setDesc('Download and apply settings from Scripton Cloud')
      .addButton((button) =>
        button.setButtonText('Download').onClick(async () => {
          await this.plugin.downloadCloudSettings();
        })
      );
  }

  private renderGitSettings(container: HTMLElement): void {
    container.createEl('h3', { text: 'Git Repository Settings' });

    new Setting(container)
      .setName('Git remote URL')
      .setDesc('The Git repository URL for syncing')
      .addText((text) =>
        text
          .setPlaceholder('https://github.com/user/obsidian-vault.git')
          .setValue(this.plugin.settings.gitConfig?.remote ?? '')
          .onChange(async (value) => {
            if (!this.plugin.settings.gitConfig) {
              this.plugin.settings.gitConfig = {
                remote: '',
                branch: 'main',
                author: { name: '', email: '' },
              };
            }
            this.plugin.settings.gitConfig.remote = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(container)
      .setName('Author name')
      .setDesc('Git commit author name')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.gitConfig?.author?.name ?? '')
          .onChange(async (value) => {
            if (!this.plugin.settings.gitConfig) {
              this.plugin.settings.gitConfig = {
                remote: '',
                branch: 'main',
                author: { name: '', email: '' },
              };
            }
            this.plugin.settings.gitConfig.author.name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(container)
      .setName('Author email')
      .setDesc('Git commit author email')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.gitConfig?.author?.email ?? '')
          .onChange(async (value) => {
            if (!this.plugin.settings.gitConfig) {
              this.plugin.settings.gitConfig = {
                remote: '',
                branch: 'main',
                author: { name: '', email: '' },
              };
            }
            this.plugin.settings.gitConfig.author.email = value;
            await this.plugin.saveSettings();
          })
      );

    container.createEl('h4', { text: 'Branch Strategy' });

    new Setting(container)
      .setName('Branch strategy')
      .setDesc('Choose how branches are managed')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            simple: 'Simple (use default branch)',
            'develop-host': 'Develop/Hostname (recommended)',
            'feature-branch': 'Feature branches',
            custom: 'Custom',
          })
          .setValue(this.plugin.settings.branchStrategy)
          .onChange(async (value: BranchStrategy) => {
            this.plugin.settings.branchStrategy = value;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show/hide related settings
          })
      );

    new Setting(container)
      .setName('Default branch')
      .setDesc('Main branch name (e.g., main, master)')
      .addText((text) =>
        text.setValue(this.plugin.settings.defaultBranch).onChange(async (value) => {
          this.plugin.settings.defaultBranch = value;
          await this.plugin.saveSettings();
        })
      );

    if (this.plugin.settings.branchStrategy === 'develop-host') {
      new Setting(container)
        .setName('Development branch prefix')
        .setDesc('Prefix for host-specific branches')
        .addText((text) =>
          text.setValue(this.plugin.settings.tempBranchPrefix).onChange(async (value) => {
            this.plugin.settings.tempBranchPrefix = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(container)
        .setName('Auto merge to default')
        .setDesc('Automatically merge changes to default branch')
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.autoMergeToDefault).onChange(async (value) => {
            this.plugin.settings.autoMergeToDefault = value;
            await this.plugin.saveSettings();
          })
        );
    }

    new Setting(container)
      .setName('Initialize Git repository')
      .setDesc('Initialize a new Git repository in the vault')
      .addButton((button) =>
        button.setButtonText('Initialize').onClick(async () => {
          await this.plugin.initGitRepository();
        })
      );
  }

  private renderSyncSettings(container: HTMLElement): void {
    container.createEl('h3', { text: 'Auto Sync Settings' });

    new Setting(container)
      .setName('Enable auto commit')
      .setDesc('Automatically commit changes at regular intervals')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoCommit).onChange(async (value) => {
          this.plugin.settings.enableAutoCommit = value;
          await this.plugin.saveSettings();
          if (value) {
            this.plugin.startAutoCommit();
          } else {
            this.plugin.stopAutoCommit();
          }
        })
      );

    if (this.plugin.settings.enableAutoCommit === true) {
      new Setting(container)
        .setName('Commit interval')
        .setDesc('Minutes between auto commits')
        .addSlider((slider) =>
          slider
            .setLimits(1, 60, 1)
            .setValue(this.plugin.settings.commitIntervalMinutes)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.plugin.settings.commitIntervalMinutes = value;
              await this.plugin.saveSettings();
              this.plugin.restartAutoCommit();
            })
        );

      new Setting(container)
        .setName('Include untracked files')
        .setDesc('Include new files in auto commits')
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.includeUntracked).onChange(async (value) => {
            this.plugin.settings.includeUntracked = value;
            await this.plugin.saveSettings();
          })
        );
    }

    new Setting(container)
      .setName('Enable auto push')
      .setDesc('Automatically push commits to remote')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoPush).onChange(async (value) => {
          this.plugin.settings.enableAutoPush = value;
          await this.plugin.saveSettings();
        })
      );

    if (this.plugin.settings.enableAutoPush) {
      new Setting(container)
        .setName('Push after commits')
        .setDesc('Number of commits before auto push')
        .addSlider((slider) =>
          slider
            .setLimits(1, 20, 1)
            .setValue(this.plugin.settings.pushAfterCommits)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.plugin.settings.pushAfterCommits = value;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(container)
      .setName('Enable auto pull')
      .setDesc('Automatically pull changes from remote')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoPull).onChange(async (value) => {
          this.plugin.settings.enableAutoPull = value;
          await this.plugin.saveSettings();
        })
      );

    container.createEl('h4', { text: 'AI Commit Messages' });

    new Setting(container)
      .setName('Enable AI commit messages')
      .setDesc('Use AI to generate commit messages')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAICommitMessages).onChange(async (value) => {
          this.plugin.settings.enableAICommitMessages = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide AI settings
        })
      );

    if (this.plugin.settings.enableAICommitMessages) {
      new Setting(container)
        .setName('LLM Provider')
        .setDesc('Choose AI provider for commit messages')
        .addDropdown((dropdown) =>
          dropdown
            .addOptions({
              none: 'None',
              openai: 'OpenAI',
              anthropic: 'Anthropic',
            })
            .setValue(this.plugin.settings.llmProvider)
            .onChange(async (value: 'none' | 'openai' | 'anthropic') => {
              this.plugin.settings.llmProvider = value;
              await this.plugin.saveSettings();
            })
        );

      if (this.plugin.settings.llmProvider !== 'none') {
        new Setting(container)
          .setName('API Key')
          .setDesc('API key for the selected provider')
          .addText((text) =>
            text
              .setPlaceholder('Enter API key')
              .setValue(this.plugin.settings.apiKey)
              .onChange(async (value) => {
                this.plugin.settings.apiKey = value;
                await this.plugin.saveSettings();
              })
          );

        new Setting(container)
          .setName('Commit prompt')
          .setDesc('Prompt template for generating commit messages')
          .addTextArea((text) =>
            text
              .setPlaceholder('Generate a commit message for these changes:')
              .setValue(this.plugin.settings.commitPrompt)
              .onChange(async (value) => {
                this.plugin.settings.commitPrompt = value;
                await this.plugin.saveSettings();
              })
          );
      }
    }
  }

  private renderProfileSettings(container: HTMLElement): void {
    container.createEl('h3', { text: 'Settings Profiles' });

    new Setting(container)
      .setName('Active profile')
      .setDesc('Select the active settings profile')
      .addDropdown((dropdown) => {
        dropdown.addOption('', 'None');
        this.plugin.settings.profiles.forEach((profile) => {
          dropdown.addOption(profile.id, profile.name);
        });
        dropdown.setValue(this.plugin.settings.activeProfile).onChange(async (value) => {
          this.plugin.settings.activeProfile = value;
          await this.plugin.saveSettings();
          await this.plugin.applyProfile(value);
        });
      });

    new Setting(container)
      .setName('Create new profile')
      .setDesc('Create a new settings profile from current settings')
      .addButton((button) =>
        button.setButtonText('Create Profile').onClick(async () => {
          await this.plugin.createProfileFromCurrent();
          this.display();
        })
      );

    // List existing profiles
    if (this.plugin.settings.profiles.length > 0) {
      container.createEl('h4', { text: 'Existing Profiles' });

      this.plugin.settings.profiles.forEach((profile) => {
        const profileSetting = new Setting(container)
          .setName(profile.name)
          .setDesc(profile.description);

        profileSetting.addButton((button) =>
          button.setButtonText('Apply').onClick(async () => {
            await this.plugin.applyProfile(profile.id);
          })
        );

        profileSetting.addButton((button) =>
          button.setButtonText('Export').onClick(async () => {
            await this.plugin.exportProfile(profile.id);
          })
        );

        profileSetting.addButton((button) =>
          button
            .setButtonText('Delete')
            .setWarning()
            .onClick(async () => {
              await this.plugin.deleteProfile(profile.id);
              this.display();
            })
        );
      });
    }
  }

  private renderAdvancedSettings(container: HTMLElement): void {
    container.createEl('h3', { text: 'Advanced Settings' });

    new Setting(container)
      .setName('Merge strategy')
      .setDesc('Strategy for merging branches')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            merge: 'Merge',
            rebase: 'Rebase',
            squash: 'Squash',
          })
          .setValue(this.plugin.settings.mergeStrategy)
          .onChange(async (value: 'merge' | 'rebase' | 'squash') => {
            this.plugin.settings.mergeStrategy = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(container)
      .setName('Conflict resolution')
      .setDesc('How to handle merge conflicts')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            manual: 'Manual (open editor)',
            merge: 'Auto merge',
            overwrite: 'Overwrite with remote',
          })
          .setValue(this.plugin.settings.conflictResolution)
          .onChange(async (value: 'manual' | 'merge' | 'overwrite') => {
            this.plugin.settings.conflictResolution = value;
            await this.plugin.saveSettings();
          })
      );

    if (this.plugin.settings.conflictResolution === 'manual') {
      new Setting(container)
        .setName('Editor command')
        .setDesc('Command to open external editor for conflicts')
        .addText((text) =>
          text
            .setPlaceholder('code')
            .setValue(this.plugin.settings.editorCommand)
            .onChange(async (value) => {
              this.plugin.settings.editorCommand = value;
              await this.plugin.saveSettings();
            })
        );
    }

    container.createEl('h4', { text: 'Excluded Files' });

    new Setting(container)
      .setName('Excluded files')
      .setDesc('Files to exclude from sync (one per line)')
      .addTextArea((text) => {
        text
          .setPlaceholder('workspace.json\n.obsidian/workspace')
          .setValue(this.plugin.settings.excludedFiles.join('\n'))
          .onChange(async (value) => {
            this.plugin.settings.excludedFiles = value.split('\n').filter((x) => x.trim());
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 6;
      });

    container.createEl('h4', { text: 'Security' });

    new Setting(container)
      .setName('Sensitive keys')
      .setDesc('Keys to filter from settings (one per line)')
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.sensitiveKeys.join('\n')).onChange(async (value) => {
          this.plugin.settings.sensitiveKeys = value.split('\n').filter((x) => x.trim());
          await this.plugin.saveSettings();
        });
        text.inputEl.rows = 6;
      });

    container.createEl('h4', { text: 'Maintenance' });

    new Setting(container)
      .setName('Clean old branches')
      .setDesc('Remove branches older than 30 days')
      .addButton((button) =>
        button.setButtonText('Clean').onClick(async () => {
          await this.plugin.cleanOldBranches();
        })
      );

    new Setting(container)
      .setName('Reset sync state')
      .setDesc('Reset all sync settings to default')
      .addButton((button) =>
        button
          .setButtonText('Reset')
          .setWarning()
          .onClick(async () => {
            // eslint-disable-next-line no-alert
            if (confirm('Are you sure you want to reset all settings?')) {
              await this.plugin.resetSettings();
              this.display();
            }
          })
      );
  }
}
