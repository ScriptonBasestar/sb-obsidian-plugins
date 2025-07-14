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
import { TemplateEngine, TemplateVariables } from './template-engine';

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
  templateEngine: TemplateEngine;
  private templateCommandsRegistered = false;

  async onload() {
    await this.loadSettings();

    // Initialize template cache and engine
    this.templateCache = new TemplateCache(this.app.vault, this.settings.templateFolder);
    this.templateEngine = new TemplateEngine();

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

    this.addRibbonIcon('file-plus', 'Insert Template', (evt: MouseEvent) => {
      this.openTemplateModal();
    });

    // Preload templates for better performance
    this.templateCache.preloadTemplates();
    
    // Register individual template commands
    this.registerTemplateCommands();
  }

  onunload() {}

  private async openTemplateModal() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    
    if (!activeView) {
      // No active editor, create new file with template
      this.createNewFileWithTemplate();
      return;
    }

    // Active editor exists, insert template
    const editor = activeView.editor;
    this.insertTemplate(editor);
  }

  private async createNewFileWithTemplate() {
    const templates = await this.getTemplates();
    if (templates.length === 0) {
      new Notice('No templates found in templates folder');
      return;
    }

    new TemplateModal(this.app, templates, async (template) => {
      await this.createNewFileWithTemplateEngine(template);
    }, this.templateEngine).open();
  }

  private async registerTemplateCommands() {
    // Only register template commands once during plugin load
    if (this.templateCommandsRegistered) {
      return;
    }

    try {
      const templates = await this.getTemplates();
      
      for (const template of templates) {
        // Register command for inserting template in current editor
        this.addCommand({
          id: `insert-template-${this.sanitizeId(template.name)}`,
          name: `Insert Template: ${template.name}`,
          editorCallback: async (editor: Editor, view: MarkdownView) => {
            await this.insertTemplateWithEngine(editor, template);
          },
        });

        // Register command for creating new file with template
        this.addCommand({
          id: `new-file-template-${this.sanitizeId(template.name)}`,
          name: `New File with Template: ${template.name}`,
          callback: async () => {
            await this.createNewFileWithTemplateEngine(template);
          },
        });
      }
      
      this.templateCommandsRegistered = true;
      console.log(`Registered ${templates.length * 2} template commands`);
    } catch (error) {
      console.error('Failed to register template commands:', error);
    }
  }

  private sanitizeId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  private async insertTemplateWithEngine(editor: Editor, template: ParsedTemplate) {
    try {
      // Get user input for template variables if needed
      const userVariables = await this.promptForTemplateVariables(template);
      
      // Render template with engine
      const renderedContent = this.templateEngine.renderTemplate(template, userVariables);
      
      // Insert at cursor position
      const cursor = editor.getCursor();
      editor.replaceRange(renderedContent, cursor);
      
      new Notice(`Inserted template: ${template.name}`);
    } catch (error) {
      console.error('Template insertion error:', error);
      new Notice(`Failed to insert template: ${error.message}`);
      
      // Fallback to raw template content
      const cursor = editor.getCursor();
      editor.replaceRange(template.content, cursor);
    }
  }

  private async createNewFileWithTemplateEngine(template: ParsedTemplate) {
    try {
      // Get user input for template variables if needed
      const userVariables = await this.promptForTemplateVariables(template);
      
      // Render template with engine
      const renderedContent = this.templateEngine.renderTemplate(template, userVariables);
      
      // Create new file
      const fileName = userVariables?.title 
        ? `${userVariables.title}.md`
        : `${template.name}-${Date.now()}.md`;
        
      const newFile = await this.app.vault.create(fileName, renderedContent);
      
      // Open the new file
      await this.app.workspace.getLeaf().openFile(newFile);
      
      new Notice(`Created new file with template: ${template.name}`);
    } catch (error) {
      console.error('Template file creation error:', error);
      new Notice(`Failed to create new file: ${error.message}`);
    }
  }

  private async promptForTemplateVariables(template: ParsedTemplate): Promise<TemplateVariables> {
    const userVariables: TemplateVariables = {};
    
    // Check if template has variables that need user input
    const interactiveVariables = template.variables.filter(variable => 
      !['date', 'time', 'datetime', 'today', 'tomorrow', 'yesterday'].includes(variable.toLowerCase())
    );

    if (interactiveVariables.length === 0) {
      return userVariables;
    }

    // For now, use simple prompts for each variable
    // In a future version, this could be a more sophisticated modal
    for (const variable of interactiveVariables) {
      try {
        // Use a simple modal to get user input
        const value = await this.showVariableInputModal(variable);
        if (value !== null) {
          userVariables[variable] = value;
        }
      } catch (error) {
        console.warn(`Failed to get input for variable ${variable}:`, error);
      }
    }

    return userVariables;
  }

  private async showVariableInputModal(variableName: string): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = new VariableInputModal(this.app, variableName, (value) => {
        resolve(value);
      });
      modal.open();
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Update template cache if folder changed
    if (this.templateCache) {
      this.templateCache.updateTemplateFolder(this.settings.templateFolder);
      // Note: Template commands will be updated on next plugin reload
    }
  }

  private async insertTemplate(editor: Editor) {
    const templates = await this.getTemplates();
    if (templates.length === 0) {
      new Notice('No templates found in templates folder');
      return;
    }

    new TemplateModal(this.app, templates, async (template) => {
      await this.insertTemplateWithEngine(editor, template);
    }, this.templateEngine).open();
  }

  private async getTemplates(): Promise<Array<ParsedTemplate>> {
    // Use cache for file-based templates
    if (this.templateCache) {
      try {
        const cachedTemplates = await this.templateCache.getTemplates();

        // Only return defaults if template folder doesn't exist AND no templates found
        if (cachedTemplates.length === 0) {
          const folder = this.app.vault.getAbstractFileByPath(this.settings.templateFolder);
          if (!folder) {
            new Notice(`Template folder '${this.settings.templateFolder}' not found. Using built-in templates.`);
            return this.getDefaultTemplates();
          }
        }

        return cachedTemplates;
      } catch (error) {
        console.error('Failed to load templates from cache:', error);
        new Notice('Failed to load templates. Using built-in templates.');
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
      if (!folder) {
        new Notice(`Template folder '${templateFolder}' not found. Using built-in templates.`);
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

      return templates;
    } catch (error) {
      console.error('Failed to load templates from folder:', error);
      new Notice('Failed to load templates from folder. Using built-in templates.');
      return this.getDefaultTemplates();
    }
  }

  /**
   * Fallback templates used only when template folder doesn't exist or loading fails
   * These are minimal built-in templates to ensure the plugin always works
   */
  private getDefaultTemplates(): Array<ParsedTemplate> {
    console.log('Using built-in fallback templates');
    
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
      tags: [] as string[],
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
  templateEngine: TemplateEngine;

  constructor(
    app: App,
    templates: Array<ParsedTemplate>,
    onChoose: (template: ParsedTemplate) => void,
    templateEngine?: TemplateEngine
  ) {
    super(app);
    this.templates = templates;
    this.onChoose = onChoose;
    this.templateEngine = templateEngine || new TemplateEngine();
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

class VariableInputModal extends Modal {
  variableName: string;
  onSubmit: (value: string | null) => void;
  inputValue = '';

  constructor(app: App, variableName: string, onSubmit: (value: string | null) => void) {
    super(app);
    this.variableName = variableName;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: `Enter value for: ${this.variableName}` });

    // Create input container
    const inputContainer = contentEl.createDiv({ cls: 'variable-input-container' });
    
    const inputEl = inputContainer.createEl('input', {
      type: 'text',
      placeholder: `Enter ${this.variableName}...`,
      cls: 'variable-input-field',
    });

    inputEl.style.width = '100%';
    inputEl.style.padding = '8px';
    inputEl.style.marginBottom = '16px';
    inputEl.style.border = '1px solid var(--background-modifier-border)';
    inputEl.style.borderRadius = '4px';

    // Create button container
    const buttonContainer = contentEl.createDiv({ cls: 'variable-input-buttons' });
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.justifyContent = 'flex-end';

    const submitButton = buttonContainer.createEl('button', {
      text: 'OK',
      cls: 'mod-cta',
    });

    const cancelButton = buttonContainer.createEl('button', {
      text: 'Cancel',
    });

    // Event handlers
    const submitValue = () => {
      this.inputValue = inputEl.value.trim();
      this.onSubmit(this.inputValue || null);
      this.close();
    };

    const cancelInput = () => {
      this.onSubmit(null);
      this.close();
    };

    submitButton.onclick = submitValue;
    cancelButton.onclick = cancelInput;

    // Handle Enter key
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitValue();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelInput();
      }
    });

    // Focus input
    inputEl.focus();
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
      .setDesc('Folder to look for template files (.md files with frontmatter)')
      .addText((text) =>
        text
          .setPlaceholder('templates')
          .setValue(this.plugin.settings.templateFolder)
          .onChange(async (value) => {
            this.plugin.settings.templateFolder = value;
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button
          .setButtonText('Create Folder')
          .setTooltip('Create the template folder if it doesn\'t exist')
          .onClick(async () => {
            try {
              const folderPath = this.plugin.settings.templateFolder;
              const folder = this.plugin.app.vault.getAbstractFileByPath(folderPath);
              
              if (!folder) {
                await this.plugin.app.vault.createFolder(folderPath);
                new Notice(`Created template folder: ${folderPath}`);
              } else {
                new Notice(`Template folder already exists: ${folderPath}`);
              }
            } catch (error) {
              new Notice(`Failed to create template folder: ${error.message}`);
            }
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
