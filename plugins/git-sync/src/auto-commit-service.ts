import { Vault, TFile, TFolder } from 'obsidian';
import { GitService, GitResult } from './git-service';
import { LLMService, LLMSettings, CommitContext } from './llm-service';

export interface CommitResult {
  success: boolean;
  message?: string;
  error?: string;
  filesChanged?: number;
  hash?: string;
}

export interface AutoCommitSettings {
  enableAutoCommit: boolean;
  commitIntervalMinutes: number;
  includeUntracked: boolean;
  enableAutoPush: boolean;
  pushAfterCommits: number;
  tempBranch: string;
  mainBranch: string;
  // Merge settings
  enableAutoMerge: boolean;
  mergeStrategy: 'merge' | 'rebase' | 'squash';
  // LLM settings
  enableAICommitMessages: boolean;
  llmProvider: 'openai' | 'anthropic' | 'none';
  apiKey: string;
  commitPrompt: string;
  useTemplateEngine: boolean;
  selectedTemplate: string;
}

export class AutoCommitService {
  private gitService: GitService;
  private settings: AutoCommitSettings;
  private vault: Vault;
  private llmService: LLMService;
  private intervalId: NodeJS.Timeout | null = null;
  private commitCount: number = 0;
  private lastCommitTime: number = 0;

  constructor(gitService: GitService, settings: AutoCommitSettings, vault: Vault) {
    this.gitService = gitService;
    this.settings = settings;
    this.vault = vault;
    this.llmService = new LLMService({
      provider: settings.llmProvider,
      apiKey: settings.apiKey,
      commitPrompt: settings.commitPrompt,
      enabled: settings.enableAICommitMessages,
      useTemplateEngine: settings.useTemplateEngine || false,
      selectedTemplate: settings.selectedTemplate || 'conventional',
    });
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

    console.log(
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
      console.log('Auto commit service stopped');
    }
  }

  /**
   * Update settings and restart if needed
   */
  updateSettings(settings: AutoCommitSettings): void {
    this.settings = settings;

    // Update LLM service settings
    this.llmService.updateSettings({
      provider: settings.llmProvider,
      apiKey: settings.apiKey,
      commitPrompt: settings.commitPrompt,
      enabled: settings.enableAICommitMessages,
      useTemplateEngine: settings.useTemplateEngine || false,
      selectedTemplate: settings.selectedTemplate || 'conventional',
    });

    if (this.settings.enableAutoCommit) {
      this.start(); // This will stop and restart with new interval
    } else {
      this.stop();
    }
  }

  /**
   * Perform an automatic commit
   */
  private async performAutoCommit(): Promise<CommitResult> {
    try {
      console.log('Starting auto commit...');

      // Switch to temp branch if not already on it
      const currentBranch = await this.gitService.getCurrentBranch();
      if (currentBranch !== this.settings.tempBranch) {
        const switchResult = await this.gitService.switchBranch(this.settings.tempBranch);
        if (!switchResult.success) {
          return {
            success: false,
            error: `Failed to switch to ${this.settings.tempBranch}: ${switchResult.error}`,
          };
        }
      }

      // Check if there are any changes
      const status = await this.gitService.getStatus();
      if (!status.hasChanges) {
        console.log('No changes to commit');
        return {
          success: true,
          message: 'No changes to commit',
        };
      }

      // Generate commit message
      const commitMessage = await this.generateCommitMessage(status);

      // Perform commit
      const commitResult = await this.gitService.addAndCommit(
        commitMessage,
        this.settings.includeUntracked
      );

      if (!commitResult.success) {
        return {
          success: false,
          error: commitResult.error,
        };
      }

      this.commitCount++;
      this.lastCommitTime = Date.now();

      console.log(`Auto commit successful: ${commitMessage}`);

      // Auto push if enabled
      let pushResult: GitResult | null = null;
      if (this.settings.enableAutoPush && this.commitCount >= this.settings.pushAfterCommits) {
        pushResult = await this.gitService.push(this.settings.tempBranch);
        if (pushResult.success) {
          this.commitCount = 0; // Reset counter after successful push
          console.log('Auto push successful');

          // Auto merge if enabled and push was successful
          if (this.settings.enableAutoMerge) {
            await this.performAutoMerge();
          }
        } else {
          console.warn('Auto push failed:', pushResult.error);
        }
      }

      return {
        success: true,
        message: commitMessage,
        filesChanged: status.staged.length + status.unstaged.length + status.untracked.length,
        hash: commitResult.data?.hash,
      };
    } catch (error) {
      console.error('Auto commit failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Perform a manual commit (can be called from command)
   */
  async performCommit(): Promise<CommitResult> {
    return this.performAutoCommit();
  }

  /**
   * Perform a manual auto-merge (can be called from command)
   */
  async performManualAutoMerge(): Promise<void> {
    await this.performAutoMerge();
  }

  /**
   * Perform automatic merge from temp branch to main branch
   */
  private async performAutoMerge(): Promise<void> {
    try {
      console.log('Starting auto merge...');

      // Check if it's safe to perform auto-merge
      const safetyCheck = await this.gitService.isSafeToAutoMerge(
        this.settings.tempBranch,
        this.settings.mainBranch
      );

      if (!safetyCheck.safe) {
        console.log(`Skipping auto merge: ${safetyCheck.reason}`);
        return;
      }

      // Switch to main branch
      const currentBranch = await this.gitService.getCurrentBranch();
      if (currentBranch !== this.settings.mainBranch) {
        const switchResult = await this.gitService.switchBranch(this.settings.mainBranch);
        if (!switchResult.success) {
          console.warn(`Failed to switch to ${this.settings.mainBranch}: ${switchResult.error}`);
          return;
        }
      }

      // Check if main branch is clean
      const mainStatus = await this.gitService.getStatus();
      if (mainStatus.hasChanges) {
        console.warn('Main branch has uncommitted changes, skipping auto merge');
        return;
      }

      // Pull latest changes from remote main branch
      const pullResult = await this.gitService.pullRebase(this.settings.mainBranch);
      if (!pullResult.success && !pullResult.conflicts) {
        console.warn('Failed to pull latest changes to main branch:', pullResult.error);
        return;
      }

      // Perform the merge
      const mergeResult = await this.gitService.mergeBranches(
        this.settings.tempBranch,
        this.settings.mainBranch,
        this.settings.mergeStrategy
      );

      if (mergeResult.success && !mergeResult.conflicts) {
        console.log(
          `Auto merge successful: ${this.settings.tempBranch} → ${this.settings.mainBranch}`
        );

        // Push merged changes to remote main branch
        const pushMainResult = await this.gitService.push(this.settings.mainBranch);
        if (pushMainResult.success) {
          console.log('Auto merge push successful');
        } else {
          console.warn(`Auto merge push failed: ${pushMainResult.error}`);
        }

        // Switch back to temp branch for continued development
        await this.gitService.switchBranch(this.settings.tempBranch);
      } else if (mergeResult.conflicts) {
        console.warn('Auto merge has conflicts - manual resolution required');
        // Stay on main branch so user can resolve conflicts
      } else {
        console.warn(`Auto merge failed: ${mergeResult.error}`);
        // Switch back to temp branch
        await this.gitService.switchBranch(this.settings.tempBranch);
      }
    } catch (error) {
      console.error('Auto merge error:', error);
      // Try to switch back to temp branch on error
      try {
        await this.gitService.switchBranch(this.settings.tempBranch);
      } catch (switchError) {
        console.error('Failed to switch back to temp branch:', switchError);
      }
    }
  }

  /**
   * Generate a commit message based on changes
   */
  private async generateCommitMessage(status: any): Promise<string> {
    // Try LLM first if enabled
    if (this.settings.enableAICommitMessages) {
      try {
        const commitContext: CommitContext = {
          files: {
            staged: status.staged || [],
            unstaged: status.unstaged || [],
            untracked: status.untracked || [],
          },
          branch: status.currentBranch || 'unknown',
        };

        // Get recent commits for context
        try {
          const recentCommits = await this.gitService.getRecentCommits(3);
          commitContext.recentCommits = recentCommits.map(
            (commit: any) =>
              `${commit.hash?.substring(0, 7) || 'unknown'}: ${commit.message || 'no message'}`
          );
        } catch (error) {
          console.warn('Failed to get recent commits for context:', error);
        }

        const llmResult = await this.llmService.generateCommitMessage(commitContext);

        if (llmResult.success && llmResult.message) {
          console.log('Generated commit message using LLM:', llmResult.message);
          return llmResult.message;
        } else {
          console.warn('LLM commit message generation failed:', llmResult.error);
          // Fall back to default generation
        }
      } catch (error) {
        console.warn('LLM commit message generation error:', error);
        // Fall back to default generation
      }
    }

    // Fallback to default commit message generation
    return this.generateFallbackCommitMessage(status);
  }

  /**
   * Generate fallback commit message (original logic)
   */
  private generateFallbackCommitMessage(status: any): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length;

    if (totalChanges === 0) {
      return `chore: auto commit at ${timestamp}`;
    }

    // Categorize changes
    const categories = {
      added: status.untracked.length,
      modified: status.unstaged.filter((f: string) => !f.includes('deleted')).length,
      deleted: status.unstaged.filter((f: string) => f.includes('deleted')).length,
      staged: status.staged.length,
    };

    // Generate descriptive message
    const parts: string[] = [];

    if (categories.added > 0) {
      parts.push(`${categories.added} added`);
    }
    if (categories.modified > 0) {
      parts.push(`${categories.modified} modified`);
    }
    if (categories.deleted > 0) {
      parts.push(`${categories.deleted} deleted`);
    }

    let description = parts.join(', ');
    if (!description) {
      description = `${totalChanges} changes`;
    }

    // Check for specific file types to make message more descriptive
    const allFiles = [...status.staged, ...status.unstaged, ...status.untracked];
    const hasMarkdown = allFiles.some((f: string) => f.endsWith('.md'));
    const hasAttachments = allFiles.some(
      (f: string) =>
        f.endsWith('.png') ||
        f.endsWith('.jpg') ||
        f.endsWith('.jpeg') ||
        f.endsWith('.gif') ||
        f.endsWith('.pdf')
    );
    const hasConfigs = allFiles.some(
      (f: string) => f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml')
    );

    let prefix = 'docs';
    if (hasMarkdown && !hasAttachments && !hasConfigs) {
      prefix = 'docs';
    } else if (hasAttachments) {
      prefix = 'assets';
    } else if (hasConfigs) {
      prefix = 'config';
    } else {
      prefix = 'update';
    }

    return `${prefix}: auto commit - ${description}

Auto-committed at ${timestamp}`;
  }

  /**
   * Get current commit count since last push
   */
  getCommitCount(): number {
    return this.commitCount;
  }

  /**
   * Get last commit time
   */
  getLastCommitTime(): number {
    return this.lastCommitTime;
  }

  /**
   * Reset commit counter (useful after manual push)
   */
  resetCommitCount(): void {
    this.commitCount = 0;
  }

  /**
   * Check if auto commit is due based on file modification times
   */
  async isCommitDue(): Promise<boolean> {
    if (!this.settings.enableAutoCommit) {
      return false;
    }

    // Check if enough time has passed since last commit
    const now = Date.now();
    const intervalMs = this.settings.commitIntervalMinutes * 60 * 1000;
    const timeSinceLastCommit = now - this.lastCommitTime;

    if (timeSinceLastCommit < intervalMs) {
      return false;
    }

    // Check if there are any changes
    const status = await this.gitService.getStatus();
    return status.hasChanges;
  }

  /**
   * Get a summary of pending changes
   */
  async getPendingChangesSummary(): Promise<{
    hasChanges: boolean;
    totalFiles: number;
    added: number;
    modified: number;
    deleted: number;
    untracked: number;
  }> {
    try {
      const status = await this.gitService.getStatus();

      return {
        hasChanges: status.hasChanges,
        totalFiles: status.staged.length + status.unstaged.length + status.untracked.length,
        added: status.staged.length,
        modified: status.unstaged.filter((f: string) => !f.includes('deleted')).length,
        deleted: status.unstaged.filter((f: string) => f.includes('deleted')).length,
        untracked: status.untracked.length,
      };
    } catch (error) {
      console.error('Failed to get pending changes summary:', error);
      return {
        hasChanges: false,
        totalFiles: 0,
        added: 0,
        modified: 0,
        deleted: 0,
        untracked: 0,
      };
    }
  }

  /**
   * Test LLM API connection
   */
  async testLLMConnection(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      return await this.llmService.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get available LLM models
   */
  getAvailableLLMModels(): string[] {
    return this.llmService.getAvailableModels();
  }

  /**
   * Estimate tokens for current changes
   */
  async estimateTokensForCurrentChanges(): Promise<number> {
    try {
      const status = await this.gitService.getStatus();
      const context: CommitContext = {
        files: {
          staged: status.staged || [],
          unstaged: status.unstaged || [],
          untracked: status.untracked || [],
        },
        branch: status.currentBranch || 'unknown',
      };

      return this.llmService.estimateTokens(context);
    } catch (error) {
      console.error('Failed to estimate tokens:', error);
      return 0;
    }
  }

  /**
   * Get available prompt templates from LLM service
   */
  getAvailablePromptTemplates(): any[] {
    return this.llmService.getAvailableTemplates();
  }

  /**
   * Preview prompt with current changes
   */
  async previewPromptWithCurrentChanges(): Promise<string> {
    try {
      const status = await this.gitService.getStatus();
      const context: CommitContext = {
        files: {
          staged: status.staged || [],
          unstaged: status.unstaged || [],
          untracked: status.untracked || [],
        },
        branch: status.currentBranch || 'unknown',
      };

      // Get recent commits for context
      try {
        const recentCommits = await this.gitService.getRecentCommits(3);
        context.recentCommits = recentCommits.map(
          (commit: any) =>
            `${commit.hash?.substring(0, 7) || 'unknown'}: ${commit.message || 'no message'}`
        );
      } catch (error) {
        console.warn('Failed to get recent commits for preview:', error);
      }

      return this.llmService.previewPrompt(context);
    } catch (error) {
      console.error('Failed to preview prompt:', error);
      return 'Error generating preview: ' + error.message;
    }
  }

  /**
   * Validate custom prompt template
   */
  validatePromptTemplate(template: string): { valid: boolean; errors: string[] } {
    return this.llmService.validatePromptTemplate(template);
  }

  /**
   * Get template help documentation
   */
  getTemplateHelp(): string {
    return this.llmService.getTemplateHelp();
  }
}
