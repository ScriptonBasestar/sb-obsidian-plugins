import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

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
	publishEnabled: false
}

export default class AwesomePlugin extends Plugin {
	settings: AwesomePluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'insert-template',
			name: 'Insert Template',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insertTemplate(editor);
			}
		});

		this.addCommand({
			id: 'auto-metadata',
			name: 'Auto-generate Metadata',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.autoGenerateMetadata(editor, view);
			}
		});

		this.addCommand({
			id: 'git-sync',
			name: 'Git Sync',
			callback: () => {
				this.gitSync();
			}
		});

		this.addCommand({
			id: 'publish-note',
			name: 'Publish Note',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.publishNote(view);
			}
		});

		this.addSettingTab(new AwesomePluginSettingTab(this.app, this));

		this.addRibbonIcon('dice', 'Awesome Plugin', (evt: MouseEvent) => {
			new Notice('Awesome Plugin is active!');
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private insertTemplate(editor: Editor) {
		const templates = this.getTemplates();
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

	private getTemplates(): Array<{name: string, content: string}> {
		return [
			{
				name: 'Daily Note',
				content: `# {{date}}\n\n## Tasks\n- [ ] \n\n## Notes\n\n## Reflection\n`
			},
			{
				name: 'Meeting Notes',
				content: `# Meeting: {{title}}\n\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n\n## Notes\n\n## Action Items\n- [ ] \n`
			}
		];
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
			title: file.basename
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
	templates: Array<{name: string, content: string}>;
	onChoose: (template: {name: string, content: string}) => void;

	constructor(app: App, templates: Array<{name: string, content: string}>, onChoose: (template: {name: string, content: string}) => void) {
		super(app);
		this.templates = templates;
		this.onChoose = onChoose;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl('h2', {text: 'Choose Template'});

		this.templates.forEach(template => {
			const button = contentEl.createEl('button', {
				text: template.name,
				cls: 'mod-cta'
			});
			button.onclick = () => {
				this.onChoose(template);
				this.close();
			};
		});
	}

	onClose() {
		const {contentEl} = this;
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
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Awesome Plugin Settings'});

		new Setting(containerEl)
			.setName('Template Folder')
			.setDesc('Folder to look for templates')
			.addText(text => text
				.setPlaceholder('templates')
				.setValue(this.plugin.settings.templateFolder)
				.onChange(async (value) => {
					this.plugin.settings.templateFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto Metadata')
			.setDesc('Automatically generate frontmatter metadata')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoMetadata)
				.onChange(async (value) => {
					this.plugin.settings.autoMetadata = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Git Sync')
			.setDesc('Enable git synchronization features')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.gitSync)
				.onChange(async (value) => {
					this.plugin.settings.gitSync = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Publishing')
			.setDesc('Enable publishing to static sites')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.publishEnabled)
				.onChange(async (value) => {
					this.plugin.settings.publishEnabled = value;
					await this.plugin.saveSettings();
				}));
	}
}