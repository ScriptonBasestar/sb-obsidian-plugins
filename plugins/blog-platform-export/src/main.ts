import { Plugin, Notice, TFile, Modal, Menu } from 'obsidian';
import { BlogPlatformExportSettings, DEFAULT_SETTINGS, ExportProfile } from './types';
import { BlogPlatformExportSettingTab } from './settings';
import { ExportModal } from './ui/export-modal';
import { ProfileManager } from './profile-manager';
import { ExportManager } from './export-manager';

export default class BlogPlatformExportPlugin extends Plugin {
  settings!: BlogPlatformExportSettings;
  profileManager!: ProfileManager;
  exportManager!: ExportManager;

  override async onload() {
    await this.loadSettings();

    // Initialize managers
    this.profileManager = new ProfileManager(this.app, this.settings);
    this.exportManager = new ExportManager(this.app, this.profileManager);

    // Add ribbon icon
    this.addRibbonIcon('upload', 'Export to Blog Platform', () => {
      this.showExportModal();
    });

    // Add settings tab
    this.addSettingTab(new BlogPlatformExportSettingTab(this.app, this));

    // Register commands
    this.registerCommands();

    // Register context menu
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.addFileMenuItems(menu, file);
        }
      })
    );

    console.log('Blog Platform Export plugin loaded');
  }

  override onunload() {
    console.log('Blog Platform Export plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  registerCommands() {
    // Export current file
    this.addCommand({
      id: 'export-current-file',
      name: 'Export current file',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
          this.exportCurrentFile(activeFile);
        } else {
          new Notice('No markdown file is currently active');
        }
      },
    });

    // Export with profile
    this.addCommand({
      id: 'export-with-profile',
      name: 'Export with profile...',
      callback: () => {
        this.showExportModal();
      },
    });

    // Quick export (use default profile)
    this.addCommand({
      id: 'quick-export',
      name: 'Quick export (default profile)',
      callback: async () => {
        const defaultProfile = this.profileManager.getDefaultProfile();
        if (!defaultProfile) {
          new Notice('No default profile configured. Please create a profile first.');
          this.showExportModal();
          return;
        }

        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.extension === 'md') {
          await this.exportWithProfile([activeFile], defaultProfile);
        } else {
          new Notice('No markdown file is currently active');
        }
      },
    });

    // Export folder
    this.addCommand({
      id: 'export-folder',
      name: 'Export folder...',
      callback: () => {
        this.showFolderExportModal();
      },
    });

    // Manage profiles
    this.addCommand({
      id: 'manage-profiles',
      name: 'Manage export profiles',
      callback: () => {
        // @ts-ignore - Obsidian API
        this.app.setting.open();
        // @ts-ignore - Obsidian API
        this.app.setting.openTabById('blog-platform-export');
      },
    });
  }

  addFileMenuItems(menu: Menu, file: TFile) {
    menu.addItem((item) => {
      item
        .setTitle('Export to blog platform')
        .setIcon('upload')
        .onClick(() => {
          this.exportCurrentFile(file);
        });
    });

    // Add profile-specific export options
    const profiles = this.settings.profiles;
    if (profiles.length > 0) {
      menu.addSeparator();

      profiles.forEach((profile) => {
        menu.addItem((item) => {
          item
            .setTitle(`Export to ${profile.name}`)
            .setIcon('upload')
            .onClick(async () => {
              await this.exportWithProfile([file], profile);
            });
        });
      });
    }
  }

  async exportCurrentFile(file: TFile) {
    const profiles = this.settings.profiles;

    if (profiles.length === 0) {
      new Notice('No export profiles configured. Please create a profile first.');
      this.showExportModal();
      return;
    }

    if (profiles.length === 1) {
      // Use the only available profile
      await this.exportWithProfile([file], profiles[0]);
    } else {
      // Show profile selection
      this.showProfileSelectionModal([file]);
    }
  }

  async exportWithProfile(files: TFile[], profile: ExportProfile) {
    try {
      new Notice(`Starting export to ${profile.name}...`);

      const result = await this.exportManager.exportFiles(files, profile);

      if (result.success) {
        new Notice(
          `✅ Export completed! ${result.processedFiles} files exported to ${profile.platform}`
        );

        if (result.warnings.length > 0) {
          new Notice(`⚠️ ${result.warnings.length} warnings occurred. Check console for details.`);
          console.warn('Export warnings:', result.warnings);
        }
      } else {
        new Notice(`❌ Export failed: ${result.errors.length} errors occurred`);
        console.error('Export errors:', result.errors);
      }

      // Update last export time
      this.settings.lastExport = new Date().toISOString();
      await this.saveSettings();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`❌ Export failed: ${errorMessage}`);
      console.error('Export error:', error);
    }
  }

  showExportModal() {
    new ExportModal(this.app, this.profileManager, (files, profile) => {
      this.exportWithProfile(files, profile);
    }).open();
  }

  showFolderExportModal() {
    // This would show a modal to select folders and profiles
    // For now, use the main export modal
    this.showExportModal();
  }

  showProfileSelectionModal(files: TFile[]) {
    const modal = new Modal(this.app);
    modal.titleEl.setText('Select Export Profile');

    const profiles = this.settings.profiles;

    profiles.forEach((profile) => {
      const button = modal.contentEl.createEl('button', {
        text: `${profile.name} (${profile.platform})`,
        cls: 'mod-cta',
      });

      button.style.display = 'block';
      button.style.width = '100%';
      button.style.marginBottom = '10px';

      button.addEventListener('click', () => {
        modal.close();
        this.exportWithProfile(files, profile);
      });
    });

    // Add cancel button
    const cancelButton = modal.contentEl.createEl('button', {
      text: 'Cancel',
    });
    cancelButton.style.marginTop = '20px';
    cancelButton.addEventListener('click', () => {
      modal.close();
    });

    modal.open();
  }

  // Profile management methods
  async createProfile(profile: ExportProfile) {
    this.settings.profiles.push(profile);
    await this.saveSettings();
  }

  async updateProfile(profileId: string, updates: Partial<ExportProfile>) {
    const profileIndex = this.settings.profiles.findIndex((p) => p.id === profileId);
    if (profileIndex !== -1) {
      const profile = this.settings.profiles[profileIndex];
      if (profile) {
        Object.assign(profile, updates);
        await this.saveSettings();
      }
    }
  }

  async deleteProfile(profileId: string) {
    this.settings.profiles = this.settings.profiles.filter((p) => p.id !== profileId);
    await this.saveSettings();
  }

  // Utility methods
  getProfile(profileId: string): ExportProfile | undefined {
    return this.settings.profiles.find((p) => p.id === profileId);
  }

  getAllProfiles(): ExportProfile[] {
    return this.settings.profiles;
  }

  getDefaultProfile(): ExportProfile | undefined {
    const defaultPlatform = this.settings.defaultPlatform;
    return (
      this.settings.profiles.find((p) => p.platform === defaultPlatform) ||
      (this.settings.profiles.length > 0 ? this.settings.profiles[0] : undefined)
    );
  }

  // Export status and history
  getLastExportTime(): Date | null {
    return this.settings.lastExport ? new Date(this.settings.lastExport) : null;
  }

  // Validation methods
  async validateProfile(profile: ExportProfile): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!profile.name.trim()) {
      errors.push('Profile name is required');
    }

    if (!profile.platform) {
      errors.push('Platform must be selected');
    }

    // Platform-specific validation
    switch (profile.platform) {
      case 'hugo':
        if (!profile.settings.hugo?.contentDir) {
          errors.push('Hugo content directory is required');
        }
        break;
      case 'jekyll':
        if (!profile.settings.jekyll?.postsDir) {
          errors.push('Jekyll posts directory is required');
        }
        break;
      case 'wikijs':
        if (!profile.settings.wikijs?.wikiUrl) {
          errors.push('WikiJS URL is required');
        }
        if (!profile.settings.wikijs?.apiKey) {
          errors.push('WikiJS API key is required');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Export preview
  async previewExport(files: TFile[], profile: ExportProfile): Promise<any> {
    return await this.exportManager.previewExport(files, profile);
  }
}
