import { App, Modal, Setting, Notice } from 'obsidian';
import SettingsSyncPlugin from './main';

interface InitOptions {
  gitRepo: string;
  profile?: string;
  installPlugins: boolean;
  applyTheme: boolean;
  applyHotkeys: boolean;
  applySnippets: boolean;
}

export class InitWizard extends Modal {
  private plugin: SettingsSyncPlugin;
  private options: InitOptions = {
    gitRepo: '',
    installPlugins: true,
    applyTheme: true,
    applyHotkeys: true,
    applySnippets: true
  };
  private step: number = 1;
  private totalSteps: number = 4;

  constructor(app: App, plugin: SettingsSyncPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async show() {
    this.open();
  }

  onOpen() {
    this.renderStep();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private renderStep() {
    const { contentEl } = this;
    contentEl.empty();

    // Header
    contentEl.createEl('h2', { text: 'Initialize Vault with Shared Settings' });
    
    // Progress indicator
    const progressEl = contentEl.createDiv('wizard-progress');
    progressEl.createEl('span', { text: `Step ${this.step} of ${this.totalSteps}` });
    
    // Step content
    const stepContent = contentEl.createDiv('wizard-content');
    
    switch (this.step) {
      case 1:
        this.renderRepositoryStep(stepContent);
        break;
      case 2:
        this.renderProfileStep(stepContent);
        break;
      case 3:
        this.renderOptionsStep(stepContent);
        break;
      case 4:
        this.renderConfirmationStep(stepContent);
        break;
    }

    // Navigation buttons
    const navEl = contentEl.createDiv('wizard-nav');
    
    if (this.step > 1) {
      const backBtn = navEl.createEl('button', { text: 'Back' });
      backBtn.addEventListener('click', () => {
        this.step--;
        this.renderStep();
      });
    }

    if (this.step < this.totalSteps) {
      const nextBtn = navEl.createEl('button', { text: 'Next', cls: 'mod-cta' });
      nextBtn.addEventListener('click', () => {
        if (this.validateStep()) {
          this.step++;
          this.renderStep();
        }
      });
    } else {
      const initBtn = navEl.createEl('button', { text: 'Initialize', cls: 'mod-cta' });
      initBtn.addEventListener('click', async () => {
        await this.initialize();
      });
    }

    const cancelBtn = navEl.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    this.addStyles();
  }

  private renderRepositoryStep(container: HTMLElement) {
    container.createEl('h3', { text: 'Git Repository' });
    container.createEl('p', { text: 'Enter the URL of the Git repository containing your shared settings.' });

    new Setting(container)
      .setName('Repository URL')
      .setDesc('HTTPS URL of your settings repository')
      .addText(text => text
        .setPlaceholder('https://github.com/user/obsidian-settings.git')
        .setValue(this.options.gitRepo)
        .onChange(value => {
          this.options.gitRepo = value;
        }));
  }

  private renderProfileStep(container: HTMLElement) {
    container.createEl('h3', { text: 'Select Profile' });
    container.createEl('p', { text: 'Choose a settings profile to apply, or use the default settings.' });

    // This would fetch available profiles from the repository
    new Setting(container)
      .setName('Profile')
      .setDesc('Select a profile or use default')
      .addDropdown(dropdown => {
        dropdown.addOption('', 'Default (no profile)');
        // In real implementation, fetch profiles from repo
        dropdown.addOption('work', 'Work Environment');
        dropdown.addOption('personal', 'Personal Setup');
        dropdown.setValue(this.options.profile || '')
          .onChange(value => {
            this.options.profile = value || undefined;
          });
      });
  }

  private renderOptionsStep(container: HTMLElement) {
    container.createEl('h3', { text: 'Initialization Options' });
    container.createEl('p', { text: 'Choose which settings to apply to your vault.' });

    new Setting(container)
      .setName('Install community plugins')
      .setDesc('Automatically install all community plugins from the profile')
      .addToggle(toggle => toggle
        .setValue(this.options.installPlugins)
        .onChange(value => {
          this.options.installPlugins = value;
        }));

    new Setting(container)
      .setName('Apply theme')
      .setDesc('Apply the theme settings from the profile')
      .addToggle(toggle => toggle
        .setValue(this.options.applyTheme)
        .onChange(value => {
          this.options.applyTheme = value;
        }));

    new Setting(container)
      .setName('Apply hotkeys')
      .setDesc('Import hotkey configurations')
      .addToggle(toggle => toggle
        .setValue(this.options.applyHotkeys)
        .onChange(value => {
          this.options.applyHotkeys = value;
        }));

    new Setting(container)
      .setName('Apply CSS snippets')
      .setDesc('Copy CSS snippets to your vault')
      .addToggle(toggle => toggle
        .setValue(this.options.applySnippets)
        .onChange(value => {
          this.options.applySnippets = value;
        }));
  }

  private renderConfirmationStep(container: HTMLElement) {
    container.createEl('h3', { text: 'Confirm Initialization' });
    container.createEl('p', { text: 'Review your settings before initializing.' });

    const summaryEl = container.createDiv('init-summary');
    
    summaryEl.createEl('h4', { text: 'Summary:' });
    const list = summaryEl.createEl('ul');
    
    list.createEl('li', { text: `Repository: ${this.options.gitRepo}` });
    list.createEl('li', { text: `Profile: ${this.options.profile || 'Default'}` });
    
    if (this.options.installPlugins) {
      list.createEl('li', { text: '✓ Install community plugins' });
    }
    if (this.options.applyTheme) {
      list.createEl('li', { text: '✓ Apply theme settings' });
    }
    if (this.options.applyHotkeys) {
      list.createEl('li', { text: '✓ Import hotkeys' });
    }
    if (this.options.applySnippets) {
      list.createEl('li', { text: '✓ Copy CSS snippets' });
    }

    container.createDiv('warning').createEl('p', {
      text: '⚠️ This will overwrite existing settings. Make sure you have a backup!',
      cls: 'mod-warning'
    });
  }

  private validateStep(): boolean {
    switch (this.step) {
      case 1:
        if (!this.options.gitRepo) {
          new Notice('Please enter a repository URL');
          return false;
        }
        if (!this.options.gitRepo.startsWith('http')) {
          new Notice('Please enter a valid HTTPS URL');
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  private async initialize() {
    const progressModal = new ProgressModal(this.app);
    progressModal.open();

    try {
      // Update plugin settings
      this.plugin.settings.gitRepo = this.options.gitRepo;
      await this.plugin.saveSettings();

      // Clone repository
      progressModal.setProgress('Cloning repository...', 20);
      await this.plugin.gitManager.cloneRepository(this.options.gitRepo);

      // Import settings
      progressModal.setProgress('Importing settings...', 40);
      await this.plugin.syncManager.importSettings();

      // Apply profile if selected
      if (this.options.profile) {
        progressModal.setProgress('Applying profile...', 60);
        // In real implementation, fetch and apply the selected profile
      }

      // Install plugins
      if (this.options.installPlugins) {
        progressModal.setProgress('Installing plugins...', 80);
        await this.installCommunityPlugins();
      }

      // Apply additional settings
      if (this.options.applySnippets) {
        progressModal.setProgress('Copying CSS snippets...', 90);
        await this.copySnippets();
      }

      progressModal.setProgress('Initialization complete!', 100);
      
      setTimeout(() => {
        progressModal.close();
        this.close();
        new Notice('Vault initialized successfully! Please reload Obsidian to apply all changes.');
      }, 1000);

    } catch (error) {
      progressModal.close();
      new Notice(`Initialization failed: ${error.message}`);
      console.error('Init wizard error:', error);
    }
  }

  private async installCommunityPlugins() {
    // This would automate plugin installation
    // In practice, this might require using Obsidian's internal APIs
    // or prompting the user to install plugins manually
    
    const settings = await this.plugin.settingsParser.parseAllSettings();
    const plugins = settings.community || [];
    
    if (plugins.length > 0) {
      console.log('Plugins to install:', plugins);
      // Implementation would go here
    }
  }

  private async copySnippets() {
    // Copy CSS snippets from repository to vault
    const snippetsDir = `${this.app.vault.configDir}/snippets`;
    
    // Ensure snippets directory exists
    if (!await this.app.vault.adapter.exists(snippetsDir)) {
      await this.app.vault.adapter.mkdir(snippetsDir);
    }

    // In real implementation, copy snippet files from git repo
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .wizard-progress {
        text-align: center;
        margin-bottom: 20px;
        color: var(--text-muted);
      }
      
      .wizard-content {
        margin: 20px 0;
        min-height: 200px;
      }
      
      .wizard-nav {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--background-modifier-border);
      }
      
      .init-summary {
        background-color: var(--background-secondary);
        padding: 15px;
        border-radius: 5px;
        margin: 10px 0;
      }
      
      .init-summary h4 {
        margin-top: 0;
      }
      
      .mod-warning {
        color: var(--text-error);
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }
}

class ProgressModal extends Modal {
  private progressEl: HTMLElement;
  private messageEl: HTMLElement;

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Initializing Vault' });
    
    this.messageEl = contentEl.createEl('p', { text: 'Starting initialization...' });
    
    const progressContainer = contentEl.createDiv('progress-container');
    this.progressEl = progressContainer.createDiv('progress-bar');
    
    const style = document.createElement('style');
    style.textContent = `
      .progress-container {
        width: 100%;
        height: 20px;
        background-color: var(--background-modifier-border);
        border-radius: 10px;
        overflow: hidden;
        margin: 20px 0;
      }
      
      .progress-bar {
        height: 100%;
        background-color: var(--interactive-accent);
        width: 0%;
        transition: width 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }

  setProgress(message: string, percent: number) {
    this.messageEl.setText(message);
    this.progressEl.style.width = `${percent}%`;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}