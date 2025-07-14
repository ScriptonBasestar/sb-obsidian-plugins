import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from 'obsidian';
import { TemplateParser, ParsedTemplate } from './template-parser';
import { TemplateCache } from './template-cache';

interface AwesomePluginSettings {
  templateFolder: string;
  autoMetadata: boolean;
  gitSync: boolean;
  publishEnabled: boolean;
}

const DEFAULT_SETTINGS: AwesomePluginSettings = {
  templateFolder: 'templates',
  autoMetadata: true,
  gitSync: false,
  publishEnabled: false,
};

export default class AwesomePlugin extends Plugin {
  settings: AwesomePluginSettings;
  templateCache: TemplateCache;

  async onload() {
    await this.loadSettings();

    // Initialize template cache
    this.templateCache = new TemplateCache(this.app.vault, this.settings.templateFolder);

    this.addCommand({
      id: 'insert-template',
      name: 'Insert Template',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.insertTemplate(editor);
      },
    });

    this.addCommand({
      id: 'auto-metadata',
      name: 'Auto-generate Metadata',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.autoGenerateMetadata(editor, view);
      },
    });

    this.addCommand({
      id: 'git-sync',
      name: 'Git Sync',
      callback: () => {
        this.gitSync();
      },
    });

    this.addCommand({
      id: 'publish-note',
      name: 'Publish Note',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.publishNote(view);
      },
    });

    this.addSettingTab(new AwesomePluginSettingTab(this.app, this));

    this.addRibbonIcon('dice', 'Awesome Plugin', (evt: MouseEvent) => {
      new Notice('Awesome Plugin is active!');
    });

    // Preload templates for better performance
    this.templateCache.preloadTemplates();
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Update template cache if folder changed
    if (this.templateCache) {
      this.templateCache.updateTemplateFolder(this.settings.templateFolder);
    }
  }

  private async insertTemplate(editor: Editor) {
    const templates = await this.getTemplates();
    if (templates.length === 0) {
      new Notice('No templates found in templates folder');
      return;
    }

    new TemplateModal(this.app, templates, (template) => {
      const cursor = editor.getCursor();
      editor.replaceRange(template.content, cursor);
      new Notice(`Inserted template: ${template.name}`);
    }).open();
  }

  private async getTemplates(): Promise<Array<ParsedTemplate>> {
    // Use cache if available
    if (this.templateCache) {
      try {
        const cachedTemplates = await this.templateCache.getTemplates();

        // If no cached templates and no folder, return defaults
        if (cachedTemplates.length === 0) {
          const folder = this.app.vault.getAbstractFileByPath(this.settings.templateFolder);
          if (!folder) {
            return this.getDefaultTemplates();
          }
        }

        return cachedTemplates.length > 0 ? cachedTemplates : this.getDefaultTemplates();
      } catch (error) {
        console.error('Failed to load templates from cache:', error);
        return this.getDefaultTemplates();
      }
    }

    // Fallback to direct loading (should not happen normally)
    return this.getTemplatesDirectly();
  }

  private async getTemplatesDirectly(): Promise<Array<ParsedTemplate>> {
    const templateFolder = this.settings.templateFolder;
    const vault = this.app.vault;

    try {
      // Check if template folder exists
      const folder = vault.getAbstractFileByPath(templateFolder);
      if (!folder || !(folder instanceof this.app.vault.adapter.fs?.Folder || folder.children)) {
        // Return default templates if folder doesn't exist
        return this.getDefaultTemplates();
      }

      const templates: Array<ParsedTemplate> = [];

      // Scan folder for markdown files
      const files = vault
        .getFiles()
        .filter((file) => file.path.startsWith(templateFolder) && file.extension === 'md');

      for (const file of files) {
        try {
          const content = await vault.read(file);
          const parsedTemplate = TemplateParser.parseTemplate(file.basename, content, file.path);

          if (!parsedTemplate.isValid) {
            console.warn(`Template validation failed for ${file.path}:`, parsedTemplate.errors);
            // Still include invalid templates but mark them
            new Notice(
              `Template validation warnings in ${file.basename}: ${parsedTemplate.errors.join(
                ', '
              )}`
            );
          }

          templates.push(parsedTemplate);
        } catch (error) {
          console.warn(`Failed to read template file: ${file.path}`, error);
        }
      }

      // If no templates found in folder, return defaults
      if (templates.length === 0) {
        return this.getDefaultTemplates();
      }

      return templates;
    } catch (error) {
      console.error('Failed to load templates from folder:', error);
      return this.getDefaultTemplates();
    }
  }

  private getDefaultTemplates(): Array<ParsedTemplate> {
    const defaultTemplates = [
      {
        name: 'Daily Note',
        content: `---
title: Daily Note Template
description: A template for daily notes with tasks and reflection
category: daily
tags: [daily, tasks, reflection]
variables: [date]
---

# {{date}}

## Tasks
- [ ] 

## Notes

## Reflection
`,
        path: 'built-in/daily-note.md',
      },
      {
        name: 'Meeting Notes',
        content: `---
title: Meeting Notes Template
description: A template for meeting notes with agenda and action items
category: meeting
tags: [meeting, notes, action-items]
variables: [title, date]
---

# Meeting: {{title}}

**Date:** {{date}}
**Attendees:** 

## Agenda

## Notes

## Action Items
- [ ] 
`,
        path: 'built-in/meeting-notes.md',
      },
    ];

    return defaultTemplates.map((template) =>
      TemplateParser.parseTemplate(template.name, template.content, template.path)
    );
  }

  private autoGenerateMetadata(editor: Editor, view: MarkdownView) {
    if (!this.settings.autoMetadata) {
      new Notice('Auto metadata is disabled in settings');
      return;
    }

    const file = view.file;
    if (!file) return;

    const metadata = {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: [],
      title: file.basename,
    };

    const frontmatter = `---\n${Object.entries(metadata)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? '[]' : value}`)
      .join('\n')}\n---\n\n`;

    const content = editor.getValue();
    if (!content.startsWith('---')) {
      editor.setValue(frontmatter + content);
      new Notice('Metadata added');
    }
  }

  private async gitSync() {
    if (!this.settings.gitSync) {
      new Notice('Git sync is disabled in settings');
      return;
    }

    new Notice('Git sync feature coming soon...');
  }

  private publishNote(view: MarkdownView) {
    if (!this.settings.publishEnabled) {
      new Notice('Publishing is disabled in settings');
      return;
    }

    new Notice('Publish feature coming soon...');
  }
}

class TemplateModal extends Modal {
  templates: Array<ParsedTemplate>;
  onChoose: (template: ParsedTemplate) => void;

  constructor(
    app: App,
    templates: Array<ParsedTemplate>,
    onChoose: (template: ParsedTemplate) => void
  ) {
    super(app);
    this.templates = templates;
    this.onChoose = onChoose;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Choose Template' });

    this.templates.forEach((template) => {
      const templateEl = contentEl.createEl('div', { cls: 'template-item' });

      // Add validation status indicator
      if (!template.isValid) {
        templateEl.style.border = '1px solid var(--text-error)';
        templateEl.style.borderRadius = '4px';
        templateEl.style.padding = '8px';
        templateEl.style.marginBottom = '8px';
      }

      const headerEl = templateEl.createEl('div', { cls: 'template-header' });

      const button = headerEl.createEl('button', {
        text: template.name,
        cls: 'mod-cta',
      });

      // Show validation status
      if (!template.isValid) {
        const warningEl = headerEl.createEl('span', {
          text: ' ⚠️',
          cls: 'template-warning',
        });
        warningEl.title = template.errors.join('; ');
      }

      // Show template description from metadata
      if (template.metadata.description) {
        const descEl = templateEl.createEl('div', {
          text: template.metadata.description,
          cls: 'template-description',
        });
        descEl.style.fontSize = '0.85em';
        descEl.style.color = 'var(--text-muted)';
        descEl.style.marginTop = '2px';
      }

      // Show template variables
      if (template.variables.length > 0) {
        const varsEl = templateEl.createEl('div', {
          text: `Variables: ${template.variables.join(', ')}`,
          cls: 'template-variables',
        });
        varsEl.style.fontSize = '0.8em';
        varsEl.style.color = 'var(--text-accent)';
        varsEl.style.marginTop = '2px';
      }

      // Show template source (file path or built-in)
      const pathEl = templateEl.createEl('div', {
        text: template.path.startsWith('built-in/') ? 'Built-in template' : template.path,
        cls: 'template-path',
      });
      pathEl.style.fontSize = '0.8em';
      pathEl.style.color = 'var(--text-muted)';
      pathEl.style.marginTop = '4px';

      button.onclick = () => {
        this.onChoose(template);
        this.close();
      };
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class AwesomePluginSettingTab extends PluginSettingTab {
  plugin: AwesomePlugin;

  constructor(app: App, plugin: AwesomePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Awesome Plugin Settings' });

    new Setting(containerEl)
      .setName('Template Folder')
      .setDesc('Folder to look for templates')
      .addText((text) =>
        text
          .setPlaceholder('templates')
          .setValue(this.plugin.settings.templateFolder)
          .onChange(async (value) => {
            this.plugin.settings.templateFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto Metadata')
      .setDesc('Automatically generate frontmatter metadata')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoMetadata).onChange(async (value) => {
          this.plugin.settings.autoMetadata = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Git Sync')
      .setDesc('Enable git synchronization features')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.gitSync).onChange(async (value) => {
          this.plugin.settings.gitSync = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Publishing')
      .setDesc('Enable publishing to static sites')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.publishEnabled).onChange(async (value) => {
          this.plugin.settings.publishEnabled = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
