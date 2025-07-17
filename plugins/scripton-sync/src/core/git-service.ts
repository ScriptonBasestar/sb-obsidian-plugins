import * as os from 'os';

import { simpleGit, SimpleGit, StatusResult } from 'simple-git';

import { GitResult, GitStatus, GitConfig } from '../types';

export class GitService {
  private git: SimpleGit;
  private repoPath: string;
  private hostname: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
    this.hostname = os.hostname();
  }

  /**
   * Initialize Git repository
   */
  public async init(defaultBranch = 'main'): Promise<GitResult> {
    try {
      await this.git.init();
      await this.git.checkoutLocalBranch(defaultBranch);

      // Create initial commit
      await this.git.add('.gitignore');
      await this.git.commit('Initial commit');

      return { success: true };
    } catch (error) {
      console.error('Failed to initialize repository:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if repository is initialized
   */
  public async isInitialized(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Configure git author
   */
  public async configureAuthor(config: GitConfig['author']): Promise<GitResult> {
    try {
      await this.git.addConfig('user.name', config.name);
      await this.git.addConfig('user.email', config.email);
      return { success: true };
    } catch (error) {
      console.error('Failed to configure git author:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the current git status
   */
  public async getStatus(): Promise<GitStatus> {
    try {
      const status: StatusResult = await this.git.status();
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);

      // Get ahead/behind info
      let ahead = 0;
      let behind = 0;
      try {
        const aheadBehind = await this.git.raw([
          'rev-list',
          '--left-right',
          '--count',
          `origin/${branch.trim()}...HEAD`,
        ]);
        const counts = aheadBehind.trim().split('\t');
        behind = parseInt(counts[0]) || 0;
        ahead = parseInt(counts[1]) || 0;
      } catch (error) {
        // Remote might not exist yet
        console.warn('Could not get ahead/behind info:', error);
      }

      return {
        hasChanges: status.files.length > 0,
        staged: status.staged,
        unstaged: status.modified.concat(status.deleted),
        untracked: status.not_added,
        currentBranch: branch.trim(),
        ahead,
        behind,
      };
    } catch (error) {
      console.error('Failed to get git status:', error);
      throw error;
    }
  }

  /**
   * Create a branch based on hostname
   */
  public async createHostBranch(prefix = 'develop/'): Promise<GitResult> {
    try {
      const branchName = `${prefix}${this.hostname}`;
      await this.git.checkoutLocalBranch(branchName);
      return {
        success: true,
        data: { branch: branchName },
      };
    } catch (error) {
      console.error('Failed to create host branch:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Switch to branch
   */
  public async switchBranch(branch: string): Promise<GitResult> {
    try {
      await this.git.checkout(branch);
      return { success: true };
    } catch (error) {
      console.error('Failed to switch branch:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add files to staging area
   */
  public async addFiles(files: string[] | '.' = '.', includeUntracked = true): Promise<GitResult> {
    try {
      if (includeUntracked && files === '.') {
        await this.git.add('.');
      } else if (Array.isArray(files)) {
        await this.git.add(files);
      } else {
        await this.git.add([files]);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to add files:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Commit staged changes
   */
  public async commit(message: string): Promise<GitResult> {
    try {
      const result = await this.git.commit(message);
      return {
        success: true,
        data: {
          hash: result.commit,
          summary: result.summary,
        },
      };
    } catch (error) {
      console.error('Failed to commit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Push to remote
   */
  public async push(remote = 'origin', branch?: string, setUpstream = false): Promise<GitResult> {
    try {
      const currentBranch = branch || (await this.getCurrentBranch());

      if (setUpstream) {
        await this.git.push(remote, currentBranch, ['--set-upstream']);
      } else {
        await this.git.push(remote, currentBranch);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to push:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pull from remote
   */
  public async pull(remote = 'origin', branch?: string, rebase = false): Promise<GitResult> {
    try {
      const currentBranch = branch || (await this.getCurrentBranch());

      if (rebase) {
        await this.git.pull(remote, currentBranch, ['--rebase']);
      } else {
        await this.git.pull(remote, currentBranch);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to pull:', error);

      // Check if this is a conflict
      if (error.message.includes('conflict')) {
        return {
          success: false,
          error: error.message,
          conflicts: true,
        };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Merge branch
   */
  public async merge(
    sourceBranch: string,
    strategy: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<GitResult> {
    try {
      switch (strategy) {
        case 'squash':
          await this.git.merge([sourceBranch, '--squash']);
          break;
        case 'rebase':
          await this.git.rebase([sourceBranch]);
          break;
        default:
          await this.git.merge([sourceBranch]);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to merge:', error);

      if (error.message.includes('conflict')) {
        return {
          success: false,
          error: error.message,
          conflicts: true,
        };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Get current branch name
   */
  public async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      console.error('Failed to get current branch:', error);
      throw error;
    }
  }

  /**
   * List all branches
   */
  public async listBranches(includeRemote = false): Promise<string[]> {
    try {
      const branches = await this.git.branch([includeRemote ? '-a' : '-l']);
      return branches.all;
    } catch (error) {
      console.error('Failed to list branches:', error);
      throw error;
    }
  }

  /**
   * Check if branch exists
   */
  public async branchExists(branchName: string): Promise<boolean> {
    try {
      const branches = await this.listBranches();
      return branches.includes(branchName);
    } catch (error) {
      console.error('Failed to check branch existence:', error);
      return false;
    }
  }

  /**
   * Add remote
   */
  public async addRemote(name: string, url: string): Promise<GitResult> {
    try {
      await this.git.addRemote(name, url);
      return { success: true };
    } catch (error) {
      console.error('Failed to add remote:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get remotes
   */
  public async getRemotes(): Promise<
    Array<{ name: string; refs: { fetch: string; push: string } }>
  > {
    try {
      return await this.git.getRemotes(true);
    } catch (error) {
      console.error('Failed to get remotes:', error);
      return [];
    }
  }

  /**
   * Fetch from remote
   */
  public async fetch(remote = 'origin'): Promise<GitResult> {
    try {
      await this.git.fetch(remote);
      return { success: true };
    } catch (error) {
      console.error('Failed to fetch:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get conflict files
   */
  public async getConflictFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return status.conflicted;
    } catch (error) {
      console.error('Failed to get conflict files:', error);
      return [];
    }
  }

  /**
   * Abort merge
   */
  public async abortMerge(): Promise<GitResult> {
    try {
      await this.git.merge(['--abort']);
      return { success: true };
    } catch (error) {
      console.error('Failed to abort merge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get commit history
   */
  public async getCommitHistory(limit = 10): Promise<unknown[]> {
    try {
      const log = await this.git.log(['-n', limit.toString()]);
      return log.all;
    } catch (error) {
      console.error('Failed to get commit history:', error);
      return [];
    }
  }

  /**
   * Create and push tag
   */
  public async createTag(tagName: string, message?: string): Promise<GitResult> {
    try {
      if (message) {
        await this.git.tag(['-a', tagName, '-m', message]);
      } else {
        await this.git.tag([tagName]);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to create tag:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset to specific commit
   */
  public async reset(
    target = 'HEAD',
    mode: 'soft' | 'mixed' | 'hard' = 'mixed'
  ): Promise<GitResult> {
    try {
      await this.git.reset([`--${mode}`, target]);
      return { success: true };
    } catch (error) {
      console.error('Failed to reset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stash changes
   */
  public async stash(message?: string): Promise<GitResult> {
    try {
      if (message) {
        await this.git.stash(['push', '-m', message]);
      } else {
        await this.git.stash();
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to stash:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply stash
   */
  public async stashPop(): Promise<GitResult> {
    try {
      await this.git.stash(['pop']);
      return { success: true };
    } catch (error) {
      console.error('Failed to apply stash:', error);
      return { success: false, error: error.message };
    }
  }
}
