import { App, Notice, TFile, TFolder } from 'obsidian';
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import SettingsSyncPlugin from './main';
import { GitConfig, ChangeItem } from './types';

export class GitManager {
  private app: App;
  private plugin: SettingsSyncPlugin;
  private gitDir: string;
  private settingsDir: string;

  constructor(app: App, plugin: SettingsSyncPlugin) {
    this.app = app;
    this.plugin = plugin;
    this.gitDir = `${app.vault.configDir}/.settings-sync`;
    this.settingsDir = `${this.gitDir}/settings`;
  }

  /**
   * Initialize Git repository
   */
  async initRepository(): Promise<void> {
    try {
      // Create directories if they don't exist
      await this.ensureDirectoryExists(this.gitDir);
      await this.ensureDirectoryExists(this.settingsDir);

      // Initialize git repository
      await git.init({
        fs: this.getFS(),
        dir: this.gitDir,
        defaultBranch: 'main'
      });

      // Create .gitignore
      await this.createGitignore();

      console.log('Git repository initialized');
    } catch (error) {
      console.error('Failed to initialize repository:', error);
      throw error;
    }
  }

  /**
   * Clone a remote repository
   */
  async cloneRepository(url: string): Promise<void> {
    try {
      await this.ensureDirectoryExists(this.gitDir);

      await git.clone({
        fs: this.getFS(),
        http,
        dir: this.gitDir,
        url,
        depth: 1,
        singleBranch: true
      });

      new Notice('Repository cloned successfully');
    } catch (error) {
      console.error('Failed to clone repository:', error);
      throw error;
    }
  }

  /**
   * Add remote origin
   */
  async addRemote(url: string): Promise<void> {
    try {
      await git.addRemote({
        fs: this.getFS(),
        dir: this.gitDir,
        remote: 'origin',
        url
      });
    } catch (error) {
      // Remote might already exist
      await git.deleteRemote({
        fs: this.getFS(),
        dir: this.gitDir,
        remote: 'origin'
      });
      
      await git.addRemote({
        fs: this.getFS(),
        dir: this.gitDir,
        remote: 'origin',
        url
      });
    }
  }

  /**
   * Pull changes from remote
   */
  async pull(): Promise<ChangeItem[]> {
    try {
      const before = await this.getCurrentCommit();

      await git.pull({
        fs: this.getFS(),
        http,
        dir: this.gitDir,
        ref: 'main',
        singleBranch: true,
        author: {
          name: this.plugin.settings.gitConfig?.author?.name || 'Obsidian User',
          email: this.plugin.settings.gitConfig?.author?.email || 'user@obsidian.md'
        }
      });

      const after = await this.getCurrentCommit();
      
      if (before !== after) {
        return await this.getChangedFiles(before, after);
      }

      return [];
    } catch (error) {
      console.error('Failed to pull changes:', error);
      throw error;
    }
  }

  /**
   * Push changes to remote
   */
  async push(): Promise<void> {
    try {
      await git.push({
        fs: this.getFS(),
        http,
        dir: this.gitDir,
        remote: 'origin',
        ref: 'main'
      });

      new Notice('Changes pushed successfully');
    } catch (error) {
      console.error('Failed to push changes:', error);
      throw error;
    }
  }

  /**
   * Commit changes
   */
  async commit(message: string, files?: string[]): Promise<string> {
    try {
      // Stage files
      if (files && files.length > 0) {
        for (const file of files) {
          await git.add({
            fs: this.getFS(),
            dir: this.gitDir,
            filepath: file
          });
        }
      } else {
        // Stage all changes
        await git.add({
          fs: this.getFS(),
          dir: this.gitDir,
          filepath: '.'
        });
      }

      // Commit
      const sha = await git.commit({
        fs: this.getFS(),
        dir: this.gitDir,
        message,
        author: {
          name: this.plugin.settings.gitConfig?.author?.name || 'Obsidian User',
          email: this.plugin.settings.gitConfig?.author?.email || 'user@obsidian.md'
        }
      });

      return sha;
    } catch (error) {
      console.error('Failed to commit changes:', error);
      throw error;
    }
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<Array<[string, number]>> {
    try {
      return await git.statusMatrix({
        fs: this.getFS(),
        dir: this.gitDir
      });
    } catch (error) {
      console.error('Failed to get status:', error);
      throw error;
    }
  }

  /**
   * Get changed files between two commits
   */
  async getChangedFiles(from: string, to: string): Promise<ChangeItem[]> {
    try {
      const changes: ChangeItem[] = [];
      
      // This is a simplified implementation
      // In production, you'd want to use git.walk to properly diff commits
      const status = await this.getStatus();
      
      for (const [filepath, , workdirStatus] of status) {
        if (workdirStatus !== 1) { // 1 means unchanged
          changes.push({
            type: workdirStatus === 0 ? 'deleted' : workdirStatus === 2 ? 'added' : 'modified',
            path: filepath
          });
        }
      }

      return changes;
    } catch (error) {
      console.error('Failed to get changed files:', error);
      return [];
    }
  }

  /**
   * Get commit history
   */
  async getHistory(limit: number = 10): Promise<any[]> {
    try {
      const commits = await git.log({
        fs: this.getFS(),
        dir: this.gitDir,
        depth: limit
      });

      return commits;
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  /**
   * Check for conflicts
   */
  async hasConflicts(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      
      // Check for merge conflicts (status code 7)
      return status.some(([, , workdir]) => workdir === 7);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      return false;
    }
  }

  /**
   * Resolve conflicts by choosing version
   */
  async resolveConflict(filepath: string, version: 'ours' | 'theirs'): Promise<void> {
    try {
      if (version === 'ours') {
        // Keep local version
        await git.checkout({
          fs: this.getFS(),
          dir: this.gitDir,
          filepath,
          ref: 'HEAD'
        });
      } else {
        // Keep remote version
        await git.checkout({
          fs: this.getFS(),
          dir: this.gitDir,
          filepath,
          ref: 'MERGE_HEAD'
        });
      }

      // Stage the resolved file
      await git.add({
        fs: this.getFS(),
        dir: this.gitDir,
        filepath
      });
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }

  /**
   * Create .gitignore file
   */
  private async createGitignore(): Promise<void> {
    const gitignoreContent = `# Obsidian sensitive files
${this.plugin.settings.excludedFiles.join('\n')}

# System files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.bak
*.swp

# API keys and secrets
*api*key*
*token*
*secret*
*password*
`;

    const gitignorePath = `${this.gitDir}/.gitignore`;
    await this.app.vault.adapter.write(gitignorePath, gitignoreContent);
  }

  /**
   * Get current commit SHA
   */
  private async getCurrentCommit(): Promise<string> {
    try {
      return await git.resolveRef({
        fs: this.getFS(),
        dir: this.gitDir,
        ref: 'HEAD'
      });
    } catch (error) {
      return '';
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      const exists = await this.app.vault.adapter.exists(path);
      if (!exists) {
        await this.app.vault.adapter.mkdir(path);
      }
    } catch (error) {
      console.error(`Failed to create directory ${path}:`, error);
    }
  }

  /**
   * Get filesystem adapter for isomorphic-git
   */
  private getFS() {
    // Create a filesystem adapter for isomorphic-git
    return {
      promises: {
        readFile: async (path: string, options?: any) => {
          const content = await this.app.vault.adapter.read(path);
          if (options?.encoding === 'utf8') {
            return content;
          }
          return Buffer.from(content);
        },
        writeFile: async (path: string, data: any) => {
          const content = typeof data === 'string' ? data : data.toString();
          await this.app.vault.adapter.write(path, content);
        },
        unlink: async (path: string) => {
          await this.app.vault.adapter.remove(path);
        },
        readdir: async (path: string) => {
          const items = await this.app.vault.adapter.list(path);
          return [...items.folders.map(f => f.split('/').pop()), ...items.files.map(f => f.split('/').pop())];
        },
        mkdir: async (path: string) => {
          await this.app.vault.adapter.mkdir(path);
        },
        rmdir: async (path: string) => {
          await this.app.vault.adapter.rmdir(path, true);
        },
        stat: async (path: string) => {
          const exists = await this.app.vault.adapter.exists(path);
          if (!exists) {
            throw new Error('ENOENT');
          }
          
          const stat = await this.app.vault.adapter.stat(path);
          return {
            isFile: () => stat?.type === 'file',
            isDirectory: () => stat?.type === 'folder',
            size: stat?.size || 0,
            mtime: new Date(stat?.mtime || Date.now())
          };
        },
        lstat: async (path: string) => {
          return this.getFS().promises.stat(path);
        }
      }
    };
  }
}