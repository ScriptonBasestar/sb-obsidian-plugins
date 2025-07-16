import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import WikiJSSyncPlugin from './main';
import { PathMapping } from './types';

export class WikiJSSyncSettingTab extends PluginSettingTab {
  plugin: WikiJSSyncPlugin;

  constructor(app: App, plugin: WikiJSSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'WikiJS Sync Settings' });

    // Connection settings
    containerEl.createEl('h3', { text: 'Connection' });

    new Setting(containerEl)
      .setName('WikiJS URL')
      .setDesc('The URL of your WikiJS instance (e.g., https://wiki.example.com)')
      .addText(text => text
        .setPlaceholder('https://wiki.example.com')
        .setValue(this.plugin.settings.wikiUrl)
        .onChange(async (value) => {
          this.plugin.settings.wikiUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your WikiJS API key for authentication')
      .addText(text => text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
          this.plugin.updateApiClient();
        }));

    new Setting(containerEl)
      .setName('Test connection')
      .setDesc('Test the connection to your WikiJS instance')
      .addButton(button => button
        .setButtonText('Test')
        .onClick(async () => {
          const connected = await this.plugin.testConnection();
          if (connected) {
            new Notice('Successfully connected to WikiJS!');
          } else {
            new Notice('Failed to connect. Please check your settings.');
          }
        }));

    // Sync settings
    containerEl.createEl('h3', { text: 'Synchronization' });

    new Setting(containerEl)
      .setName('Sync direction')
      .setDesc('Choose how to sync between Obsidian and WikiJS')
      .addDropdown(dropdown => dropdown
        .addOption('bidirectional', 'Bidirectional')
        .addOption('obsidian-to-wiki', 'Obsidian → WikiJS')
        .addOption('wiki-to-obsidian', 'WikiJS → Obsidian')
        .setValue(this.plugin.settings.syncDirection)
        .onChange(async (value: any) => {
          this.plugin.settings.syncDirection = value;
          await this.plugin.saveSettings();
        }));

    if (this.plugin.settings.syncDirection === 'bidirectional') {
      new Setting(containerEl)
        .setName('Conflict resolution')
        .setDesc('How to handle conflicts when both sides have changes')
        .addDropdown(dropdown => dropdown
          .addOption('manual', 'Manual resolution')
          .addOption('local', 'Keep local (Obsidian) version')
          .addOption('remote', 'Keep remote (WikiJS) version')
          .setValue(this.plugin.settings.conflictResolution || 'manual')
          .onChange(async (value: any) => {
            this.plugin.settings.conflictResolution = value;
            await this.plugin.saveSettings();
          }));
    }

    new Setting(containerEl)
      .setName('Auto sync')
      .setDesc('Automatically sync changes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSync)
        .onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
          if (value) {
            this.plugin.startAutoSync();
          } else {
            this.plugin.stopAutoSync();
          }
        }));

    if (this.plugin.settings.autoSync) {
      new Setting(containerEl)
        .setName('Sync interval')
        .setDesc('Minutes between automatic syncs')
        .addSlider(slider => slider
          .setLimits(5, 120, 5)
          .setValue(this.plugin.settings.syncInterval)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.syncInterval = value;
            await this.plugin.saveSettings();
            this.plugin.restartAutoSync();
          }));
    }

    // Path mapping
    containerEl.createEl('h3', { text: 'Path Mapping' });

    const pathMappingContainer = containerEl.createDiv('path-mapping-container');
    this.renderPathMappings(pathMappingContainer);

    new Setting(containerEl)
      .setName('Add path mapping')
      .setDesc('Map Obsidian folders to WikiJS paths')
      .addButton(button => button
        .setButtonText('Add Mapping')
        .onClick(async () => {
          this.plugin.settings.pathMapping.push({
            obsidianPath: '',
            wikiPath: '',
            enabled: true
          });
          await this.plugin.saveSettings();
          this.renderPathMappings(pathMappingContainer);
        }));

    // Metadata mapping
    containerEl.createEl('h3', { text: 'Metadata Mapping' });

    new Setting(containerEl)
      .setName('Sync tags')
      .setDesc('Sync Obsidian tags to WikiJS')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.metadataMapping.tags.enabled)
        .onChange(async (value) => {
          this.plugin.settings.metadataMapping.tags.enabled = value;
          await this.plugin.saveSettings();
        }));

    if (this.plugin.settings.metadataMapping.tags.enabled) {
      new Setting(containerEl)
        .setName('Tag prefix')
        .setDesc('Prefix to add to tags when syncing to WikiJS')
        .addText(text => text
          .setPlaceholder('e.g., obsidian:')
          .setValue(this.plugin.settings.metadataMapping.tags.prefix)
          .onChange(async (value) => {
            this.plugin.settings.metadataMapping.tags.prefix = value;
            await this.plugin.saveSettings();
          }));
    }

    // Exclusions
    containerEl.createEl('h3', { text: 'Exclusions' });

    new Setting(containerEl)
      .setName('Excluded folders')
      .setDesc('Folders to exclude from sync (one per line)')
      .addTextArea(text => text
        .setPlaceholder('.obsidian\n.trash\ntemplates')
        .setValue(this.plugin.settings.excludedFolders.join('\n'))
        .onChange(async (value) => {
          this.plugin.settings.excludedFolders = value.split('\n').filter(f => f.trim());
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Excluded files')
      .setDesc('Files to exclude from sync (one per line)')
      .addTextArea(text => text
        .setPlaceholder('README.md\nTODO.md')
        .setValue(this.plugin.settings.excludedFiles.join('\n'))
        .onChange(async (value) => {
          this.plugin.settings.excludedFiles = value.split('\n').filter(f => f.trim());
          await this.plugin.saveSettings();
        }));

    // Actions
    containerEl.createEl('h3', { text: 'Actions' });

    new Setting(containerEl)
      .setName('Manual sync')
      .setDesc('Manually trigger a sync')
      .addButton(button => button
        .setButtonText('Sync Now')
        .onClick(async () => {
          await this.plugin.manualSync();
        }));

    // Last sync info
    if (this.plugin.settings.lastSync) {
      new Setting(containerEl)
        .setName('Last sync')
        .setDesc(`Last synchronized: ${new Date(this.plugin.settings.lastSync).toLocaleString()}`);
    }

    this.addStyles();
  }

  private renderPathMappings(container: HTMLElement) {
    container.empty();

    this.plugin.settings.pathMapping.forEach((mapping, index) => {
      const mappingEl = container.createDiv('path-mapping-item');

      new Setting(mappingEl)
        .setName(`Mapping ${index + 1}`)
        .addText(text => text
          .setPlaceholder('Obsidian path')
          .setValue(mapping.obsidianPath)
          .onChange(async (value) => {
            mapping.obsidianPath = value;
            await this.plugin.saveSettings();
          }))
        .addText(text => text
          .setPlaceholder('WikiJS path')
          .setValue(mapping.wikiPath)
          .onChange(async (value) => {
            mapping.wikiPath = value;
            await this.plugin.saveSettings();
          }))
        .addToggle(toggle => toggle
          .setValue(mapping.enabled)
          .onChange(async (value) => {
            mapping.enabled = value;
            await this.plugin.saveSettings();
          }))
        .addButton(button => button
          .setIcon('trash')
          .setTooltip('Remove mapping')
          .onClick(async () => {
            this.plugin.settings.pathMapping.splice(index, 1);
            await this.plugin.saveSettings();
            this.renderPathMappings(container);
          }));
    });
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .path-mapping-container {
        margin-bottom: 20px;
      }
      
      .path-mapping-item {
        border: 1px solid var(--background-modifier-border);
        padding: 10px;
        margin-bottom: 10px;
        border-radius: 5px;
      }
      
      .path-mapping-item .setting-item {
        border: none;
        padding: 0;
      }
      
      .path-mapping-item input[type="text"] {
        width: 200px;
        margin-right: 10px;
      }
    `;
    document.head.appendChild(style);
  }
}