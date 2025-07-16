import { App } from 'obsidian';

import { ObsidianSettings } from './types';

export class SettingsParser {
  private app: App;
  private sensitiveKeys: string[];

  constructor(app: App, sensitiveKeys: string[]) {
    this.app = app;
    this.sensitiveKeys = sensitiveKeys;
  }

  public async parseCurrentSettings(): Promise<ObsidianSettings> {
    const settings: ObsidianSettings = {};

    // Get plugin settings
    const pluginSettings = await this.getPluginSettings();
    if (pluginSettings !== null) {
      settings.plugins = pluginSettings;
    }

    // Get appearance settings
    const appearanceSettings = await this.getAppearanceSettings();
    if (appearanceSettings !== null) {
      settings.appearance = appearanceSettings;
    }

    // Get hotkey settings
    const hotkeySettings = await this.getHotkeySettings();
    if (hotkeySettings !== null) {
      settings.hotkeys = hotkeySettings;
    }

    return this.filterSensitiveData(settings);
  }

  private async getPluginSettings(): Promise<Record<string, unknown>> {
    // Implementation to get plugin settings from Obsidian
    await Promise.resolve();
    return {};
  }

  private async getAppearanceSettings(): Promise<Record<string, unknown>> {
    // Implementation to get appearance settings from Obsidian
    await Promise.resolve();
    return {};
  }

  private async getHotkeySettings(): Promise<Record<string, unknown>> {
    // Implementation to get hotkey settings from Obsidian
    await Promise.resolve();
    return {};
  }

  private filterSensitiveData(data: ObsidianSettings): ObsidianSettings {
    const filtered: ObsidianSettings = {};

    for (const [key, value] of Object.entries(data)) {
      if (!this.sensitiveKeys.includes(key)) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  public async applySanitizedSettings(settings: ObsidianSettings): Promise<void> {
    // Implementation to apply sanitized settings back to Obsidian
    await Promise.resolve();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _settings = settings;
  }
}
