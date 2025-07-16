import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  Notice,
  TAbstractFile,
  moment,
} from 'obsidian';

import * as yaml from 'yaml';

import {
  FrontmatterData,
  ParsedContent,
} from './types';

interface MetadataManagerSettings {
  // Auto-insert settings
  enableAutoInsert: boolean;
  autoInsertOnNewFiles: boolean;
  autoInsertDelay: number;

  // Template settings
  defaultTemplate: string;
  templatesByFolder: Record<string, string>;

  // Field settings
  requiredFields: string[];
  optionalFields: string[];

  // Auto-generation settings
  autoGenerateCreated: boolean;
  autoGenerateModified: boolean;
  autoGenerateId: boolean;

  // Formatting settings
  enableAutoFormat: boolean;
  fieldOrder: string[];
  dateFormat: string;
}

const DEFAULT_SETTINGS: MetadataManagerSettings = {
  // Auto-insert settings
  enableAutoInsert: true,
  autoInsertOnNewFiles: true,
  autoInsertDelay: 1000,

  // Template settings
  defaultTemplate: `---
title: 
created: {{created}}
modified: {{modified}}
tags: []
---`,
  templatesByFolder: {},

  // Field settings
  requiredFields: ['title', 'created'],
  optionalFields: ['tags', 'author', 'description'],

  // Auto-generation settings
  autoGenerateCreated: true,
  autoGenerateModified: true,
  autoGenerateId: false,

  // Formatting settings
  enableAutoFormat: true,
  fieldOrder: ['title', 'created', 'modified', 'tags', 'author', 'description'],
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
};

export default class MetadataManagerPlugin extends Plugin {
  public settings: MetadataManagerSettings;
  private newFileQueue = new Set<string>();

  public async onload(): Promise<void> {
    await this.loadSettings();

    // Register event handlers
    this.registerEvent(this.app.vault.on('create', (file) => this.onFileCreate(file)));

    this.registerEvent(this.app.vault.on('modify', (file) => this.onFileModify(file)));

    // Commands
    this.addCommand({
      id: 'insert-frontmatter',
      name: 'Insert Frontmatter Template',
      editorCallback: (editor, view) => {
        void this.insertFrontmatter(view.file);
      },
    });

    this.addCommand({
      id: 'format-frontmatter',
      name: 'Format Frontmatter',
      editorCallback: (editor, view) => {
        void this.formatFrontmatter(view.file);
      },
    });

    this.addCommand({
      id: 'lint-frontmatter',
      name: 'Lint Frontmatter',
      editorCallback: (editor, view) => {
        void this.lintFrontmatter(view.file);
      },
    });

    // Settings tab
    this.addSettingTab(new MetadataManagerSettingTab(this.app, this));

    console.log('Metadata Manager plugin loaded');
  }

  public onunload(): void {
    console.log('Metadata Manager plugin unloaded');
  }

  public async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data as Partial<MetadataManagerSettings> | null);
  }

  public async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async onFileCreate(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || !file.name.endsWith('.md')) {
      return;
    }

    if (!this.settings.enableAutoInsert || !this.settings.autoInsertOnNewFiles) {
      return;
    }

    // Add to queue and process after delay
    this.newFileQueue.add(file.path);

    setTimeout(() => {
      if (this.newFileQueue.has(file.path)) {
        this.newFileQueue.delete(file.path);
        await this.processNewFile(file);
      }
    }, this.settings.autoInsertDelay);
  }

  private async onFileModify(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || !file.name.endsWith('.md')) {
      return;
    }

    // Update modified timestamp if auto-generation is enabled
    if (this.settings.autoGenerateModified) {
      await this.updateModifiedTimestamp(file);
    }
  }

  private async processNewFile(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.read(file);

      // Check if file already has frontmatter
      if (content.startsWith('---')) {
        return;
      }

      // Check if file is empty or only has whitespace
      if (content.trim().length === 0) {
        await this.insertFrontmatter(file);
      } else {
        // File has content but no frontmatter - ask user
        const shouldInsert = await this.confirmFrontmatterInsertion(file);
        if (shouldInsert) {
          await this.insertFrontmatter(file);
        }
      }
    } catch (error) {
      console.error('Error processing new file:', error);
    }
  }

  private async confirmFrontmatterInsertion(file: TFile): Promise<boolean> {
    return new Promise((resolve) => {
      const notice = new Notice(
        `Add frontmatter to "${file.name}"? Click to confirm, or wait 5 seconds to skip.`,
        5000
      );

      notice.noticeEl.addEventListener('click', () => {
        notice.hide();
        resolve(true);
      });

      setTimeout(() => resolve(false), 5000);
    });
  }

  public async insertFrontmatter(file: TFile | null): Promise<void> {
    try {
      const content = await this.app.vault.read(file);

      // Skip if already has frontmatter
      if (content.startsWith('---')) {
        new Notice('File already has frontmatter');
        return;
      }

      const template = this.getTemplateForFile(file);
      const processedTemplate = this.processTemplate(template, file);

      const newContent = `${processedTemplate}\n\n${content}`;
      await this.app.vault.modify(file, newContent);

      new Notice(`Frontmatter added to ${file.name}`);
    } catch (error) {
      console.error('Error inserting frontmatter:', error);
      new Notice('Failed to insert frontmatter');
    }
  }

  private getTemplateForFile(file: TFile): string {
    // Check for folder-specific template
    const folderPath = file.parent?.path || '';

    for (const [folder, template] of Object.entries(this.settings.templatesByFolder)) {
      if (folderPath.startsWith(folder)) {
        return template;
      }
    }

    return this.settings.defaultTemplate;
  }

  private processTemplate(template: string, file: TFile): string {
    const now = moment();
    const fileName = file.basename;

    return template
      .replace(/\{\{title\}\}/g, fileName)
      .replace(/\{\{created\}\}/g, now.format(this.settings.dateFormat))
      .replace(/\{\{modified\}\}/g, now.format(this.settings.dateFormat))
      .replace(/\{\{date\}\}/g, now.format('YYYY-MM-DD'))
      .replace(/\{\{time\}\}/g, now.format('HH:mm:ss'))
      .replace(/\{\{id\}\}/g, this.generateId())
      .replace(/\{\{filename\}\}/g, fileName)
      .replace(/\{\{folder\}\}/g, file.parent?.name || '');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public async formatFrontmatter(file: TFile | null): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const { frontmatter, body } = this.parseFrontmatter(content);

      if (!frontmatter) {
        new Notice('No frontmatter found');
        return;
      }

      const formattedFrontmatter = this.formatFrontmatterObject(frontmatter);
      const newContent = `---\n${formattedFrontmatter}\n---\n\n${body}`;

      await this.app.vault.modify(file, newContent);
      new Notice(`Frontmatter formatted in ${file.name}`);
    } catch (error) {
      console.error('Error formatting frontmatter:', error);
      new Notice('Failed to format frontmatter');
    }
  }

  public async lintFrontmatter(file: TFile | null): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const { frontmatter } = this.parseFrontmatter(content);

      if (!frontmatter) {
        new Notice('No frontmatter found');
        return;
      }

      const issues = this.validateFrontmatter(frontmatter);

      if (issues.length === 0) {
        new Notice('Frontmatter is valid');
      } else {
        new Notice(`Frontmatter issues found: ${issues.join(', ')}`);
      }
    } catch (error) {
      console.error('Error linting frontmatter:', error);
      new Notice('Failed to lint frontmatter');
    }
  }

  private parseFrontmatter(content: string): ParsedContent {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match === null) {
      return { frontmatter: null, body: content };
    }

    try {
      const frontmatter = yaml.parse(match[1]) as FrontmatterData;
      return { frontmatter, body: match[2] || '' };
    } catch (error) {
      console.error('Error parsing frontmatter:', error);
      return { frontmatter: null, body: content };
    }
  }

  private formatFrontmatterObject(frontmatter: FrontmatterData): string {
    const orderedData: FrontmatterData = {};

    // Add fields in specified order
    for (const field of this.settings.fieldOrder) {
      if (field in frontmatter && frontmatter[field] !== undefined) {
        orderedData[field] = frontmatter[field];
      }
    }

    // Add remaining fields
    for (const [key, value] of Object.entries(frontmatter)) {
      if (!(key in orderedData)) {
        orderedData[key] = value;
      }
    }

    return yaml.stringify(orderedData).trim();
  }

  private validateFrontmatter(frontmatter: FrontmatterData): string[] {
    const issues: string[] = [];

    // Check required fields
    for (const field of this.settings.requiredFields) {
      if (!(field in frontmatter) || frontmatter[field] === '' || frontmatter[field] === null) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Check field types
    if (frontmatter.created !== undefined && !this.isValidDate(frontmatter.created)) {
      issues.push('Invalid created date format');
    }

    if (frontmatter.modified !== undefined && !this.isValidDate(frontmatter.modified)) {
      issues.push('Invalid modified date format');
    }

    if (frontmatter.tags !== undefined && !Array.isArray(frontmatter.tags)) {
      issues.push('Tags should be an array');
    }

    return issues;
  }

  private isValidDate(dateString: string): boolean {
    const date = moment(dateString, this.settings.dateFormat, true);
    return date.isValid();
  }

  private async updateModifiedTimestamp(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const { frontmatter, body } = this.parseFrontmatter(content);

      if (frontmatter === null) {
        return;
      }

      frontmatter.modified = moment().format(this.settings.dateFormat);
      const formattedFrontmatter = this.formatFrontmatterObject(frontmatter);
      const newContent = `---\n${formattedFrontmatter}\n---\n\n${body}`;

      await this.app.vault.modify(file, newContent);
    } catch (error) {
      console.error('Error updating modified timestamp:', error);
    }
  }
}

class MetadataManagerSettingTab extends PluginSettingTab {
  public plugin: MetadataManagerPlugin;

  constructor(app: App, plugin: MetadataManagerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  public display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Metadata Manager Settings' });

    // Auto-insert settings
    containerEl.createEl('h3', { text: 'Auto-Insert Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Insert')
      .setDesc('Automatically insert frontmatter in new files')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoInsert).onChange(async (value) => {
          this.plugin.settings.enableAutoInsert = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Auto Insert on New Files')
      .setDesc('Insert frontmatter when creating new markdown files')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoInsertOnNewFiles).onChange(async (value) => {
          this.plugin.settings.autoInsertOnNewFiles = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Auto Insert Delay (ms)')
      .setDesc('Delay before inserting frontmatter in new files')
      .addSlider((slider) =>
        slider
          .setLimits(500, 5000, 500)
          .setValue(this.plugin.settings.autoInsertDelay)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.autoInsertDelay = value;
            await this.plugin.saveSettings();
          })
      );

    // Template settings
    containerEl.createEl('h3', { text: 'Template Settings' });

    new Setting(containerEl)
      .setName('Default Template')
      .setDesc('Default frontmatter template for new files')
      .addTextArea((text) =>
        text
          .setPlaceholder(
            '---\ntitle: \ncreated: {{created}}\nmodified: {{modified}}\ntags: []\n---'
          )
          .setValue(this.plugin.settings.defaultTemplate)
          .onChange(async (value) => {
            this.plugin.settings.defaultTemplate = value;
            await this.plugin.saveSettings();
          })
      );

    // Auto-generation settings
    containerEl.createEl('h3', { text: 'Auto-Generation Settings' });

    new Setting(containerEl)
      .setName('Auto Generate Created')
      .setDesc('Automatically add created timestamp')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoGenerateCreated).onChange(async (value) => {
          this.plugin.settings.autoGenerateCreated = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Auto Generate Modified')
      .setDesc('Automatically update modified timestamp on file changes')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoGenerateModified).onChange(async (value) => {
          this.plugin.settings.autoGenerateModified = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Date Format')
      .setDesc('Format for date fields (using moment.js format)')
      .addText((text) =>
        text
          .setPlaceholder('YYYY-MM-DD HH:mm:ss')
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value;
            await this.plugin.saveSettings();
          })
      );

    // Field settings
    containerEl.createEl('h3', { text: 'Field Settings' });

    new Setting(containerEl)
      .setName('Required Fields')
      .setDesc('Comma-separated list of required frontmatter fields')
      .addText((text) =>
        text
          .setPlaceholder('title, created')
          .setValue(this.plugin.settings.requiredFields.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.requiredFields = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Optional Fields')
      .setDesc('Comma-separated list of optional frontmatter fields')
      .addText((text) =>
        text
          .setPlaceholder('tags, author, description')
          .setValue(this.plugin.settings.optionalFields.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.optionalFields = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s);
            await this.plugin.saveSettings();
          })
      );

    // Formatting settings
    containerEl.createEl('h3', { text: 'Formatting Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Format')
      .setDesc('Automatically format frontmatter when saving')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoFormat).onChange(async (value) => {
          this.plugin.settings.enableAutoFormat = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Field Order')
      .setDesc('Comma-separated list defining the order of frontmatter fields')
      .addText((text) =>
        text
          .setPlaceholder('title, created, modified, tags')
          .setValue(this.plugin.settings.fieldOrder.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.fieldOrder = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s);
            await this.plugin.saveSettings();
          })
      );
  }
}
