import { Vault, TFile, TFolder } from 'obsidian';
import { GitService, GitResult } from './git-service';

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
}

export class AutoCommitService {
  private gitService: GitService;
  private settings: AutoCommitSettings;
  private vault: Vault;
  private intervalId: NodeJS.Timeout | null = null;
  private commitCount: number = 0;
  private lastCommitTime: number = 0;

  constructor(gitService: GitService, settings: AutoCommitSettings, vault: Vault) {
    this.gitService = gitService;
    this.settings = settings;
    this.vault = vault;
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

    console.log(`Auto commit service started with ${this.settings.commitIntervalMinutes} minute interval`);
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
            error: `Failed to switch to ${this.settings.tempBranch}: ${switchResult.error}`
          };
        }
      }

      // Check if there are any changes
      const status = await this.gitService.getStatus();
      if (!status.hasChanges) {
        console.log('No changes to commit');
        return {
          success: true,
          message: 'No changes to commit'
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
          error: commitResult.error
        };
      }

      this.commitCount++;
      this.lastCommitTime = Date.now();

      console.log(`Auto commit successful: ${commitMessage}`);

      // Auto push if enabled
      let pushResult: GitResult | null = null;
      if (this.settings.enableAutoPush && 
          this.commitCount >= this.settings.pushAfterCommits) {
        pushResult = await this.gitService.push(this.settings.tempBranch);
        if (pushResult.success) {
          this.commitCount = 0; // Reset counter after successful push
          console.log('Auto push successful');
        } else {
          console.warn('Auto push failed:', pushResult.error);
        }
      }

      return {
        success: true,
        message: commitMessage,
        filesChanged: status.staged.length + status.unstaged.length + status.untracked.length,
        hash: commitResult.data?.hash
      };

    } catch (error) {
      console.error('Auto commit failed:', error);
      return {
        success: false,
        error: error.message
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
   * Generate a commit message based on changes
   */
  private async generateCommitMessage(status: any): Promise<string> {
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
      staged: status.staged.length
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
    const hasAttachments = allFiles.some((f: string) => 
      f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || 
      f.endsWith('.gif') || f.endsWith('.pdf')
    );
    const hasConfigs = allFiles.some((f: string) => 
      f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml')
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
        untracked: status.untracked.length
      };
    } catch (error) {
      console.error('Failed to get pending changes summary:', error);
      return {
        hasChanges: false,
        totalFiles: 0,
        added: 0,
        modified: 0,
        deleted: 0,
        untracked: 0
      };
    }
  }
}