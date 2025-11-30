import { Vault, TFile, TFolder, Notice } from 'obsidian';
import { hostname } from 'os';

import { GitService } from '../core/git-service';
import { ScriptonSyncSettings, GitResult, BranchConfig } from '../types';

import { BranchStrategyManager } from './branch-strategy';
import { LLMService } from './llm-service';

export interface CommitResult {
  success: boolean;
  message?: string;
  error?: string;
  filesChanged?: number;
  hash?: string;
}

export interface CommitContext {
  files: string[];
  stats: {
    additions: number;
    deletions: number;
    files: number;
  };
  diffs?: string;
}

export class AutoCommitService {
  private gitService: GitService;
  private settings: ScriptonSyncSettings;
  private vault: Vault;
  private llmService: LLMService | null = null;
  private branchManager: BranchStrategyManager;
  private intervalId: NodeJS.Timeout | null = null;
  private commitCount = 0;
  private lastCommitTime = 0;

  constructor(
    gitService: GitService,
    settings: ScriptonSyncSettings,
    vault: Vault,
    branchManager: BranchStrategyManager
  ) {
    this.gitService = gitService;
    this.settings = settings;
    this.vault = vault;
    this.branchManager = branchManager;

    if (settings.enableAICommitMessages && settings.llmProvider !== 'none') {
      this.llmService = new LLMService({
        provider: settings.llmProvider,
        apiKey: settings.apiKey,
        commitPrompt: settings.commitPrompt,
        enabled: settings.enableAICommitMessages,
        useTemplateEngine: settings.useTemplateEngine || false,
        selectedTemplate: settings.selectedTemplate || 'conventional',
      });
    }
  }

  /**
   * Start the auto commit service
   */
  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    if (!this.settings.enableAutoCommit) {
      return;
    }

    const intervalMs = this.settings.commitIntervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.performAutoCommit();
    }, intervalMs);

    console.warn(
      `Auto commit service started with ${this.settings.commitIntervalMinutes} minute interval`
    );
  }

  /**
   * Stop the auto commit service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.warn('Auto commit service stopped');
    }
  }

  /**
   * Update settings and restart if needed
   */
  updateSettings(settings: ScriptonSyncSettings): void {
    this.settings = settings;

    // Update LLM service if needed
    if (settings.enableAICommitMessages && settings.llmProvider !== 'none') {
      if (!this.llmService) {
        this.llmService = new LLMService({
          provider: settings.llmProvider,
          apiKey: settings.apiKey,
          commitPrompt: settings.commitPrompt,
          enabled: settings.enableAICommitMessages,
          useTemplateEngine: settings.useTemplateEngine || false,
          selectedTemplate: settings.selectedTemplate || 'conventional',
        });
      } else {
        this.llmService.updateSettings({
          provider: settings.llmProvider,
          apiKey: settings.apiKey,
          commitPrompt: settings.commitPrompt,
          enabled: settings.enableAICommitMessages,
          useTemplateEngine: settings.useTemplateEngine || false,
          selectedTemplate: settings.selectedTemplate || 'conventional',
        });
      }
    } else {
      this.llmService = null;
    }

    // Restart if enabled state changed
    if (settings.enableAutoCommit && !this.intervalId) {
      this.start();
    } else if (!settings.enableAutoCommit && this.intervalId) {
      this.stop();
    }
  }

  /**
   * Perform an auto commit
   */
  async performAutoCommit(): Promise<CommitResult> {
    try {
      // Check git status
      const status = await this.gitService.getStatus();

      if (!status.hasChanges) {
        return {
          success: true,
          message: 'No changes to commit',
          filesChanged: 0,
        };
      }

      // Add files
      const addResult = await this.gitService.addFiles('.', this.settings.includeUntracked);
      if (!addResult.success) {
        return {
          success: false,
          error: `Failed to add files: ${addResult.error}`,
        };
      }

      // Generate commit message
      const commitMessage = await this.generateCommitMessage(status);

      // Commit changes
      const commitResult = await this.gitService.commit(commitMessage);
      if (!commitResult.success) {
        return {
          success: false,
          error: `Failed to commit: ${commitResult.error}`,
        };
      }

      this.commitCount++;
      this.lastCommitTime = Date.now();

      const result: CommitResult = {
        success: true,
        message: commitMessage,
        filesChanged: status.staged.length + status.unstaged.length + status.untracked.length,
        hash: commitResult.data?.hash,
      };

      new Notice(`Auto commit successful: ${result.filesChanged} files changed`);

      // Handle auto push if enabled
      if (this.settings.enableAutoPush && this.commitCount >= this.settings.pushAfterCommits) {
        await this.performAutoPush();
      }

      // Handle auto merge if enabled
      if (this.settings.enableAutoMerge) {
        await this.performAutoMerge();
      }

      return result;
    } catch (error) {
      console.error('Auto commit failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate commit message using LLM or default format
   */
  private async generateCommitMessage(status: any): Promise<string> {
    if (this.llmService && this.settings.enableAICommitMessages) {
      try {
        // Prepare commit context
        const context: CommitContext = {
          files: [...status.staged, ...status.unstaged, ...status.untracked],
          stats: {
            additions: 0, // Would need to parse git diff for accurate stats
            deletions: 0,
            files: status.staged.length + status.unstaged.length + status.untracked.length,
          },
        };

        const aiMessage = await this.llmService.generateCommitMessage(context);
        if (aiMessage) {
          return aiMessage;
        }
      } catch (error) {
        console.error('Failed to generate AI commit message:', error);
        // Fall back to default message
      }
    }

    // Default commit message
    const timestamp = new Date().toLocaleString();
    const fileCount = status.staged.length + status.unstaged.length + status.untracked.length;
    const currentHostname = hostname();

    return `Auto commit from ${currentHostname} - ${fileCount} files changed (${timestamp})`;
  }

  /**
   * Perform auto push
   */
  private async performAutoPush(): Promise<void> {
    try {
      const currentBranch = await this.gitService.getCurrentBranch();
      const pushResult = await this.gitService.push('origin', currentBranch, true);

      if (pushResult.success) {
        this.commitCount = 0; // Reset commit count after push
        new Notice('Auto push successful');
      } else {
        new Notice(`Auto push failed: ${pushResult.error}`);
      }
    } catch (error) {
      console.error('Auto push failed:', error);
      new Notice(`Auto push failed: ${error.message}`);
    }
  }

  /**
   * Perform auto merge to default branch
   */
  private async performAutoMerge(): Promise<void> {
    try {
      const branchConfig: BranchConfig = {
        strategy: this.settings.branchStrategy,
        defaultBranch: this.settings.defaultBranch,
        developPrefix: this.settings.tempBranchPrefix,
        featurePrefix: 'feature/',
        autoCreateHostBranch: true,
        autoMergeToDefault: this.settings.autoMergeToDefault,
        squashMerge: this.settings.mergeStrategy === 'squash',
      };

      const result = await this.branchManager.autoMergeIfNeeded(branchConfig);

      if (result.success && !result.data?.skipped) {
        new Notice('Auto merge to default branch successful');

        // Push the merged changes
        await this.gitService.push('origin', this.settings.defaultBranch);
      }
    } catch (error) {
      console.error('Auto merge failed:', error);
      new Notice(`Auto merge failed: ${error.message}`);
    }
  }

  /**
   * Get auto commit status
   */
  getStatus(): {
    enabled: boolean;
    lastCommit: number;
    commitCount: number;
    nextCommit: number | null;
  } {
    const now = Date.now();
    const intervalMs = this.settings.commitIntervalMinutes * 60 * 1000;
    const nextCommit =
      this.intervalId && this.lastCommitTime ? this.lastCommitTime + intervalMs : null;

    return {
      enabled: this.settings.enableAutoCommit,
      lastCommit: this.lastCommitTime,
      commitCount: this.commitCount,
      nextCommit,
    };
  }

  /**
   * Force a manual commit with auto-commit settings
   */
  async manualCommit(): Promise<CommitResult> {
    return this.performAutoCommit();
  }
}
