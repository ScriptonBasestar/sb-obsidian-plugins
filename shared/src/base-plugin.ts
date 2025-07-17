import { Plugin, PluginSettingTab, Setting, App, Notice } from 'obsidian';

export interface BasePluginSettings {
  debug: boolean;
  version: string;
}

export const DEFAULT_BASE_SETTINGS: BasePluginSettings = {
  debug: false,
  version: '1.0.0',
};

export abstract class BasePlugin<T extends BasePluginSettings> extends Plugin {
  settings!: T;

  abstract getDefaultSettings(): T;
  abstract getPluginName(): string;
  abstract getSettingTab(): PluginSettingTab;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(this.getSettingTab());
    await this.onPluginLoad();
  }

  async onunload(): Promise<void> {
    await this.onPluginUnload();
  }

  /**
   * Called after settings are loaded and setting tab is added
   */
  abstract onPluginLoad(): Promise<void>;

  /**
   * Called before plugin is unloaded
   */
  abstract onPluginUnload(): Promise<void>;

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, this.getDefaultSettings(), await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Log debug message if debug mode is enabled
   */
  protected debug(message: string, ...args: any[]): void {
    if (this.settings.debug) {
      console.warn(`[${this.getPluginName()}] ${message}`, ...args);
    }
  }

  /**
   * Log error message
   */
  protected error(message: string, error?: Error): void {
    console.error(`[${this.getPluginName()}] ${message}`, error);
  }

  /**
   * Show notice to user
   */
  protected showNotice(message: string, timeout = 5000): void {
    new Notice(`${this.getPluginName()}: ${message}`, timeout);
  }

  /**
   * Show error notice to user
   */
  protected showErrorNotice(message: string, timeout = 8000): void {
    new Notice(`❌ ${this.getPluginName()}: ${message}`, timeout);
  }

  /**
   * Show success notice to user
   */
  protected showSuccessNotice(message: string, timeout = 3000): void {
    new Notice(`✅ ${this.getPluginName()}: ${message}`, timeout);
  }

  /**
   * Safe async operation with error handling
   */
  protected async safeAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    showNotice = true
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.error(errorMessage, error as Error);
      if (showNotice) {
        this.showErrorNotice(errorMessage);
      }
      return null;
    }
  }

  /**
   * Get version info
   */
  getVersion(): string {
    return this.settings.version;
  }

  /**
   * Check if feature is enabled (can be overridden)
   */
  protected isFeatureEnabled(feature: string): boolean {
    return true; // Default implementation
  }
}

export abstract class BasePluginSettingTab extends PluginSettingTab {
  plugin: BasePlugin<any>;

  constructor(app: App, plugin: BasePlugin<any>) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: this.plugin.getPluginName() });

    // Debug setting
    new Setting(containerEl)
      .setName('Debug mode')
      .setDesc('Enable debug logging')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.debug).onChange(async (value) => {
          this.plugin.settings.debug = value;
          await this.plugin.saveSettings();
        })
      );

    // Plugin-specific settings
    this.displayPluginSettings(containerEl);

    // Version info
    containerEl.createEl('small', {
      text: `Version: ${this.plugin.getVersion()}`,
      cls: 'setting-item-description',
    });
  }

  abstract displayPluginSettings(containerEl: HTMLElement): void;
}
