import { App, TFile, TFolder } from 'obsidian';
import * as yaml from 'js-yaml';
import { ObsidianSettings, PluginSettings, AppearanceSettings, HotkeySettings, CorePluginSettings } from './types';

export class SettingsParser {
  private app: App;
  private sensitiveKeys: string[];

  constructor(app: App, sensitiveKeys: string[] = []) {
    this.app = app;
    this.sensitiveKeys = sensitiveKeys;
  }

  /**
   * Parse all Obsidian settings from the .obsidian directory
   */
  async parseAllSettings(): Promise<ObsidianSettings> {
    const settings: ObsidianSettings = {};
    const obsidianFolder = this.app.vault.configDir;

    try {
      // Parse core settings files
      settings.app = await this.parseJsonFile(`${obsidianFolder}/app.json`);
      settings.appearance = await this.parseJsonFile(`${obsidianFolder}/appearance.json`);
      settings.hotkeys = await this.parseJsonFile(`${obsidianFolder}/hotkeys.json`);
      settings.core = await this.parseJsonFile(`${obsidianFolder}/core-plugins.json`);
      settings.community = await this.parseJsonFile(`${obsidianFolder}/community-plugins.json`);

      // Parse plugin settings
      settings.plugins = await this.parsePluginSettings();

      // Parse theme and snippets
      settings.themes = await this.parseThemes();
      settings.snippets = await this.parseSnippets();

      // Filter out sensitive information
      this.filterSensitiveData(settings);

    } catch (error) {
      console.error('Error parsing settings:', error);
      throw error;
    }

    return settings;
  }

  /**
   * Parse a specific JSON file from the vault
   */
  private async parseJsonFile(path: string): Promise<any> {
    try {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        return JSON.parse(content);
      }
    } catch (error) {
      // File might not exist, which is okay
      return null;
    }
  }

  /**
   * Parse all plugin settings from the plugins directory
   */
  private async parsePluginSettings(): Promise<Record<string, any>> {
    const pluginSettings: Record<string, any> = {};
    const pluginsPath = `${this.app.vault.configDir}/plugins`;
    
    try {
      const pluginsFolder = this.app.vault.getAbstractFileByPath(pluginsPath);
      if (pluginsFolder instanceof TFolder) {
        for (const child of pluginsFolder.children) {
          if (child instanceof TFolder) {
            const dataFile = `${child.path}/data.json`;
            const settings = await this.parseJsonFile(dataFile);
            if (settings) {
              pluginSettings[child.name] = settings;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing plugin settings:', error);
    }

    return pluginSettings;
  }

  /**
   * Parse installed themes
   */
  private async parseThemes(): Promise<string[]> {
    const themes: string[] = [];
    const themesPath = `${this.app.vault.configDir}/themes`;
    
    try {
      const themesFolder = this.app.vault.getAbstractFileByPath(themesPath);
      if (themesFolder instanceof TFolder) {
        for (const child of themesFolder.children) {
          if (child instanceof TFolder) {
            themes.push(child.name);
          }
        }
      }
    } catch (error) {
      // Themes folder might not exist
    }

    return themes;
  }

  /**
   * Parse CSS snippets
   */
  private async parseSnippets(): Promise<string[]> {
    const snippets: string[] = [];
    const snippetsPath = `${this.app.vault.configDir}/snippets`;
    
    try {
      const snippetsFolder = this.app.vault.getAbstractFileByPath(snippetsPath);
      if (snippetsFolder instanceof TFolder) {
        for (const child of snippetsFolder.children) {
          if (child instanceof TFile && child.extension === 'css') {
            snippets.push(child.basename);
          }
        }
      }
    } catch (error) {
      // Snippets folder might not exist
    }

    return snippets;
  }

  /**
   * Filter out sensitive data from settings
   */
  private filterSensitiveData(settings: any, path: string = ''): void {
    if (typeof settings !== 'object' || settings === null) {
      return;
    }

    for (const key in settings) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if this key should be filtered
      if (this.isSensitiveKey(key)) {
        settings[key] = '[FILTERED]';
        continue;
      }

      // Recursively filter nested objects
      if (typeof settings[key] === 'object' && settings[key] !== null) {
        this.filterSensitiveData(settings[key], currentPath);
      }
    }
  }

  /**
   * Check if a key contains sensitive information
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.sensitiveKeys.some(sensitive => 
      lowerKey.includes(sensitive.toLowerCase())
    );
  }

  /**
   * Validate settings structure
   */
  validateSettings(settings: ObsidianSettings): boolean {
    try {
      // Basic structure validation
      if (typeof settings !== 'object') {
        throw new Error('Settings must be an object');
      }

      // Validate required fields exist
      const requiredFields = ['app', 'appearance', 'core'];
      for (const field of requiredFields) {
        if (!settings[field]) {
          console.warn(`Missing required field: ${field}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Settings validation failed:', error);
      return false;
    }
  }

  /**
   * Check compatibility between settings versions
   */
  checkCompatibility(localSettings: ObsidianSettings, remoteSettings: ObsidianSettings): {
    compatible: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check Obsidian version compatibility
    if (localSettings.app?.appVersion && remoteSettings.app?.appVersion) {
      const localVersion = this.parseVersion(localSettings.app.appVersion);
      const remoteVersion = this.parseVersion(remoteSettings.app.appVersion);

      if (localVersion.major !== remoteVersion.major) {
        issues.push(`Major version mismatch: local ${localVersion.major} vs remote ${remoteVersion.major}`);
      }
    }

    // Check plugin compatibility
    if (localSettings.plugins && remoteSettings.plugins) {
      const localPlugins = Object.keys(localSettings.plugins);
      const remotePlugins = Object.keys(remoteSettings.plugins);

      const missingLocally = remotePlugins.filter(p => !localPlugins.includes(p));
      if (missingLocally.length > 0) {
        issues.push(`Plugins missing locally: ${missingLocally.join(', ')}`);
      }
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * Parse version string into major, minor, patch
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(p => parseInt(p) || 0);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }

  /**
   * Serialize settings back to the vault
   */
  async serializeSettings(settings: ObsidianSettings, excludedFiles: string[] = []): Promise<void> {
    const obsidianFolder = this.app.vault.configDir;

    // Write core settings files
    const filesToWrite = [
      { path: 'app.json', data: settings.app },
      { path: 'appearance.json', data: settings.appearance },
      { path: 'hotkeys.json', data: settings.hotkeys },
      { path: 'core-plugins.json', data: settings.core },
      { path: 'community-plugins.json', data: settings.community }
    ];

    for (const file of filesToWrite) {
      if (!excludedFiles.includes(file.path) && file.data) {
        await this.writeJsonFile(`${obsidianFolder}/${file.path}`, file.data);
      }
    }

    // Write plugin settings
    if (settings.plugins) {
      for (const [pluginId, pluginSettings] of Object.entries(settings.plugins)) {
        const pluginDataPath = `${obsidianFolder}/plugins/${pluginId}/data.json`;
        if (!excludedFiles.includes(`plugins/${pluginId}/data.json`)) {
          await this.writeJsonFile(pluginDataPath, pluginSettings);
        }
      }
    }
  }

  /**
   * Write a JSON file to the vault
   */
  private async writeJsonFile(path: string, data: any): Promise<void> {
    try {
      const content = JSON.stringify(data, null, 2);
      const file = this.app.vault.getAbstractFileByPath(path);
      
      if (file instanceof TFile) {
        await this.app.vault.modify(file, content);
      } else {
        // Create parent directories if needed
        const parentPath = path.substring(0, path.lastIndexOf('/'));
        await this.ensureDirectoryExists(parentPath);
        await this.app.vault.create(path, content);
      }
    } catch (error) {
      console.error(`Error writing file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  private async ensureDirectoryExists(path: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (!folder) {
      await this.app.vault.createFolder(path);
    }
  }
}