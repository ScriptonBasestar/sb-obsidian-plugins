import { App, Modal, Setting } from 'obsidian';
import { GitManager } from './git-manager';

export class HistoryViewer extends Modal {
  private git: GitManager;
  private commits: any[] = [];

  constructor(app: App, git: GitManager) {
    super(app);
    this.git = git;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Settings History' });

    // Loading indicator
    const loadingEl = contentEl.createDiv('loading');
    loadingEl.setText('Loading history...');

    try {
      // Load commit history
      this.commits = await this.git.getHistory(20);
      loadingEl.remove();

      if (this.commits.length === 0) {
        contentEl.createEl('p', { text: 'No history available yet.' });
        return;
      }

      // Display commits
      const historyContainer = contentEl.createDiv('history-container');
      
      for (const commit of this.commits) {
        const commitEl = historyContainer.createDiv('commit-item');
        
        // Commit header
        const headerEl = commitEl.createDiv('commit-header');
        headerEl.createEl('strong', { text: commit.commit.message });
        
        // Commit metadata
        const metaEl = commitEl.createDiv('commit-meta');
        const date = new Date(commit.commit.author.timestamp * 1000);
        metaEl.createEl('span', { 
          text: `${commit.commit.author.name} • ${date.toLocaleString()}` 
        });
        
        // Commit SHA (shortened)
        const shaEl = commitEl.createDiv('commit-sha');
        shaEl.createEl('code', { text: commit.oid.substring(0, 7) });

        // Separator
        commitEl.createEl('hr');
      }

      // Add CSS styles
      this.addStyles();

    } catch (error) {
      loadingEl.remove();
      contentEl.createEl('p', { 
        text: `Error loading history: ${error.message}`,
        cls: 'error-message' 
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .history-container {
        max-height: 400px;
        overflow-y: auto;
      }
      
      .commit-item {
        margin-bottom: 15px;
        padding: 10px;
        border-radius: 5px;
        background-color: var(--background-secondary);
      }
      
      .commit-header {
        margin-bottom: 5px;
      }
      
      .commit-meta {
        font-size: 0.9em;
        color: var(--text-muted);
        margin-bottom: 5px;
      }
      
      .commit-sha {
        font-size: 0.85em;
      }
      
      .commit-sha code {
        background-color: var(--background-modifier-cover);
        padding: 2px 5px;
        border-radius: 3px;
      }
      
      .error-message {
        color: var(--text-error);
        padding: 10px;
        background-color: var(--background-modifier-error);
        border-radius: 5px;
      }
      
      .loading {
        text-align: center;
        padding: 20px;
        color: var(--text-muted);
      }
    `;
    document.head.appendChild(style);
  }
}