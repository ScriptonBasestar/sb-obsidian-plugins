import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  FuzzySuggestModal,
  Component,
} from 'obsidian';

import { ScriptonApiService } from './scripton-api-service';
import { PublisherScriptonSettings, PublishOptions, PublishResult, getErrorMessage } from './types';

const DEFAULT_SETTINGS: PublisherScriptonSettings = {
  // API settings
  apiKey: '',
  apiEndpoint: 'https://api.scripton.cloud',

  // Publishing settings
  enablePublishing: true,
  defaultVisibility: 'private',
  includeAttachments: true,
  preserveLinks: true,

  // Content processing
  stripFrontmatter: false,
  convertWikiLinks: true,
  customCssStyles: '',

  // Auto-publishing
  enableAutoPublish: false,
  autoPublishFolders: [],
  autoPublishTags: [],

  // Retry settings
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,

  // Log settings
  enableDetailedLogs: false,
  logLevel: 'warn',
};

export default class PublisherScriptonPlugin extends Plugin {
  public settings: PublisherScriptonSettings;
  private apiService: ScriptonApiService | null = null;
  private statusBarItem: HTMLElement | null = null;

  public async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize API service
    this.apiService = new ScriptonApiService(this.settings);

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar('Ready');

    // Register commands
    this.addCommand({
      id: 'publish-current-note',
      name: 'Publish Current Note',
      editorCallback: (editor, view) => {
        if (view.file) {
          void this.publishNote(view.file);
        }
      },
    });

    this.addCommand({
      id: 'publish-note-dialog',
      name: 'Publish Note (with options)',
      callback: () => {
        new NoteSelectionModal(this.app, (file) => {
          new PublishOptionsModal(this.app, this.settings, (options) => {
            void this.publishNote(file, options);
          }).open();
        }).open();
      },
    });

    this.addCommand({
      id: 'publish-folder',
      name: 'Publish Folder',
      callback: () => {
        new FolderSelectionModal(this.app, (folder) => {
          void this.publishFolder(folder);
        }).open();
      },
    });

    this.addCommand({
      id: 'test-api-connection',
      name: 'Test API Connection',
      callback: () => {
        void this.testApiConnection();
      },
    });

    this.addCommand({
      id: 'view-publish-logs',
      name: 'View Publish Logs',
      callback: () => {
        if (this.apiService !== null) {
          new PublishLogsModal(this.app, this.apiService.getLogs()).open();
        }
      },
    });

    // Settings tab
    this.addSettingTab(new PublisherScriptonSettingTab(this.app, this));

    console.log('Publisher Scripton plugin loaded');
  }

  public onunload(): void {
    console.log('Publisher Scripton plugin unloaded');
  }

  public async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  public async saveSettings(): Promise<void> {
    await this.saveData(this.settings);

    // Update API service settings
    if (this.apiService !== null) {
      this.apiService.updateSettings(this.settings);
    }
  }

  private updateStatusBar(text: string): void {
    this.statusBarItem?.setText(`Scripton: ${text}`);
  }

  public async publishNote(file: TFile, options?: PublishOptions): Promise<void> {
    if (!this.settings.enablePublishing) {
      new Notice('Publishing is disabled in settings');
      return;
    }

    if (!this.settings.apiKey) {
      new Notice('API key not configured. Please check settings.');
      return;
    }

    try {
      this.updateStatusBar('Publishing...');

      const content = await this.app.vault.read(file);
      const processedContent = await this.processContent(content, file, options);

      const publishOptions = {
        title: options?.title || file.basename,
        content: processedContent,
        visibility: options?.visibility || this.settings.defaultVisibility,
        tags: options?.tags || this.extractTags(content),
        includeAttachments: options?.includeAttachments ?? this.settings.includeAttachments,
        preserveLinks: options?.preserveLinks ?? this.settings.preserveLinks,
      };

      if (this.apiService === null) {
        new Notice('API service not initialized');
        return;
      }

      const result = await this.apiService.publishNote(publishOptions);

      if (result.success) {
        new Notice(`Published successfully: ${result.url}`);
        this.updateStatusBar('Published');
      } else {
        new Notice(`Publish failed: ${result.error}`);
        this.updateStatusBar('Failed');
      }
    } catch (error) {
      console.error('Publish error:', error);
      new Notice(`Publish error: ${getErrorMessage(error)}`);
      this.updateStatusBar('Error');
    }
  }

  public async publishFolder(folder: TFolder): Promise<void> {
    if (!this.settings.enablePublishing) {
      new Notice('Publishing is disabled in settings');
      return;
    }

    const files = this.getMarkdownFilesInFolder(folder);

    if (files.length === 0) {
      new Notice('No markdown files found in folder');
      return;
    }

    this.updateStatusBar(`Publishing ${files.length} files...`);

    let published = 0;
    let failed = 0;

    for (const file of files) {
      try {
        await this.publishNote(file);
        published++;
      } catch (error) {
        failed++;
        console.error(`Failed to publish ${file.path}:`, error);
      }
    }

    new Notice(`Published ${published} files, ${failed} failed`);
    this.updateStatusBar(`Batch complete: ${published}/${files.length}`);
  }

  private getMarkdownFilesInFolder(folder: TFolder): TFile[] {
    const files: TFile[] = [];

    const processFolder = (currentFolder: TFolder): void => {
      for (const child of currentFolder.children) {
        if (child instanceof TFile && child.extension === 'md') {
          files.push(child);
        } else if (child instanceof TFolder) {
          processFolder(child);
        }
      }
    };

    processFolder(folder);
    return files;
  }

  private async processContent(
    content: string,
    file: TFile,
    options?: PublishOptions
  ): Promise<string> {
    let processed = content;

    // Strip frontmatter if enabled
    if (options?.stripFrontmatter ?? this.settings.stripFrontmatter) {
      processed = processed.replace(/^---[\s\S]*?---\n?/, '');
    }

    // Convert wiki links if enabled
    if (options?.convertWikiLinks ?? this.settings.convertWikiLinks) {
      processed = this.convertWikiLinksToMarkdown(processed);
    }

    // Process attachments
    if (options?.includeAttachments ?? this.settings.includeAttachments) {
      processed = await this.processAttachments(processed, file);
    }

    return processed;
  }

  private convertWikiLinksToMarkdown(content: string): string {
    // Convert [[link]] to [link](link)
    return content.replace(/\[\[([^\]]+)\]\]/g, (_match, linkText) => {
      const parts = linkText.split('|');
      const link = parts[0].trim();
      const display = parts[1]?.trim() || link;
      return `[${display}](${link})`;
    });
  }

  private async processAttachments(content: string, file: TFile): Promise<string> {
    // Find all attachment references
    const attachmentRegex = /!\[\[([^\]]+)\]\]/g;
    let processedContent = content;

    const matches = content.matchAll(attachmentRegex);
    for (const match of matches) {
      const attachmentName = match[1];
      const attachmentFile = this.app.metadataCache.getFirstLinkpathDest(attachmentName, file.path);

      if (attachmentFile) {
        try {
          // Upload attachment and get URL
          if (this.apiService === null) {
            continue;
          }
          const uploadResult = await this.apiService.uploadAttachment(attachmentFile);
          if (uploadResult.success) {
            processedContent = processedContent.replace(
              match[0],
              `![${attachmentName}](${uploadResult.url})`
            );
          }
        } catch (error) {
          console.error(`Failed to upload attachment ${attachmentName}:`, error);
        }
      }
    }

    return processedContent;
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];

    // Extract from frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
      if (tagsMatch) {
        const tagList = tagsMatch[1].split(',').map((tag) => tag.trim().replace(/["']/g, ''));
        tags.push(...tagList);
      }
    }

    // Extract inline tags
    const inlineTagMatches = content.matchAll(/#[\w/-]+/g);
    for (const match of inlineTagMatches) {
      const tag = match[0].substring(1); // Remove #
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  public async testApiConnection(): Promise<void> {
    if (!this.settings.apiKey) {
      new Notice('API key not configured');
      return;
    }

    try {
      this.updateStatusBar('Testing connection...');
      if (this.apiService === null) {
        new Notice('API service not initialized');
        return;
      }
      const result = await this.apiService.testConnection();

      if (result.success) {
        new Notice('API connection successful');
        this.updateStatusBar('Connected');
      } else {
        new Notice(`API connection failed: ${result.error}`);
        this.updateStatusBar('Connection failed');
      }
    } catch (error) {
      console.error('API test error:', error);
      new Notice(`Connection test error: ${getErrorMessage(error)}`);
      this.updateStatusBar('Test error');
    }
  }
}

interface PublishOptions {
  title?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  tags?: string[];
  includeAttachments?: boolean;
  preserveLinks?: boolean;
  stripFrontmatter?: boolean;
  convertWikiLinks?: boolean;
}

class NoteSelectionModal extends FuzzySuggestModal<TFile> {
  constructor(app: App, private onSelect: (file: TFile) => void) {
    super(app);
    this.setPlaceholder('Select a note to publish...');
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent) {
    this.onSelect(file);
  }
}

class FolderSelectionModal extends FuzzySuggestModal<TFolder> {
  constructor(app: App, private onSelect: (folder: TFolder) => void) {
    super(app);
    this.setPlaceholder('Select a folder to publish...');
  }

  getItems(): TFolder[] {
    return this.app.vault
      .getAllLoadedFiles()
      .filter((file) => file instanceof TFolder) as TFolder[];
  }

  getItemText(folder: TFolder): string {
    return folder.path || '/';
  }

  onChooseItem(folder: TFolder, evt: MouseEvent | KeyboardEvent) {
    this.onSelect(folder);
  }
}

class PublishOptionsModal extends Modal {
  private options: PublishOptions = {};

  constructor(
    app: App,
    private settings: PublisherScriptonSettings,
    private onConfirm: (options: PublishOptions) => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Publish Options' });

    // Title input
    new Setting(contentEl)
      .setName('Title')
      .setDesc('Custom title for the published note')
      .addText((text) =>
        text.onChange((value) => {
          this.options.title = value;
        })
      );

    // Visibility dropdown
    new Setting(contentEl)
      .setName('Visibility')
      .setDesc('Who can see this published note')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('private', 'Private')
          .addOption('unlisted', 'Unlisted')
          .addOption('public', 'Public')
          .setValue(this.settings.defaultVisibility)
          .onChange((value: 'public' | 'private' | 'unlisted') => {
            this.options.visibility = value;
          })
      );

    // Tags input
    new Setting(contentEl)
      .setName('Tags')
      .setDesc('Comma-separated tags')
      .addText((text) =>
        text.setPlaceholder('tag1, tag2, tag3').onChange((value) => {
          this.options.tags = value
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag);
        })
      );

    // Include attachments toggle
    new Setting(contentEl)
      .setName('Include Attachments')
      .setDesc('Upload and include image attachments')
      .addToggle((toggle) =>
        toggle.setValue(this.settings.includeAttachments).onChange((value) => {
          this.options.includeAttachments = value;
        })
      );

    // Strip frontmatter toggle
    new Setting(contentEl)
      .setName('Strip Frontmatter')
      .setDesc('Remove YAML frontmatter from published content')
      .addToggle((toggle) =>
        toggle.setValue(this.settings.stripFrontmatter).onChange((value) => {
          this.options.stripFrontmatter = value;
        })
      );

    // Convert wiki links toggle
    new Setting(contentEl)
      .setName('Convert Wiki Links')
      .setDesc('Convert [[wiki links]] to standard markdown links')
      .addToggle((toggle) =>
        toggle.setValue(this.settings.convertWikiLinks).onChange((value) => {
          this.options.convertWikiLinks = value;
        })
      );

    // Buttons
    const buttonContainer = contentEl.createEl('div', {
      attr: { style: 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;' },
    });

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.onclick = () => this.close();

    const publishButton = buttonContainer.createEl('button', { text: 'Publish' });
    publishButton.style.backgroundColor = 'var(--interactive-accent)';
    publishButton.style.color = 'var(--text-on-accent)';
    publishButton.onclick = () => {
      this.onConfirm(this.options);
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class PublishLogsModal extends Modal {
  constructor(app: App, private logs: any[]) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Publish Logs' });

    if (this.logs.length === 0) {
      contentEl.createEl('p', { text: 'No logs available.' });
      return;
    }

    const logsContainer = contentEl.createEl('div', {
      attr: {
        style:
          'max-height: 400px; overflow-y: auto; background: var(--background-secondary); padding: 10px; border-radius: 6px; font-family: var(--font-monospace);',
      },
    });

    for (const log of this.logs) {
      const logEntry = logsContainer.createEl('div', {
        attr: { style: 'margin-bottom: 10px; padding: 5px; border-radius: 3px;' },
      });

      const timestamp = logEntry.createEl('span', {
        text: new Date(log.timestamp).toLocaleString(),
        attr: { style: 'color: var(--text-muted); margin-right: 10px;' },
      });

      const level = logEntry.createEl('span', {
        text: `[${log.level.toUpperCase()}]`,
        attr: {
          style: `color: ${this.getLevelColor(log.level)}; margin-right: 10px; font-weight: bold;`,
        },
      });

      const message = logEntry.createEl('span', { text: log.message });

      if (log.error) {
        const errorEl = logEntry.createEl('div', {
          text: log.error,
          attr: { style: 'color: var(--text-error); margin-top: 5px; font-size: 0.9em;' },
        });
      }
    }

    // Close button
    const closeButton = contentEl.createEl('button', {
      text: 'Close',
      attr: { style: 'margin-top: 15px;' },
    });
    closeButton.onclick = () => this.close();
  }

  private getLevelColor(level: string): string {
    switch (level) {
      case 'error':
        return 'var(--text-error)';
      case 'warn':
        return 'var(--text-warning)';
      case 'info':
        return 'var(--text-accent)';
      case 'debug':
        return 'var(--text-muted)';
      default:
        return 'var(--text-normal)';
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class PublisherScriptonSettingTab extends PluginSettingTab {
  plugin: PublisherScriptonPlugin;

  constructor(app: App, plugin: PublisherScriptonPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Publisher Scripton Settings' });

    // API Settings
    containerEl.createEl('h3', { text: 'API Settings' });

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your scripton.cloud API key')
      .addText((text) =>
        text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button
          .setButtonText('Test Connection')
          .setTooltip('Test API connection')
          .onClick(async () => {
            await this.plugin.testApiConnection();
          })
      );

    new Setting(containerEl)
      .setName('API Endpoint')
      .setDesc('The scripton.cloud API endpoint URL')
      .addText((text) =>
        text
          .setPlaceholder('https://api.scripton.cloud')
          .setValue(this.plugin.settings.apiEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.apiEndpoint = value;
            await this.plugin.saveSettings();
          })
      );

    // Publishing Settings
    containerEl.createEl('h3', { text: 'Publishing Settings' });

    new Setting(containerEl)
      .setName('Enable Publishing')
      .setDesc('Enable or disable the publishing functionality')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enablePublishing).onChange(async (value) => {
          this.plugin.settings.enablePublishing = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Default Visibility')
      .setDesc('Default visibility for published notes')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('private', 'Private')
          .addOption('unlisted', 'Unlisted')
          .addOption('public', 'Public')
          .setValue(this.plugin.settings.defaultVisibility)
          .onChange(async (value: 'public' | 'private' | 'unlisted') => {
            this.plugin.settings.defaultVisibility = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Include Attachments')
      .setDesc('Upload and include image attachments by default')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeAttachments).onChange(async (value) => {
          this.plugin.settings.includeAttachments = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Preserve Links')
      .setDesc('Preserve internal links in published content')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.preserveLinks).onChange(async (value) => {
          this.plugin.settings.preserveLinks = value;
          await this.plugin.saveSettings();
        })
      );

    // Content Processing
    containerEl.createEl('h3', { text: 'Content Processing' });

    new Setting(containerEl)
      .setName('Strip Frontmatter')
      .setDesc('Remove YAML frontmatter from published content')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.stripFrontmatter).onChange(async (value) => {
          this.plugin.settings.stripFrontmatter = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Convert Wiki Links')
      .setDesc('Convert [[wiki links]] to standard markdown links')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.convertWikiLinks).onChange(async (value) => {
          this.plugin.settings.convertWikiLinks = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Custom CSS Styles')
      .setDesc('Custom CSS to apply to published content')
      .addTextArea((text) =>
        text
          .setPlaceholder('/* Custom CSS styles */\n.my-class { color: red; }')
          .setValue(this.plugin.settings.customCssStyles)
          .onChange(async (value) => {
            this.plugin.settings.customCssStyles = value;
            await this.plugin.saveSettings();
          })
      );

    // Auto-publishing
    containerEl.createEl('h3', { text: 'Auto-Publishing' });

    new Setting(containerEl)
      .setName('Enable Auto Publish')
      .setDesc('Automatically publish notes based on folder or tags')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoPublish).onChange(async (value) => {
          this.plugin.settings.enableAutoPublish = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Auto Publish Folders')
      .setDesc('Comma-separated list of folder paths to auto-publish')
      .addText((text) =>
        text
          .setPlaceholder('public, blog, articles')
          .setValue(this.plugin.settings.autoPublishFolders.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.autoPublishFolders = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto Publish Tags')
      .setDesc('Comma-separated list of tags to auto-publish')
      .addText((text) =>
        text
          .setPlaceholder('publish, blog, public')
          .setValue(this.plugin.settings.autoPublishTags.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.autoPublishTags = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s);
            await this.plugin.saveSettings();
          })
      );

    // Retry Settings
    containerEl.createEl('h3', { text: 'Retry Settings' });

    new Setting(containerEl)
      .setName('Enable Retry')
      .setDesc('Automatically retry failed uploads')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableRetry).onChange(async (value) => {
          this.plugin.settings.enableRetry = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Max Retries')
      .setDesc('Maximum number of retry attempts')
      .addSlider((slider) =>
        slider
          .setLimits(1, 10, 1)
          .setValue(this.plugin.settings.maxRetries)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxRetries = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Retry Delay (ms)')
      .setDesc('Delay between retry attempts')
      .addSlider((slider) =>
        slider
          .setLimits(500, 10000, 500)
          .setValue(this.plugin.settings.retryDelay)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.retryDelay = value;
            await this.plugin.saveSettings();
          })
      );

    // Log Settings
    containerEl.createEl('h3', { text: 'Log Settings' });

    new Setting(containerEl)
      .setName('Enable Detailed Logs')
      .setDesc('Enable detailed logging for troubleshooting')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableDetailedLogs).onChange(async (value) => {
          this.plugin.settings.enableDetailedLogs = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Log Level')
      .setDesc('Minimum log level to record')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('error', 'Error')
          .addOption('warn', 'Warning')
          .addOption('info', 'Info')
          .addOption('debug', 'Debug')
          .setValue(this.plugin.settings.logLevel)
          .onChange(async (value: 'error' | 'warn' | 'info' | 'debug') => {
            this.plugin.settings.logLevel = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
// Test comment
