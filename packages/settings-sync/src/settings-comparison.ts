import { App, Modal, Setting } from 'obsidian';
import { SettingsProfile, ObsidianSettings } from './types';
import { ProfileManager } from './profile-manager';
import SettingsSyncPlugin from './main';

export class SettingsComparisonViewer extends Modal {
  private plugin: SettingsSyncPlugin;
  private profileManager: ProfileManager;
  private leftProfile?: SettingsProfile;
  private rightProfile?: SettingsProfile;
  private currentSettings?: ObsidianSettings;

  constructor(app: App, plugin: SettingsSyncPlugin) {
    super(app);
    this.plugin = plugin;
    this.profileManager = plugin.profileManager;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    contentEl.createEl('h2', { text: 'Settings Comparison' });

    // Profile selectors
    const selectorContainer = contentEl.createDiv('comparison-selectors');
    
    // Left selector
    const leftSelector = selectorContainer.createDiv('selector-left');
    leftSelector.createEl('h3', { text: 'Compare:' });
    
    new Setting(leftSelector)
      .setName('Left side')
      .addDropdown(dropdown => {
        dropdown.addOption('current', 'Current Settings');
        this.plugin.settings.profiles.forEach(profile => {
          dropdown.addOption(profile.id, profile.name);
        });
        dropdown.onChange(async (value) => {
          if (value === 'current') {
            this.currentSettings = await this.plugin.settingsParser.parseAllSettings();
            this.leftProfile = undefined;
          } else {
            this.leftProfile = this.plugin.settings.profiles.find(p => p.id === value);
            this.currentSettings = undefined;
          }
          await this.updateComparison();
        });
      });

    // Right selector
    const rightSelector = selectorContainer.createDiv('selector-right');
    rightSelector.createEl('h3', { text: 'With:' });
    
    new Setting(rightSelector)
      .setName('Right side')
      .addDropdown(dropdown => {
        dropdown.addOption('', 'Select profile...');
        this.plugin.settings.profiles.forEach(profile => {
          dropdown.addOption(profile.id, profile.name);
        });
        dropdown.onChange(async (value) => {
          this.rightProfile = this.plugin.settings.profiles.find(p => p.id === value);
          await this.updateComparison();
        });
      });

    // Comparison results
    const resultsContainer = contentEl.createDiv('comparison-results');
    resultsContainer.createEl('div', { 
      text: 'Select profiles to compare',
      cls: 'comparison-placeholder'
    });

    this.addStyles();
  }

  private async updateComparison() {
    const resultsContainer = this.containerEl.querySelector('.comparison-results');
    if (!resultsContainer) return;

    resultsContainer.empty();

    if (!this.rightProfile) {
      resultsContainer.createEl('div', { 
        text: 'Select a profile on the right to compare',
        cls: 'comparison-placeholder'
      });
      return;
    }

    // Get differences
    const leftSettings = this.currentSettings || 
      (this.leftProfile ? this.profileManager.convertToObsidianSettings(this.leftProfile.settings) : null);
    
    const rightSettings = this.profileManager.convertToObsidianSettings(this.rightProfile.settings);

    if (!leftSettings) {
      resultsContainer.createEl('div', { 
        text: 'Unable to load left side settings',
        cls: 'comparison-error'
      });
      return;
    }

    // Compare settings
    const differences = this.compareSettings(leftSettings, rightSettings);

    // Display results
    if (differences.length === 0) {
      resultsContainer.createEl('div', { 
        text: 'No differences found',
        cls: 'comparison-no-diff'
      });
      return;
    }

    // Group differences by category
    const grouped = this.groupDifferences(differences);

    // Display grouped differences
    for (const [category, diffs] of Object.entries(grouped)) {
      const categoryEl = resultsContainer.createDiv('diff-category');
      categoryEl.createEl('h4', { text: category });

      const diffList = categoryEl.createEl('ul', { cls: 'diff-list' });
      
      for (const diff of diffs) {
        const diffItem = diffList.createEl('li', { cls: `diff-${diff.type}` });
        
        const pathEl = diffItem.createEl('span', { 
          text: diff.path,
          cls: 'diff-path'
        });

        if (diff.type === 'modified') {
          const valuesEl = diffItem.createDiv('diff-values');
          valuesEl.createEl('span', { 
            text: `${JSON.stringify(diff.leftValue)} → ${JSON.stringify(diff.rightValue)}`,
            cls: 'diff-change'
          });
        } else if (diff.type === 'added') {
          diffItem.createEl('span', { 
            text: ' (added)',
            cls: 'diff-label-added'
          });
        } else if (diff.type === 'removed') {
          diffItem.createEl('span', { 
            text: ' (removed)',
            cls: 'diff-label-removed'
          });
        }
      }
    }
  }

  private compareSettings(left: ObsidianSettings, right: ObsidianSettings): DiffItem[] {
    const differences: DiffItem[] = [];
    
    // Compare all paths
    const allPaths = new Set([
      ...this.getAllPaths(left),
      ...this.getAllPaths(right)
    ]);

    for (const path of allPaths) {
      const leftValue = this.getValueAtPath(left, path);
      const rightValue = this.getValueAtPath(right, path);

      if (leftValue === undefined && rightValue !== undefined) {
        differences.push({ type: 'added', path, rightValue });
      } else if (leftValue !== undefined && rightValue === undefined) {
        differences.push({ type: 'removed', path, leftValue });
      } else if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
        differences.push({ type: 'modified', path, leftValue, rightValue });
      }
    }

    return differences;
  }

  private getAllPaths(obj: any, prefix: string = ''): string[] {
    const paths: string[] = [];
    
    for (const key in obj) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        paths.push(...this.getAllPaths(obj[key], path));
      } else {
        paths.push(path);
      }
    }

    return paths;
  }

  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private groupDifferences(differences: DiffItem[]): Record<string, DiffItem[]> {
    const grouped: Record<string, DiffItem[]> = {};
    
    for (const diff of differences) {
      const category = this.getCategoryFromPath(diff.path);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(diff);
    }

    return grouped;
  }

  private getCategoryFromPath(path: string): string {
    const parts = path.split('.');
    const root = parts[0];
    
    const categoryMap: Record<string, string> = {
      'appearance': 'Appearance',
      'hotkeys': 'Hotkeys',
      'core': 'Core Plugins',
      'community': 'Community Plugins',
      'plugins': parts.length > 1 ? `Plugin: ${parts[1]}` : 'Plugins',
      'themes': 'Themes',
      'snippets': 'CSS Snippets'
    };

    return categoryMap[root] || 'Other';
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .comparison-selectors {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--background-modifier-border);
      }
      
      .selector-left, .selector-right {
        flex: 1;
      }
      
      .comparison-results {
        max-height: 400px;
        overflow-y: auto;
      }
      
      .comparison-placeholder {
        text-align: center;
        padding: 40px;
        color: var(--text-muted);
      }
      
      .comparison-error {
        text-align: center;
        padding: 20px;
        color: var(--text-error);
        background-color: var(--background-modifier-error);
        border-radius: 5px;
      }
      
      .comparison-no-diff {
        text-align: center;
        padding: 40px;
        color: var(--text-success);
        font-weight: bold;
      }
      
      .diff-category {
        margin-bottom: 20px;
      }
      
      .diff-category h4 {
        margin-bottom: 10px;
        color: var(--text-accent);
      }
      
      .diff-list {
        list-style: none;
        padding-left: 0;
      }
      
      .diff-list li {
        padding: 8px 12px;
        margin-bottom: 5px;
        border-radius: 5px;
        background-color: var(--background-secondary);
      }
      
      .diff-added {
        border-left: 3px solid var(--text-success);
      }
      
      .diff-removed {
        border-left: 3px solid var(--text-error);
      }
      
      .diff-modified {
        border-left: 3px solid var(--text-warning);
      }
      
      .diff-path {
        font-family: var(--font-monospace);
        font-size: 0.9em;
      }
      
      .diff-values {
        margin-top: 5px;
        font-size: 0.85em;
        color: var(--text-muted);
      }
      
      .diff-change {
        font-family: var(--font-monospace);
      }
      
      .diff-label-added {
        color: var(--text-success);
        font-weight: bold;
      }
      
      .diff-label-removed {
        color: var(--text-error);
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);
  }
}

interface DiffItem {
  type: 'added' | 'removed' | 'modified';
  path: string;
  leftValue?: any;
  rightValue?: any;
}