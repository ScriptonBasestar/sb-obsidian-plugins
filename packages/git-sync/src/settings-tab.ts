import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { GitSyncPlugin } from './main';
import { PromptPreviewModal, TemplateHelpModal } from './modals';

export class GitSyncSettingTab extends PluginSettingTab {
  plugin: GitSyncPlugin;

  constructor(app: App, plugin: GitSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Git Sync Settings' });

    this.addBranchSettings(containerEl);
    this.addAutoCommitSettings(containerEl);
    this.addAutoPushSettings(containerEl);
    this.addLLMSettings(containerEl);
    this.addAutoPullSettings(containerEl);
    this.addMergeSettings(containerEl);
    this.addConflictResolutionSettings(containerEl);
  }

  private addBranchSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Branch Settings' });

    new Setting(containerEl)
      .setName('Temp Branch Name')
      .setDesc('Name of the temporary branch for auto commits')
      .addText((text) =>
        text
          .setPlaceholder('tmp')
          .setValue(this.plugin.settings.tempBranch)
          .onChange(async (value) => {
            this.plugin.settings.tempBranch = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Main Branch Name')
      .setDesc('Name of the main branch to merge into')
      .addText((text) =>
        text
          .setPlaceholder('main')
          .setValue(this.plugin.settings.mainBranch)
          .onChange(async (value) => {
            this.plugin.settings.mainBranch = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private addAutoCommitSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Auto Commit Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Commit')
      .setDesc('Automatically commit changes at regular intervals')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoCommit).onChange(async (value) => {
          this.plugin.settings.enableAutoCommit = value;
          await this.plugin.saveSettings();
          if (value) {
            this.plugin.startAutoCommit();
          } else {
            this.plugin.stopAutoCommit();
          }
        })
      );

    new Setting(containerEl)
      .setName('Commit Interval (minutes)')
      .setDesc('How often to auto-commit changes')
      .addSlider((slider) =>
        slider
          .setLimits(1, 60, 1)
          .setValue(this.plugin.settings.commitIntervalMinutes)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.commitIntervalMinutes = value;
            await this.plugin.saveSettings();
            if (this.plugin.settings.enableAutoCommit) {
              this.plugin.stopAutoCommit();
              this.plugin.startAutoCommit();
            }
          })
      );

    new Setting(containerEl)
      .setName('Include Untracked Files')
      .setDesc('Include new untracked files in auto commits')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeUntracked).onChange(async (value) => {
          this.plugin.settings.includeUntracked = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private addAutoPushSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Auto Push Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Push')
      .setDesc('Automatically push after a certain number of commits')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoPush).onChange(async (value) => {
          this.plugin.settings.enableAutoPush = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Push After Commits')
      .setDesc('Push after this many commits')
      .addSlider((slider) =>
        slider
          .setLimits(1, 20, 1)
          .setValue(this.plugin.settings.pushAfterCommits)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.pushAfterCommits = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private addLLMSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'AI Commit Message Settings' });

    new Setting(containerEl)
      .setName('Enable AI Commit Messages')
      .setDesc('Use AI to generate commit messages')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAICommitMessages).onChange(async (value) => {
          this.plugin.settings.enableAICommitMessages = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('Choose your AI provider')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('none', 'None')
          .addOption('openai', 'OpenAI')
          .addOption('anthropic', 'Anthropic Claude')
          .setValue(this.plugin.settings.llmProvider)
          .onChange(async (value: 'none' | 'openai' | 'anthropic') => {
            this.plugin.settings.llmProvider = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your LLM API key')
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
        button.setButtonText('Test Connection').onClick(async () => {
          await this.plugin.testLLMConnection();
        })
      );

    new Setting(containerEl)
      .setName('Use Template Engine')
      .setDesc('Use Handlebars template engine for commit prompts')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.useTemplateEngine).onChange(async (value) => {
          this.plugin.settings.useTemplateEngine = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Template Style')
      .setDesc('Choose a commit message template style')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('conventional', 'Conventional Commits')
          .addOption('gitmoji', 'Gitmoji')
          .addOption('angular', 'Angular')
          .addOption('custom', 'Custom Template')
          .setValue(this.plugin.settings.selectedTemplate)
          .onChange(async (value) => {
            this.plugin.settings.selectedTemplate = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Commit Prompt')
      .setDesc('Prompt template for generating commit messages')
      .addTextArea((text) =>
        text
          .setPlaceholder('Enter your commit prompt template')
          .setValue(this.plugin.settings.commitPrompt)
          .onChange(async (value) => {
            this.plugin.settings.commitPrompt = value;
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button.setButtonText('Preview').onClick(() => {
          this.plugin.previewPrompt();
        })
      )
      .addButton((button) =>
        button.setButtonText('Help').onClick(() => {
          const helpContent = this.getTemplateHelpContent();
          new TemplateHelpModal(this.app, helpContent).open();
        })
      );
  }

  private addAutoPullSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Auto Pull Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Pull')
      .setDesc('Enable automatic pulling from remote')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoPull).onChange(async (value) => {
          this.plugin.settings.enableAutoPull = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Pull on Startup')
      .setDesc('Automatically pull changes when Obsidian starts')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.pullOnStartup).onChange(async (value) => {
          this.plugin.settings.pullOnStartup = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Startup Pull Delay (seconds)')
      .setDesc('Wait this many seconds after startup before pulling')
      .addSlider((slider) =>
        slider
          .setLimits(0, 30, 1)
          .setValue(this.plugin.settings.pullOnStartupDelay)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.pullOnStartupDelay = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Silent Pull on Startup')
      .setDesc('Pull without showing notifications on startup')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.pullOnStartupSilent).onChange(async (value) => {
          this.plugin.settings.pullOnStartupSilent = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private addMergeSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Merge Settings' });

    new Setting(containerEl)
      .setName('Enable Auto Merge')
      .setDesc('Automatically merge temp branch to main when conditions are met')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableAutoMerge).onChange(async (value) => {
          this.plugin.settings.enableAutoMerge = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Merge Strategy')
      .setDesc('Strategy to use when merging branches')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('merge', 'Merge Commit')
          .addOption('rebase', 'Rebase')
          .addOption('squash', 'Squash and Merge')
          .setValue(this.plugin.settings.mergeStrategy)
          .onChange(async (value: 'merge' | 'rebase' | 'squash') => {
            this.plugin.settings.mergeStrategy = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private addConflictResolutionSettings(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Conflict Resolution' });

    new Setting(containerEl)
      .setName('Open Editor on Conflict')
      .setDesc('Automatically open external editor when conflicts occur')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openEditorOnConflict).onChange(async (value) => {
          this.plugin.settings.openEditorOnConflict = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Editor Command')
      .setDesc('Command to open external editor (e.g., code, subl, vim)')
      .addText((text) =>
        text
          .setPlaceholder('code')
          .setValue(this.plugin.settings.editorCommand)
          .onChange(async (value) => {
            this.plugin.settings.editorCommand = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private getTemplateHelpContent(): string {
    return `
      <h3>Available Variables</h3>
      <ul>
        <li><code>{{files}}</code> - List of changed files</li>
        <li><code>{{stats}}</code> - Change statistics</li>
        <li><code>{{diff}}</code> - Full diff output</li>
        <li><code>{{summary}}</code> - AI-generated summary</li>
        <li><code>{{date}}</code> - Current date</li>
        <li><code>{{time}}</code> - Current time</li>
        <li><code>{{branch}}</code> - Current branch name</li>
      </ul>
      
      <h3>Template Examples</h3>
      <h4>Conventional Commits</h4>
      <pre><code>Generate a conventional commit message:
Type: feat/fix/docs/style/refactor/test/chore
Scope: (optional)
Description: concise description

Changes:
{{files}}

Stats: {{stats}}</code></pre>
      
      <h4>Gitmoji</h4>
      <pre><code>Generate a commit with gitmoji:
Emoji + Type + Description

Changes:
{{files}}

Please use appropriate emoji for the change type.</code></pre>
    `;
  }
}