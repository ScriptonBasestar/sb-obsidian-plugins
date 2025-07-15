import {
  App,
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
  
  // LLM settings (for future commit message generation)
  enableAICommitMessages: boolean;
  llmProvider: 'none' | 'openai' | 'anthropic';
  apiKey: string;
  commitPrompt: string;
  
  // Auto pull settings
  enableAutoPull: boolean;
  pullOnStartup: boolean;
  
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
  
  // Auto pull settings
  enableAutoPull: false,
  pullOnStartup: true,
  
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

    // Add settings tab
    this.addSettingTab(new GitSyncSettingTab(this.app, this));

    // Auto pull on startup if enabled
    if (this.settings.enableAutoPull && this.settings.pullOnStartup) {
      this.performAutoPull();
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
      .setName('Pull on Startup')
      .setDesc('Automatically pull latest changes when Obsidian starts')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.pullOnStartup)
        .onChange(async (value) => {
          this.plugin.settings.pullOnStartup = value;
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
      .setName('Commit Prompt')
      .setDesc('Custom prompt for commit message generation')
      .addTextArea(text => text
        .setPlaceholder('Generate a concise commit message for these changes:')
        .setValue(this.plugin.settings.commitPrompt)
        .onChange(async (value) => {
          this.plugin.settings.commitPrompt = value;
          await this.plugin.saveSettings();
        }));
  }
}