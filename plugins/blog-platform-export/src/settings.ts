import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import BlogPlatformExportPlugin from './main';

export class BlogPlatformExportSettingTab extends PluginSettingTab {
  plugin: BlogPlatformExportPlugin;

  constructor(app: App, plugin: BlogPlatformExportPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Blog Platform Export Settings' });

    // Default platform
    new Setting(containerEl)
      .setName('Default platform')
      .setDesc('The default platform to use for quick exports')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('hugo', 'Hugo')
          .addOption('jekyll', 'Jekyll')
          .addOption('wikijs', 'WikiJS')
          .setValue(this.plugin.settings.defaultPlatform)
          .onChange(async (value: any) => {
            this.plugin.settings.defaultPlatform = value;
            await this.plugin.saveSettings();
          })
      );

    // Output path
    new Setting(containerEl)
      .setName('Output path')
      .setDesc('Default output directory for file-based exports (Hugo, Jekyll)')
      .addText((text) =>
        text
          .setPlaceholder('/path/to/blog')
          .setValue(this.plugin.settings.outputPath)
          .onChange(async (value) => {
            this.plugin.settings.outputPath = value;
            await this.plugin.saveSettings();
          })
      );

    // Asset handling
    containerEl.createEl('h3', { text: 'Asset Handling' });

    new Setting(containerEl)
      .setName('Copy images')
      .setDesc('Copy image files during export')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.assetHandling.copyImages).onChange(async (value) => {
          this.plugin.settings.assetHandling.copyImages = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Copy attachments')
      .setDesc('Copy attachment files during export')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.assetHandling.copyAttachments)
          .onChange(async (value) => {
            this.plugin.settings.assetHandling.copyAttachments = value;
            await this.plugin.saveSettings();
          })
      );

    // Profiles section
    containerEl.createEl('h3', { text: 'Export Profiles' });

    const profilesContainer = containerEl.createDiv('profiles-container');
    this.renderProfiles(profilesContainer);

    new Setting(containerEl)
      .setName('Add profile')
      .setDesc('Create a new export profile')
      .addButton((button) =>
        button.setButtonText('Add Profile').onClick(() => {
          this.showProfileCreationModal();
        })
      );

    // Actions
    containerEl.createEl('h3', { text: 'Actions' });

    new Setting(containerEl)
      .setName('Create default profiles')
      .setDesc('Add default Hugo and Jekyll profiles')
      .addButton((button) =>
        button.setButtonText('Create Defaults').onClick(async () => {
          const defaults = this.plugin.profileManager.createDefaultProfiles();
          await this.plugin.saveSettings();
          new Notice(`Created ${defaults.length} default profiles`);
          this.display(); // Refresh
        })
      );

    new Setting(containerEl)
      .setName('Export test')
      .setDesc('Test export functionality with current settings')
      .addButton((button) =>
        button.setButtonText('Test Export').onClick(() => {
          this.testExport();
        })
      );

    this.addStyles();
  }

  private renderProfiles(container: HTMLElement) {
    container.empty();

    const profiles = this.plugin.settings.profiles;

    if (profiles.length === 0) {
      container.createEl('p', {
        text: 'No export profiles configured. Create a profile to get started.',
        cls: 'setting-item-description',
      });
      return;
    }

    profiles.forEach((profile, index) => {
      const profileEl = container.createDiv('profile-item');

      const headerEl = profileEl.createDiv('profile-header');
      headerEl.createEl('h4', { text: profile.name });
      headerEl.createEl('span', {
        text: profile.platform.toUpperCase(),
        cls: `platform-badge platform-${profile.platform}`,
      });

      const actionsEl = profileEl.createDiv('profile-actions');

      // Edit button
      const editBtn = actionsEl.createEl('button', { text: 'Edit' });
      editBtn.addEventListener('click', () => {
        this.showProfileEditModal(profile);
      });

      // Delete button
      const deleteBtn = actionsEl.createEl('button', {
        text: 'Delete',
        cls: 'mod-warning',
      });
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Delete profile "${profile.name}"?`)) {
          this.plugin.profileManager.deleteProfile(profile.id);
          await this.plugin.saveSettings();
          this.display(); // Refresh
        }
      });
    });
  }

  private showProfileCreationModal() {
    // For now, show a simple notice
    // In a full implementation, this would open a detailed profile creation modal
    new Notice('Profile creation modal would open here. For now, use "Create Defaults" button.');
  }

  private showProfileEditModal(profile: any) {
    // For now, show a simple notice
    // In a full implementation, this would open a detailed profile editing modal
    new Notice(`Profile editing for "${profile.name}" would open here.`);
  }

  private async testExport() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== 'md') {
      new Notice('Please open a markdown file to test export');
      return;
    }

    const defaultProfile = this.plugin.getDefaultProfile();
    if (!defaultProfile) {
      new Notice('No export profiles configured');
      return;
    }

    try {
      const preview = await this.plugin.previewExport([activeFile], defaultProfile);
      console.log('Export preview:', preview);
      new Notice('Export test completed. Check console for preview.');
    } catch (error) {
      new Notice(`Export test failed: ${error.message}`);
      console.error('Export test error:', error);
    }
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .profiles-container {
        margin: 20px 0;
      }
      
      .profile-item {
        border: 1px solid var(--background-modifier-border);
        border-radius: 5px;
        padding: 15px;
        margin-bottom: 10px;
      }
      
      .profile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .profile-header h4 {
        margin: 0;
      }
      
      .platform-badge {
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 0.8em;
        font-weight: bold;
      }
      
      .platform-hugo {
        background-color: #ff4088;
        color: white;
      }
      
      .platform-jekyll {
        background-color: #cc0000;
        color: white;
      }
      
      .platform-wikijs {
        background-color: #1976d2;
        color: white;
      }
      
      .profile-actions {
        display: flex;
        gap: 10px;
      }
      
      .profile-actions button {
        padding: 5px 15px;
        border: 1px solid var(--interactive-accent);
        border-radius: 3px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        cursor: pointer;
      }
      
      .profile-actions button.mod-warning {
        background: var(--text-error);
        border-color: var(--text-error);
      }
      
      .profile-actions button:hover {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
  }
}
