import { simpleGit, SimpleGit, StatusResult } from 'simple-git';

export interface GitResult {
  success: boolean;
  error?: string;
  conflicts?: boolean;
  data?: any;
}

export interface GitStatus {
  hasChanges: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  currentBranch: string;
  ahead: number;
  behind: number;
}

export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Get the current git status
   */
  async getStatus(): Promise<GitStatus> {
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
   * Add files to staging area
   */
  async addFiles(
    files: string[] | '.' = '.',
    includeUntracked: boolean = true
  ): Promise<GitResult> {
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
  async commit(message: string): Promise<GitResult> {
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
   * Add and commit in one operation
   */
  async addAndCommit(message: string, includeUntracked: boolean = true): Promise<GitResult> {
    try {
      // First check if there are any changes
      const status = await this.getStatus();
      if (!status.hasChanges) {
        return { success: true, data: { message: 'No changes to commit' } };
      }

      // Add files
      const addResult = await this.addFiles('.', includeUntracked);
      if (!addResult.success) {
        return addResult;
      }

      // Commit
      const commitResult = await this.commit(message);
      return commitResult;
    } catch (error) {
      console.error('Failed to add and commit:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Push commits to remote
   */
  async push(branch?: string): Promise<GitResult> {
    try {
      if (branch) {
        await this.git.push('origin', branch);
      } else {
        await this.git.push();
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to push:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pull with rebase
   */
  async pullRebase(branch?: string): Promise<GitResult> {
    try {
      const result = await this.git.pull('origin', branch, { '--rebase': 'true' });

      // Check for conflicts
      const status = await this.getStatus();
      const hasConflicts = status.unstaged.some(
        (file) => file.includes('<<<<<<< HEAD') || file.includes('>>>>>>> ')
      );

      return {
        success: true,
        conflicts: hasConflicts,
        data: result,
      };
    } catch (error) {
      console.error('Failed to pull with rebase:', error);

      // Check if it's a conflict error
      const isConflict = error.message.includes('conflict') || error.message.includes('CONFLICT');

      if (isConflict) {
        return { success: true, conflicts: true, error: error.message };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Switch to a branch (create if it doesn't exist)
   */
  async switchBranch(branchName: string, createIfNotExists: boolean = true): Promise<GitResult> {
    try {
      // Check if branch exists
      const branches = await this.git.branchLocal();
      const branchExists = branches.all.includes(branchName);

      if (!branchExists && createIfNotExists) {
        // Create and switch to new branch
        await this.git.checkoutLocalBranch(branchName);
      } else if (branchExists) {
        // Switch to existing branch
        await this.git.checkout(branchName);
      } else {
        return { success: false, error: `Branch ${branchName} does not exist` };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to switch branch:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Merge branches
   */
  async mergeBranches(
    fromBranch: string,
    toBranch: string,
    strategy: 'merge' | 'rebase' | 'squash' = 'merge'
  ): Promise<GitResult> {
    try {
      // Switch to target branch
      const switchResult = await this.switchBranch(toBranch);
      if (!switchResult.success) {
        return switchResult;
      }

      let result;
      switch (strategy) {
        case 'rebase':
          result = await this.git.rebase([fromBranch]);
          break;
        case 'squash':
          result = await this.git.merge([fromBranch, '--squash']);
          // Squash merge requires a commit
          const status = await this.getStatus();
          if (status.staged.length > 0) {
            await this.commit(`Squash merge ${fromBranch} into ${toBranch}`);
          }
          break;
        default: // merge
          result = await this.git.merge([fromBranch]);
          break;
      }

      // Check for conflicts
      const status = await this.getStatus();
      const hasConflicts = status.unstaged.length > 0;

      return {
        success: true,
        conflicts: hasConflicts,
        data: result,
      };
    } catch (error) {
      console.error('Failed to merge branches:', error);

      // Check if it's a conflict error
      const isConflict = error.message.includes('conflict') || error.message.includes('CONFLICT');

      if (isConflict) {
        return { success: true, conflicts: true, error: error.message };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      console.error('Failed to get current branch:', error);
      return 'unknown';
    }
  }

  /**
   * Check if repository is clean (no uncommitted changes)
   */
  async isClean(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return !status.hasChanges;
    } catch (error) {
      console.error('Failed to check if repo is clean:', error);
      return false;
    }
  }

  /**
   * Get list of recent commits
   */
  async getRecentCommits(count: number = 10): Promise<any[]> {
    try {
      const log = await this.git.log({ maxCount: count });
      return [...log.all];
    } catch (error) {
      console.error('Failed to get recent commits:', error);
      return [];
    }
  }

  /**
   * Check if remote repository is available
   */
  async checkRemoteConnection(): Promise<boolean> {
    try {
      await this.git.listRemote(['--heads']);
      return true;
    } catch (error) {
      console.warn('Remote connection check failed:', error);
      return false;
    }
  }

  /**
   * Initialize git repository if not already initialized
   */
  async initIfNeeded(): Promise<GitResult> {
    try {
      // Check if .git directory exists
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        await this.git.init();
        return { success: true, data: { message: 'Repository initialized' } };
      }
      return { success: true, data: { message: 'Repository already exists' } };
    } catch (error) {
      console.error('Failed to initialize repository:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if the current directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      const isRepo = await this.git.checkIsRepo();
      return isRepo;
    } catch (error) {
      console.warn('Failed to check if git repository:', error);
      return false;
    }
  }

  /**
   * Check if a remote repository is configured
   */
  async hasRemote(remoteName: string = 'origin'): Promise<boolean> {
    try {
      const remotes = await this.git.getRemotes(true);
      return remotes.some((remote) => remote.name === remoteName);
    } catch (error) {
      console.warn('Failed to check remote configuration:', error);
      return false;
    }
  }

  /**
   * Check if there are any uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.hasChanges;
    } catch (error) {
      console.error('Failed to check uncommitted changes:', error);
      return false;
    }
  }

  /**
   * Check if current branch has commits ahead of another branch
   */
  async hasCommitsAhead(targetBranch: string): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.ahead > 0;
    } catch (error) {
      console.error('Failed to check commits ahead:', error);
      return false;
    }
  }

  /**
   * Check if it's safe to perform an auto-merge
   */
  async isSafeToAutoMerge(
    tempBranch: string,
    mainBranch: string
  ): Promise<{
    safe: boolean;
    reason?: string;
  }> {
    try {
      // Check if we're in a git repository
      const isRepo = await this.isGitRepository();
      if (!isRepo) {
        return { safe: false, reason: 'Not in a git repository' };
      }

      // Check if remote is configured
      const hasRemote = await this.hasRemote();
      if (!hasRemote) {
        return { safe: false, reason: 'No remote repository configured' };
      }

      // Check current branch
      const currentBranch = await this.getCurrentBranch();
      if (currentBranch !== tempBranch) {
        return { safe: false, reason: `Not on temp branch (currently on ${currentBranch})` };
      }

      // Check if temp branch has commits ahead
      const status = await this.getStatus();
      if (status.ahead === 0) {
        return { safe: false, reason: 'No commits ahead on temp branch' };
      }

      return { safe: true };
    } catch (error) {
      console.error('Error checking auto-merge safety:', error);
      return { safe: false, reason: `Error: ${error.message}` };
    }
  }
}
