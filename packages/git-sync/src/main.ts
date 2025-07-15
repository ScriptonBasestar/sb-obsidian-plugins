import { App, Notice, Plugin, TFile } from 'obsidian';
import { GitService } from './git-service';
import { AutoCommitService } from './auto-commit-service';
import { ExtendedFileSystemAdapter } from './types';
import { GitSyncSettings, DEFAULT_SETTINGS } from './settings';
import { GitSyncSettingTab } from './settings-tab';
import { registerCommands } from './commands';
import { PromptPreviewModal } from './modals';
import { LLMService } from './llm-service';

export class GitSyncPlugin extends Plugin {
  settings: GitSyncSettings;
  gitService: GitService;
  autoCommitService: AutoCommitService;
  llmService: LLMService;
  private statusBarItem: HTMLElement;

  async onload() {
    await this.loadSettings();

    // Initialize services
    this.gitService = new GitService((this.app.vault.adapter as ExtendedFileSystemAdapter).basePath || '');
    this.autoCommitService = new AutoCommitService(this.gitService, this.settings, this.app.vault);
    this.llmService = new LLMService({
      provider: this.settings.llmProvider,
      apiKey: this.settings.apiKey,
      commitPrompt: this.settings.commitPrompt,
      enabled: this.settings.enableAICommitMessages,
      useTemplateEngine: this.settings.useTemplateEngine,
      selectedTemplate: this.settings.selectedTemplate,
    });

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar('Git Sync Ready');

    // Register commands
    registerCommands(this);

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
    
    // Update LLM service settings
    this.llmService.updateSettings({
      provider: this.settings.llmProvider,
      apiKey: this.settings.apiKey,
      commitPrompt: this.settings.commitPrompt,
      enabled: this.settings.enableAICommitMessages,
      useTemplateEngine: this.settings.useTemplateEngine,
      selectedTemplate: this.settings.selectedTemplate,
    });
  }

  private scheduleStartupPull() {
    setTimeout(() => {
      this.performStartupPull();
    }, this.settings.pullOnStartupDelay);
  }

  private async performStartupPull() {
    try {
      const result = await this.gitService.pull();
      if (result.success) {
        if (!this.settings.pullOnStartupSilent) {
          new Notice('Git pull successful on startup');
        }
      } else {
        if (!this.settings.pullOnStartupSilent || result.error !== 'Already up to date') {
          new Notice(`Git pull on startup: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Startup pull error:', error);
      if (!this.settings.pullOnStartupSilent) {
        new Notice(`Startup pull failed: ${error.message}`);
      }
    }
  }

  private updateStatusBar(text: string) {
    this.statusBarItem.setText(`Git: ${text}`);
  }

  async manualCommit() {
    try {
      this.updateStatusBar('Committing...');
      const result = await this.autoCommitService.performCommit();
      
      if (result.success) {
        new Notice(`Committed: ${result.message}`);
        this.updateStatusBar('Ready');
      } else {
        new Notice(`Commit failed: ${result.error}`);
        this.updateStatusBar('Failed');
      }
    } catch (error) {
      console.error('Manual commit error:', error);
      new Notice(`Commit error: ${error.message}`);
      this.updateStatusBar('Error');
    }
  }

  async manualPush() {
    try {
      this.updateStatusBar('Pushing...');
      const result = await this.gitService.push();
      
      if (result.success) {
        new Notice('Push successful');
        this.updateStatusBar('Ready');
      } else {
        new Notice(`Push failed: ${result.error}`);
        this.updateStatusBar('Failed');
      }
    } catch (error) {
      console.error('Manual push error:', error);
      new Notice(`Push error: ${error.message}`);
      this.updateStatusBar('Error');
    }
  }

  async manualPull() {
    try {
      this.updateStatusBar('Pulling...');
      const result = await this.gitService.pull();
      
      if (result.success) {
        new Notice('Pull successful');
        this.updateStatusBar('Ready');
      } else {
        new Notice(`Pull failed: ${result.error}`);
        this.updateStatusBar('Failed');
      }
    } catch (error) {
      console.error('Manual pull error:', error);
      new Notice(`Pull error: ${error.message}`);
      this.updateStatusBar('Error');
    }
  }

  private async executePullAndResolveConflicts() {
    try {
      // Try to pull
      const pullResult = await this.gitService.pull();
      
      if (!pullResult.success) {
        // Check if it's a conflict
        if (pullResult.error?.includes('conflict') || pullResult.error?.includes('CONFLICT')) {
          new Notice('Merge conflicts detected. Opening external editor...');
          
          if (this.settings.openEditorOnConflict) {
            this.openExternalEditor();
          }
          
          // Show conflict resolution instructions
          new Notice(
            'Please resolve conflicts manually and commit the changes',
            10000
          );
          
          return false;
        }
        
        throw new Error(pullResult.error || 'Pull failed');
      }
      
      return true;
    } catch (error) {
      console.error('Pull error:', error);
      new Notice(`Pull failed: ${error.message}`);
      return false;
    }
  }

  private openExternalEditor() {
    try {
      // Use Node.js child_process to execute external command
      const { exec } = require('child_process');
      exec(this.settings.editorCommand, { cwd: (this.app.vault.adapter as ExtendedFileSystemAdapter).basePath || '' });
    } catch (error) {
      console.error('Failed to open external editor:', error);
      new Notice('Failed to open external editor');
    }
  }

  async performAutoMerge() {
    try {
      this.updateStatusBar('Auto-merging...');
      
      // Switch to main branch
      const switchResult = await this.gitService.checkout(this.settings.mainBranch);
      if (!switchResult.success) {
        throw new Error(`Failed to switch to ${this.settings.mainBranch}: ${switchResult.error}`);
      }
      
      // Merge temp branch
      const mergeResult = await this.gitService.merge(
        this.settings.tempBranch,
        this.settings.mergeStrategy
      );
      
      if (!mergeResult.success) {
        throw new Error(`Merge failed: ${mergeResult.error}`);
      }
      
      new Notice('Auto-merge completed successfully');
      this.updateStatusBar('Ready');
      
      // Push if auto-push is enabled
      if (this.settings.enableAutoPush) {
        await this.manualPush();
      }
    } catch (error) {
      console.error('Auto-merge error:', error);
      new Notice(`Auto-merge failed: ${error.message}`);
      this.updateStatusBar('Merge failed');
    }
  }

  async switchToTempBranch() {
    try {
      this.updateStatusBar('Switching branch...');
      const result = await this.gitService.checkout(this.settings.tempBranch);
      
      if (result.success) {
        new Notice(`Switched to ${this.settings.tempBranch} branch`);
        this.updateStatusBar('Ready');
      } else {
        new Notice(`Failed to switch branch: ${result.error}`);
        this.updateStatusBar('Failed');
      }
    } catch (error) {
      console.error('Switch branch error:', error);
      new Notice(`Switch branch error: ${error.message}`);
      this.updateStatusBar('Error');
    }
  }

  async mergeTempToMain() {
    try {
      this.updateStatusBar('Merging...');
      
      // First switch to main branch
      const checkoutResult = await this.gitService.checkout(this.settings.mainBranch);
      if (!checkoutResult.success) {
        new Notice(`Failed to switch to ${this.settings.mainBranch}: ${checkoutResult.error}`);
        this.updateStatusBar('Failed');
        return;
      }
      
      // Then merge temp branch
      const mergeResult = await this.gitService.merge(this.settings.tempBranch, this.settings.mergeStrategy);
      if (mergeResult.success) {
        new Notice(`Merged ${this.settings.tempBranch} into ${this.settings.mainBranch}`);
        this.updateStatusBar('Ready');
      } else {
        new Notice(`Merge failed: ${mergeResult.error}`);
        this.updateStatusBar('Failed');
      }
    } catch (error) {
      console.error('Merge error:', error);
      new Notice(`Merge error: ${error.message}`);
      this.updateStatusBar('Merge error');
    }
  }

  toggleAutoCommit() {
    this.settings.enableAutoCommit = !this.settings.enableAutoCommit;
    this.saveSettings();

    const status = this.settings.enableAutoCommit ? 'enabled' : 'disabled';
    new Notice(`Auto-commit ${status}`);

    if (this.settings.enableAutoCommit) {
      this.autoCommitService.start();
    } else {
      this.autoCommitService.stop();
    }
  }

  startAutoCommit() {
    if (!this.settings.enableAutoCommit) {
      this.settings.enableAutoCommit = true;
      this.saveSettings();
    }
    this.autoCommitService.start();
  }

  stopAutoCommit() {
    if (this.settings.enableAutoCommit) {
      this.settings.enableAutoCommit = false;
      this.saveSettings();
    }
    this.autoCommitService.stop();
  }

  async testLLMConnection() {
    try {
      this.updateStatusBar('Testing LLM...');
      const result = await this.llmService.testConnection();
      
      if (result.success) {
        new Notice('LLM connection successful!');
        this.updateStatusBar('Ready');
      } else {
        new Notice(`LLM connection failed: ${result.error}`);
        this.updateStatusBar('Failed');
      }
    } catch (error) {
      console.error('LLM test error:', error);
      new Notice(`LLM test error: ${error.message}`);
      this.updateStatusBar('Error');
    }
  }

  async generateAICommitMessage() {
    try {
      this.updateStatusBar('Generating...');
      
      // Get current git status and diff
      const status = await this.gitService.status();
      if (!status.hasChanges) {
        new Notice('No changes to commit');
        this.updateStatusBar('Ready');
        return;
      }

      const diff = await this.gitService.diff();
      const context = {
        files: {
          staged: status.staged || [],
          unstaged: status.modified || [],
          untracked: status.untracked || [],
        },
        diff: diff.output,
        branch: await this.gitService.getCurrentBranch(),
      };

      const result = await this.llmService.generateCommitMessage(context);
      
      if (result.success && result.message) {
        // Show the generated message in a modal for review
        new Notice(`Generated: ${result.message}`);
        
        // Optionally copy to clipboard
        await navigator.clipboard.writeText(result.message);
        new Notice('Commit message copied to clipboard');
        
        this.updateStatusBar('Ready');
      } else {
        new Notice(`Generation failed: ${result.error}`);
        this.updateStatusBar('Failed');
      }
    } catch (error) {
      console.error('Generate commit message error:', error);
      new Notice(`Generation error: ${error.message}`);
      this.updateStatusBar('Error');
    }
  }

  async previewPrompt() {
    try {
      // Get current git status for preview
      const status = await this.gitService.status();
      const diff = await this.gitService.diff();
      
      const context = {
        files: {
          staged: status.staged || [],
          unstaged: status.modified || [],
          untracked: status.untracked || [],
        },
        diff: diff.output?.substring(0, 500) + '...', // Truncate for preview
        branch: await this.gitService.getCurrentBranch(),
      };

      const preview = this.llmService.previewPrompt(context);
      new PromptPreviewModal(this.app, preview).open();
    } catch (error) {
      console.error('Preview prompt error:', error);
      new Notice(`Preview error: ${error.message}`);
    }
  }

  async testStartupPull() {
    new Notice('Testing startup pull in 3 seconds...');
    this.settings.pullOnStartupSilent = false; // Temporarily disable silent mode
    
    setTimeout(() => {
      this.performStartupPull();
    }, 3000);
  }

  async testAutoMerge() {
    try {
      new Notice('Testing auto-merge safety checks...');
      
      // Get current status
      const status = await this.gitService.status();
      const currentBranch = await this.gitService.getCurrentBranch();
      
      // Run safety checks
      const safetyCheck = await this.autoCommitService.checkAutoMergeSafety();
      console.log('Auto-merge safety check:', safetyCheck);
      
      if (!safetyCheck.safe) {
        new Notice(`Cannot auto merge: ${safetyCheck.reason}`);
        return;
      }
      
      // Trigger the auto-merge via auto-commit service
      await this.autoCommitService.performManualAutoMerge();
      new Notice('Auto merge test completed - check console for details');
    } catch (error) {
      console.error('Test auto merge error:', error);
      new Notice(`Auto merge test failed: ${error.message}`);
    }
  }
}

export default GitSyncPlugin;