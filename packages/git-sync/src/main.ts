import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from 'obsidian';
import { GitService } from './git-service';
import { AutoCommitService } from './auto-commit-service';

interface GitSyncSettings {
  // Branch settings
  tempBranch: string;
  mainBranch: string;
  
  // Auto commit settings
  enableAutoCommit: boolean;
  commitIntervalMinutes: number;
  includeUntracked: boolean;
  
  // Auto push settings
  enableAutoPush: boolean;
  pushAfterCommits: number;
  
  // LLM settings
  enableAICommitMessages: boolean;
  llmProvider: 'none' | 'openai' | 'anthropic';
  apiKey: string;
  commitPrompt: string;
  useTemplateEngine: boolean;
  selectedTemplate: string;
  
  // Auto pull settings
  enableAutoPull: boolean;
  pullOnStartup: boolean;
  pullOnStartupDelay: number;
  pullOnStartupSilent: boolean;
  
  // Merge settings
  enableAutoMerge: boolean;
  mergeStrategy: 'merge' | 'rebase' | 'squash';
  
  // Conflict resolution
  openEditorOnConflict: boolean;
  editorCommand: string;
}

const DEFAULT_SETTINGS: GitSyncSettings = {
  // Branch settings
  tempBranch: 'tmp',
  mainBranch: 'main',
  
  // Auto commit settings
  enableAutoCommit: false,
  commitIntervalMinutes: 10,
  includeUntracked: true,
  
  // Auto push settings
  enableAutoPush: false,
  pushAfterCommits: 3,
  
  // LLM settings
  enableAICommitMessages: false,
  llmProvider: 'none',
  apiKey: '',
  commitPrompt: 'Generate a concise commit message for these changes:',
  useTemplateEngine: false,
  selectedTemplate: 'conventional',
  
  // Auto pull settings
  enableAutoPull: true,
  pullOnStartup: true,
  pullOnStartupDelay: 2000,
  pullOnStartupSilent: false,
  
  // Merge settings
  enableAutoMerge: false,
  mergeStrategy: 'merge',
  
  // Conflict resolution
  openEditorOnConflict: true,
  editorCommand: 'code .',
};

export default class GitSyncPlugin extends Plugin {
  settings: GitSyncSettings;
  gitService: GitService;
  autoCommitService: AutoCommitService;
  private statusBarItem: HTMLElement;

  async onload() {
    await this.loadSettings();

    // Initialize services
    this.gitService = new GitService((this.app.vault.adapter as any).basePath || '');
    this.autoCommitService = new AutoCommitService(
      this.gitService, 
      this.settings,
      this.app.vault
    );

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar('Git Sync Ready');

    // Register commands
    this.addCommand({
      id: 'manual-commit',
      name: 'Manual Commit',
      callback: () => this.manualCommit(),
    });

    this.addCommand({
      id: 'manual-push',
      name: 'Manual Push',
      callback: () => this.manualPush(),
    });

    this.addCommand({
      id: 'manual-pull',
      name: 'Manual Pull',
      callback: () => this.manualPull(),
    });

    this.addCommand({
      id: 'switch-to-temp-branch',
      name: 'Switch to Temp Branch',
      callback: () => this.switchToTempBranch(),
    });

    this.addCommand({
      id: 'merge-temp-to-main',
      name: 'Merge Temp to Main',
      callback: () => this.mergeTempToMain(),
    });

    this.addCommand({
      id: 'toggle-auto-commit',
      name: 'Toggle Auto Commit',
      callback: () => this.toggleAutoCommit(),
    });

    this.addCommand({
      id: 'test-llm-connection',
      name: 'Test LLM API Connection',
      callback: () => this.testLLMConnection(),
    });

    this.addCommand({
      id: 'generate-ai-commit-message',
      name: 'Generate AI Commit Message',
      callback: () => this.generateAICommitMessage(),
    });

    this.addCommand({
      id: 'preview-prompt',
      name: 'Preview Commit Prompt',
      callback: () => this.previewPrompt(),
    });

    this.addCommand({
      id: 'test-startup-pull',
      name: 'Test Startup Pull',
      callback: () => this.testStartupPull(),
    });

    // Add settings tab
    this.addSettingTab(new GitSyncSettingTab(this.app, this));

    // Auto pull on startup if enabled
    if (this.settings.enableAutoPull && this.settings.pullOnStartup) {
      this.scheduleStartupPull();
    }

    // Start auto commit service if enabled
    if (this.settings.enableAutoCommit) {
      this.autoCommitService.start();
    }

    console.log('Git Sync plugin loaded');
  }

  onunload() {
    // Stop auto commit service
    this.autoCommitService?.stop();
    console.log('Git Sync plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update auto commit service settings
    if (this.autoCommitService) {
      this.autoCommitService.updateSettings(this.settings);
      
      if (this.settings.enableAutoCommit) {
        this.autoCommitService.start();
      } else {
        this.autoCommitService.stop();
      }
    }
  }

  private updateStatusBar(text: string) {
    this.statusBarItem.setText(`Git: ${text}`);
  }

  private async manualCommit() {
    try {
      this.updateStatusBar('Committing...');
      const result = await this.autoCommitService.performCommit();
      
      if (result.success) {
        new Notice(`Committed: ${result.message}`);
        this.updateStatusBar('Commit successful');
      } else {
        new Notice(`Commit failed: ${result.error}`);
        this.updateStatusBar('Commit failed');
      }
    } catch (error) {
      console.error('Manual commit error:', error);
      new Notice(`Commit error: ${error.message}`);
      this.updateStatusBar('Commit error');
    }
  }

  private async manualPush() {
    try {
      this.updateStatusBar('Pushing...');
      const result = await this.gitService.push();
      
      if (result.success) {
        new Notice('Push successful');
        this.updateStatusBar('Push successful');
      } else {
        new Notice(`Push failed: ${result.error}`);
        this.updateStatusBar('Push failed');
      }
    } catch (error) {
      console.error('Manual push error:', error);
      new Notice(`Push error: ${error.message}`);
      this.updateStatusBar('Push error');
    }
  }

  private async manualPull() {
    try {
      this.updateStatusBar('Pulling...');
      await this.performAutoPull();
    } catch (error) {
      console.error('Manual pull error:', error);
      new Notice(`Pull error: ${error.message}`);
      this.updateStatusBar('Pull error');
    }
  }

  private scheduleStartupPull() {
    setTimeout(async () => {
      await this.performStartupPull();
    }, this.settings.pullOnStartupDelay);
  }

  private async performStartupPull() {
    try {
      this.updateStatusBar('Auto-pulling on startup...');
      console.log('Git Sync: Starting automatic pull on startup');
      
      // Check if we're in a git repository
      const isGitRepo = await this.gitService.isGitRepository();
      if (!isGitRepo) {
        console.log('Git Sync: Not in a git repository, skipping startup pull');
        this.updateStatusBar('Not a git repository');
        return;
      }

      // Check if remote exists
      const hasRemote = await this.gitService.hasRemote();
      if (!hasRemote) {
        console.log('Git Sync: No remote configured, skipping startup pull');
        this.updateStatusBar('No remote configured');
        return;
      }

      const result = await this.gitService.pullRebase();
      
      if (result.success) {
        const message = 'Startup pull successful';
        console.log(`Git Sync: ${message}`);
        
        if (!this.settings.pullOnStartupSilent) {
          new Notice(message);
        }
        this.updateStatusBar('Startup pull successful');
      } else if (result.conflicts) {
        const message = 'Startup pull completed with conflicts - please resolve manually';
        console.warn(`Git Sync: ${message}`);
        new Notice(message);
        this.updateStatusBar('Startup conflicts detected');
        
        if (this.settings.openEditorOnConflict) {
          this.openExternalEditor();
        }
      } else {
        const message = `Startup pull failed: ${result.error}`;
        console.error(`Git Sync: ${message}`);
        
        if (!this.settings.pullOnStartupSilent) {
          new Notice(message);
        }
        this.updateStatusBar('Startup pull failed');
      }
    } catch (error) {
      console.error('Git Sync: Startup pull error:', error);
      
      if (!this.settings.pullOnStartupSilent) {
        new Notice(`Startup pull error: ${error.message}`);
      }
      this.updateStatusBar('Startup pull error');
    }
  }

  private async performAutoPull() {
    try {
      const result = await this.gitService.pullRebase();
      
      if (result.success) {
        new Notice('Pull successful');
        this.updateStatusBar('Pull successful');
      } else if (result.conflicts) {
        new Notice('Pull completed with conflicts - please resolve manually');
        this.updateStatusBar('Conflicts detected');
        
        if (this.settings.openEditorOnConflict) {
          this.openExternalEditor();
        }
      } else {
        new Notice(`Pull failed: ${result.error}`);
        this.updateStatusBar('Pull failed');
      }
    } catch (error) {
      console.error('Auto pull error:', error);
      new Notice(`Pull error: ${error.message}`);
      this.updateStatusBar('Pull error');
    }
  }

  private async switchToTempBranch() {
    try {
      this.updateStatusBar('Switching branch...');
      const result = await this.gitService.switchBranch(this.settings.tempBranch);
      
      if (result.success) {
        new Notice(`Switched to ${this.settings.tempBranch} branch`);
        this.updateStatusBar(`On ${this.settings.tempBranch}`);
      } else {
        new Notice(`Failed to switch branch: ${result.error}`);
        this.updateStatusBar('Branch switch failed');
      }
    } catch (error) {
      console.error('Switch branch error:', error);
      new Notice(`Branch switch error: ${error.message}`);
      this.updateStatusBar('Branch switch error');
    }
  }

  private async mergeTempToMain() {
    try {
      this.updateStatusBar('Merging...');
      const result = await this.gitService.mergeBranches(
        this.settings.tempBranch,
        this.settings.mainBranch,
        this.settings.mergeStrategy
      );
      
      if (result.success) {
        new Notice(`Merged ${this.settings.tempBranch} to ${this.settings.mainBranch}`);
        this.updateStatusBar('Merge successful');
      } else if (result.conflicts) {
        new Notice('Merge completed with conflicts - please resolve manually');
        this.updateStatusBar('Merge conflicts');
        
        if (this.settings.openEditorOnConflict) {
          this.openExternalEditor();
        }
      } else {
        new Notice(`Merge failed: ${result.error}`);
        this.updateStatusBar('Merge failed');
      }
    } catch (error) {
      console.error('Merge error:', error);
      new Notice(`Merge error: ${error.message}`);
      this.updateStatusBar('Merge error');
    }
  }

  private toggleAutoCommit() {
    this.settings.enableAutoCommit = !this.settings.enableAutoCommit;
    this.saveSettings();
    
    const status = this.settings.enableAutoCommit ? 'enabled' : 'disabled';
    new Notice(`Auto commit ${status}`);
    this.updateStatusBar(`Auto commit ${status}`);
  }

  private openExternalEditor() {
    try {
      // Use Node.js child_process to execute external command
      const { exec } = require('child_process');
      exec(this.settings.editorCommand, { cwd: (this.app.vault.adapter as any).basePath || '' });
    } catch (error) {
      console.error('Failed to open external editor:', error);
      new Notice('Failed to open external editor');
    }
  }

  private async testLLMConnection() {
    try {
      this.updateStatusBar('Testing LLM...');
      const result = await this.autoCommitService.testLLMConnection();
      
      if (result.success) {
        new Notice('LLM API connection successful');
        this.updateStatusBar('LLM test successful');
      } else {
        new Notice(`LLM API test failed: ${result.error}`);
        this.updateStatusBar('LLM test failed');
      }
    } catch (error) {
      console.error('LLM connection test error:', error);
      new Notice(`LLM test error: ${error.message}`);
      this.updateStatusBar('LLM test error');
    }
  }

  private async generateAICommitMessage() {
    try {
      this.updateStatusBar('Generating AI commit...');
      
      // Check if there are changes
      const status = await this.gitService.getStatus();
      if (!status.hasChanges) {
        new Notice('No changes to commit');
        this.updateStatusBar('No changes');
        return;
      }

      // Check if LLM is enabled
      if (!this.settings.enableAICommitMessages) {
        new Notice('AI commit messages are disabled. Enable in settings first.');
        this.updateStatusBar('AI commits disabled');
        return;
      }

      // Generate and show commit message
      const result = await this.autoCommitService.performCommit();
      
      if (result.success) {
        new Notice(`AI commit successful: ${result.message || 'Committed'}`);
        this.updateStatusBar('AI commit successful');
      } else {
        new Notice(`AI commit failed: ${result.error}`);
        this.updateStatusBar('AI commit failed');
      }
    } catch (error) {
      console.error('AI commit generation error:', error);
      new Notice(`AI commit error: ${error.message}`);
      this.updateStatusBar('AI commit error');
    }
  }

  private async previewPrompt() {
    try {
      this.updateStatusBar('Generating prompt preview...');
      
      // Check if there are changes
      const status = await this.gitService.getStatus();
      if (!status.hasChanges) {
        new Notice('No changes to preview');
        this.updateStatusBar('No changes');
        return;
      }

      // Generate prompt preview
      const preview = await this.autoCommitService.previewPromptWithCurrentChanges();
      
      // Create modal to show preview
      const modal = new PromptPreviewModal(this.app, preview);
      modal.open();
      
      this.updateStatusBar('Prompt preview generated');
    } catch (error) {
      console.error('Prompt preview error:', error);
      new Notice(`Preview error: ${error.message}`);
      this.updateStatusBar('Preview error');
    }
  }

  private async testStartupPull() {
    try {
      new Notice('Testing startup pull functionality...');
      await this.performStartupPull();
    } catch (error) {
      console.error('Test startup pull error:', error);
      new Notice(`Test failed: ${error.message}`);
    }
  }
}

class PromptPreviewModal extends Modal {
  private content: string;

  constructor(app: App, content: string) {
    super(app);
    this.content = content;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Commit Prompt Preview' });
    
    const previewContainer = contentEl.createEl('div', { 
      cls: 'prompt-preview-container',
      attr: { style: 'margin: 20px 0;' }
    });
    
    const previewEl = previewContainer.createEl('pre', { 
      text: this.content,
      attr: { 
        style: 'background: var(--background-secondary); padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: var(--font-monospace); max-height: 400px; overflow-y: auto;'
      }
    });

    const buttonContainer = contentEl.createEl('div', {
      attr: { style: 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;' }
    });

    const copyButton = buttonContainer.createEl('button', { text: 'Copy to Clipboard' });
    copyButton.onclick = () => {
      navigator.clipboard.writeText(this.content);
      new Notice('Prompt copied to clipboard');
    };

    const closeButton = buttonContainer.createEl('button', { text: 'Close' });
    closeButton.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class TemplateHelpModal extends Modal {
  private helpContent: string;

  constructor(app: App, helpContent: string) {
    super(app);
    this.helpContent = helpContent;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Template Variables & Syntax Help' });
    
    const helpContainer = contentEl.createEl('div', { 
      attr: { style: 'margin: 20px 0;' }
    });
    
    const helpEl = helpContainer.createEl('pre', { 
      text: this.helpContent,
      attr: { 
        style: 'background: var(--background-secondary); padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: var(--font-monospace); max-height: 500px; overflow-y: auto; line-height: 1.5;'
      }
    });

    const buttonContainer = contentEl.createEl('div', {
      attr: { style: 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;' }
    });

    const copyButton = buttonContainer.createEl('button', { text: 'Copy Help Text' });
    copyButton.onclick = () => {
      navigator.clipboard.writeText(this.helpContent);
      new Notice('Help text copied to clipboard');
    };

    const closeButton = buttonContainer.createEl('button', { text: 'Close' });
    closeButton.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class GitSyncSettingTab extends PluginSettingTab {
  plugin: GitSyncPlugin;

  constructor(app: App, plugin: GitSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Git Sync Settings' });

    // Branch Settings
    containerEl.createEl('h3', { text: 'Branch Settings' });

    new Setting(containerEl)
      .setName('Temp Branch Name')
      .setDesc('Name of the temporary branch for auto commits')
      .addText(text => text
        .setPlaceholder('tmp')
        .setValue(this.plugin.settings.tempBranch)
        .onChange(async (value) => {
          this.plugin.settings.tempBranch = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Main Branch Name')
      .setDesc('Name of the main branch to merge into')
      .addText(text => text
        .setPlaceholder('main')
        .setValue(this.plugin.settings.mainBranch)
        .onChange(async (value) => {
          this.plugin.settings.mainBranch = value;
          await this.plugin.saveSettings();
        }));

    // Auto Commit Settings
    containerEl.createEl('h3', { text: 'Auto Commit Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Commit')
      .setDesc('Automatically commit changes at regular intervals')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableAutoCommit)
        .onChange(async (value) => {
          this.plugin.settings.enableAutoCommit = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Commit Interval (minutes)')
      .setDesc('How often to commit changes')
      .addSlider(slider => slider
        .setLimits(1, 60, 1)
        .setValue(this.plugin.settings.commitIntervalMinutes)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.commitIntervalMinutes = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Include Untracked Files')
      .setDesc('Include new files in auto commits')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.includeUntracked)
        .onChange(async (value) => {
          this.plugin.settings.includeUntracked = value;
          await this.plugin.saveSettings();
        }));

    // Auto Push Settings
    containerEl.createEl('h3', { text: 'Auto Push Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Push')
      .setDesc('Automatically push commits to remote')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableAutoPush)
        .onChange(async (value) => {
          this.plugin.settings.enableAutoPush = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Push After Commits')
      .setDesc('Number of commits before auto pushing')
      .addSlider(slider => slider
        .setLimits(1, 10, 1)
        .setValue(this.plugin.settings.pushAfterCommits)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.pushAfterCommits = value;
          await this.plugin.saveSettings();
        }));

    // Auto Pull Settings
    containerEl.createEl('h3', { text: 'Auto Pull Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Pull')
      .setDesc('Enable automatic pulling of remote changes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableAutoPull)
        .onChange(async (value) => {
          this.plugin.settings.enableAutoPull = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Pull on Startup')
      .setDesc('Automatically pull latest changes when Obsidian starts')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.pullOnStartup)
        .onChange(async (value) => {
          this.plugin.settings.pullOnStartup = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Startup Pull Delay')
      .setDesc('Delay in milliseconds before pulling on startup (allows plugin to fully load)')
      .addSlider(slider => slider
        .setLimits(500, 10000, 500)
        .setValue(this.plugin.settings.pullOnStartupDelay)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.pullOnStartupDelay = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Silent Startup Pull')
      .setDesc('Suppress notifications for successful startup pulls')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.pullOnStartupSilent)
        .onChange(async (value) => {
          this.plugin.settings.pullOnStartupSilent = value;
          await this.plugin.saveSettings();
        }));

    // Merge Settings
    containerEl.createEl('h3', { text: 'Merge Settings' });

    new Setting(containerEl)
      .setName('Merge Strategy')
      .setDesc('How to merge temp branch into main')
      .addDropdown(dropdown => dropdown
        .addOption('merge', 'Merge')
        .addOption('rebase', 'Rebase')
        .addOption('squash', 'Squash')
        .setValue(this.plugin.settings.mergeStrategy)
        .onChange(async (value: 'merge' | 'rebase' | 'squash') => {
          this.plugin.settings.mergeStrategy = value;
          await this.plugin.saveSettings();
        }));

    // Conflict Resolution
    containerEl.createEl('h3', { text: 'Conflict Resolution' });

    new Setting(containerEl)
      .setName('Open Editor on Conflict')
      .setDesc('Open external editor when conflicts are detected')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.openEditorOnConflict)
        .onChange(async (value) => {
          this.plugin.settings.openEditorOnConflict = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Editor Command')
      .setDesc('Command to open external editor')
      .addText(text => text
        .setPlaceholder('code .')
        .setValue(this.plugin.settings.editorCommand)
        .onChange(async (value) => {
          this.plugin.settings.editorCommand = value;
          await this.plugin.saveSettings();
        }));

    // AI Commit Messages
    containerEl.createEl('h3', { text: 'AI Commit Messages' });

    new Setting(containerEl)
      .setName('Enable AI Commit Messages')
      .setDesc('Use AI to generate commit messages based on changes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableAICommitMessages)
        .onChange(async (value) => {
          this.plugin.settings.enableAICommitMessages = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('Choose your AI provider')
      .addDropdown(dropdown => dropdown
        .addOption('none', 'None')
        .addOption('openai', 'OpenAI GPT')
        .addOption('anthropic', 'Anthropic Claude')
        .setValue(this.plugin.settings.llmProvider)
        .onChange(async (value: 'openai' | 'anthropic' | 'none') => {
          this.plugin.settings.llmProvider = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your LLM API key (stored locally)')
      .addText(text => text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setButtonText('Test Connection')
        .setTooltip('Test API connection')
        .onClick(async () => {
          const result = await this.plugin.autoCommitService.testLLMConnection();
          if (result.success) {
            new Notice('API connection successful!');
          } else {
            new Notice(`API test failed: ${result.error}`);
          }
        }));

    new Setting(containerEl)
      .setName('Use Template Engine')
      .setDesc('Enable advanced prompt templating with variables and conditional blocks')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useTemplateEngine)
        .onChange(async (value) => {
          this.plugin.settings.useTemplateEngine = value;
          await this.plugin.saveSettings();
        }));

    if (this.plugin.settings.useTemplateEngine) {
      new Setting(containerEl)
        .setName('Template Preset')
        .setDesc('Choose a predefined prompt template')
        .addDropdown(dropdown => {
          const templates = this.plugin.autoCommitService.getAvailablePromptTemplates();
          dropdown.addOption('custom', 'Custom Template');
          templates.forEach(template => {
            dropdown.addOption(template.id, template.name);
          });
          dropdown.setValue(this.plugin.settings.selectedTemplate || 'conventional');
          dropdown.onChange(async (value) => {
            this.plugin.settings.selectedTemplate = value;
            await this.plugin.saveSettings();
          });
        });

      // Template help
      const helpContainer = containerEl.createEl('div', {
        attr: { style: 'margin: 10px 0; padding: 10px; background: var(--background-secondary); border-radius: 6px;' }
      });
      
      const helpToggle = new Setting(helpContainer)
        .setName('Template Variables Help')
        .setDesc('Click to show available template variables and syntax')
        .addButton(button => button
          .setButtonText('Show Help')
          .onClick(() => {
            const helpModal = new TemplateHelpModal(this.app, this.plugin.autoCommitService.getTemplateHelp());
            helpModal.open();
          }));

      new Setting(containerEl)
        .setName('Preview Template')
        .setDesc('Preview how your template will look with current changes')
        .addButton(button => button
          .setButtonText('Preview')
          .onClick(async () => {
            try {
              const preview = await this.plugin.autoCommitService.previewPromptWithCurrentChanges();
              const modal = new PromptPreviewModal(this.app, preview);
              modal.open();
            } catch (error) {
              new Notice(`Preview error: ${error.message}`);
            }
          }));
    }

    new Setting(containerEl)
      .setName('Custom Prompt Template')
      .setDesc(this.plugin.settings.useTemplateEngine 
        ? 'Enter your custom template with variables like {{files.total}}, {{branch}}, etc.'
        : 'Custom prompt for commit message generation (basic mode)')
      .addTextArea(text => {
        text.setPlaceholder(this.plugin.settings.useTemplateEngine 
          ? 'Generate a commit message for {{files.total}} files on branch {{branch}}:\n{{#if files.staged}}\nStaged: {{files.staged}}\n{{/if}}'
          : 'Generate a concise commit message for these changes:');
        text.setValue(this.plugin.settings.commitPrompt);
        text.onChange(async (value) => {
          this.plugin.settings.commitPrompt = value;
          
          // Validate template if template engine is enabled
          if (this.plugin.settings.useTemplateEngine) {
            const validation = this.plugin.autoCommitService.validatePromptTemplate(value);
            if (!validation.valid) {
              new Notice(`Template validation errors: ${validation.errors.join(', ')}`);
            }
          }
          
          await this.plugin.saveSettings();
        });
      });
  }
}