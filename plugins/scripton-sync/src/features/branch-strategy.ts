import { Notice } from 'obsidian';
import { GitService } from '../core/git-service';
import { BranchStrategy, BranchConfig, GitResult } from '../types';
import * as os from 'os';

export class BranchStrategyManager {
  private gitService: GitService;
  private hostname: string;

  constructor(gitService: GitService) {
    this.gitService = gitService;
    this.hostname = os.hostname();
  }

  /**
   * Initialize branch strategy based on configuration
   */
  async initializeStrategy(config: BranchConfig): Promise<GitResult> {
    try {
      switch (config.strategy) {
        case 'develop-host':
          return await this.initDevelopHostStrategy(config);
        case 'feature-branch':
          return await this.initFeatureBranchStrategy(config);
        case 'simple':
          return await this.initSimpleStrategy(config);
        case 'custom':
          return await this.initCustomStrategy(config);
        default:
          return { success: false, error: 'Unknown branch strategy' };
      }
    } catch (error) {
      console.error('Failed to initialize branch strategy:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize develop-host strategy
   * Creates a branch like develop/hostname
   */
  private async initDevelopHostStrategy(config: BranchConfig): Promise<GitResult> {
    try {
      const branchName = `${config.developPrefix}${this.hostname}`;
      
      // Check if branch already exists
      const branchExists = await this.gitService.branchExists(branchName);
      
      if (!branchExists) {
        // Create the host branch from default branch
        await this.gitService.switchBranch(config.defaultBranch);
        const result = await this.gitService.createHostBranch(config.developPrefix);
        
        if (result.success) {
          new Notice(`Created branch: ${branchName}`);
        }
        
        return result;
      } else {
        // Switch to existing branch
        const result = await this.gitService.switchBranch(branchName);
        
        if (result.success) {
          new Notice(`Switched to branch: ${branchName}`);
        }
        
        return result;
      }
    } catch (error) {
      console.error('Failed to init develop-host strategy:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize feature branch strategy
   */
  private async initFeatureBranchStrategy(config: BranchConfig): Promise<GitResult> {
    try {
      // Feature branches should be created on demand
      // For now, just ensure we're on the default branch
      return await this.gitService.switchBranch(config.defaultBranch);
    } catch (error) {
      console.error('Failed to init feature branch strategy:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize simple strategy (just use default branch)
   */
  private async initSimpleStrategy(config: BranchConfig): Promise<GitResult> {
    try {
      return await this.gitService.switchBranch(config.defaultBranch);
    } catch (error) {
      console.error('Failed to init simple strategy:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize custom strategy
   */
  private async initCustomStrategy(config: BranchConfig): Promise<GitResult> {
    // Custom strategy would be implemented based on user-defined rules
    // For now, fallback to simple strategy
    return this.initSimpleStrategy(config);
  }

  /**
   * Create a feature branch
   */
  async createFeatureBranch(
    featureName: string, 
    config: BranchConfig
  ): Promise<GitResult> {
    try {
      const branchName = `${config.featurePrefix}${featureName}`;
      
      // Switch to default branch first
      await this.gitService.switchBranch(config.defaultBranch);
      
      // Create the feature branch
      await this.gitService.createHostBranch(branchName);
      
      new Notice(`Created feature branch: ${branchName}`);
      
      return { success: true, data: { branch: branchName } };
    } catch (error) {
      console.error('Failed to create feature branch:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Merge current branch to default branch
   */
  async mergeToDefault(config: BranchConfig): Promise<GitResult> {
    try {
      const currentBranch = await this.gitService.getCurrentBranch();
      
      if (currentBranch === config.defaultBranch) {
        return { 
          success: false, 
          error: 'Already on default branch' 
        };
      }

      // Switch to default branch
      await this.gitService.switchBranch(config.defaultBranch);
      
      // Merge with appropriate strategy
      const mergeStrategy = config.squashMerge ? 'squash' : 'merge';
      const result = await this.gitService.merge(currentBranch, mergeStrategy);
      
      if (result.success && config.squashMerge) {
        // If squash merge, we need to commit
        await this.gitService.commit(
          `Squash merge from ${currentBranch}`
        );
      }
      
      if (result.success) {
        new Notice(`Merged ${currentBranch} to ${config.defaultBranch}`);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to merge to default:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto merge if configured
   */
  async autoMergeIfNeeded(config: BranchConfig): Promise<GitResult> {
    if (!config.autoMergeToDefault) {
      return { success: true, data: { skipped: true } };
    }

    const currentBranch = await this.gitService.getCurrentBranch();
    
    // Only auto-merge from develop/host branches
    if (config.strategy === 'develop-host' && 
        currentBranch.startsWith(config.developPrefix)) {
      return await this.mergeToDefault(config);
    }
    
    return { success: true, data: { skipped: true } };
  }

  /**
   * Get branch name for current strategy
   */
  async getBranchForStrategy(
    strategy: BranchStrategy, 
    config: BranchConfig
  ): Promise<string> {
    switch (strategy) {
      case 'develop-host':
        return `${config.developPrefix}${this.hostname}`;
      case 'simple':
        return config.defaultBranch;
      default:
        return await this.gitService.getCurrentBranch();
    }
  }

  /**
   * Clean up old branches
   */
  async cleanupOldBranches(
    config: BranchConfig, 
    daysOld: number = 30
  ): Promise<GitResult> {
    try {
      const branches = await this.gitService.listBranches();
      const currentBranch = await this.gitService.getCurrentBranch();
      const now = new Date();
      
      let deletedCount = 0;
      
      for (const branch of branches) {
        // Skip current branch, default branch, and remote branches
        if (branch === currentBranch || 
            branch === config.defaultBranch ||
            branch.includes('remotes/')) {
          continue;
        }
        
        // Check if branch is old enough
        const lastCommit = await this.gitService.getCommitHistory(1);
        if (lastCommit.length > 0) {
          const commitDate = new Date(lastCommit[0].date);
          const daysDiff = (now.getTime() - commitDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff > daysOld) {
            // Delete the branch
            await this.gitService.git.branch(['-d', branch]);
            deletedCount++;
          }
        }
      }
      
      if (deletedCount > 0) {
        new Notice(`Cleaned up ${deletedCount} old branches`);
      }
      
      return { 
        success: true, 
        data: { deletedCount } 
      };
    } catch (error) {
      console.error('Failed to cleanup old branches:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current branch info
   */
  async getCurrentBranchInfo(): Promise<{
    name: string;
    type: 'develop' | 'feature' | 'default' | 'other';
    ahead: number;
    behind: number;
  }> {
    const status = await this.gitService.getStatus();
    const branchName = status.currentBranch;
    
    let type: 'develop' | 'feature' | 'default' | 'other' = 'other';
    
    if (branchName.startsWith('develop/')) {
      type = 'develop';
    } else if (branchName.startsWith('feature/')) {
      type = 'feature';
    } else if (branchName === 'main' || branchName === 'master') {
      type = 'default';
    }
    
    return {
      name: branchName,
      type,
      ahead: status.ahead,
      behind: status.behind
    };
  }
}