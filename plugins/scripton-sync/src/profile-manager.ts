import { App } from 'obsidian';
import { SettingsProfile, ProfileSettings, ObsidianSettings } from './types';
import { SettingsParser } from './settings-parser';
import SettingsSyncPlugin from './main';

export class ProfileManager {
  private app: App;
  private plugin: SettingsSyncPlugin;
  private parser: SettingsParser;

  constructor(app: App, plugin: SettingsSyncPlugin) {
    this.app = app;
    this.plugin = plugin;
    this.parser = new SettingsParser(app, plugin.settings.sensitiveKeys);
  }

  /**
   * Create a new profile from current settings
   */
  async createProfile(name: string, description: string = ''): Promise<SettingsProfile> {
    const currentSettings = await this.parser.parseAllSettings();
    
    const profile: SettingsProfile = {
      id: this.generateId(),
      name,
      description,
      settings: this.convertToProfileSettings(currentSettings),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return profile;
  }

  /**
   * Apply a profile to the current vault
   */
  async applyProfile(profile: SettingsProfile): Promise<void> {
    // If profile inherits from another, merge settings
    let settingsToApply = profile.settings;
    
    if (profile.inheritFrom) {
      const parentProfile = this.plugin.settings.profiles.find(p => p.id === profile.inheritFrom);
      if (parentProfile) {
        settingsToApply = this.mergeProfileSettings(parentProfile.settings, profile.settings);
      }
    }

    // Convert profile settings back to Obsidian format
    const obsidianSettings = this.convertToObsidianSettings(settingsToApply);
    
    // Apply settings to vault
    await this.parser.serializeSettings(obsidianSettings, this.plugin.settings.excludedFiles);
    
    // Reload Obsidian to apply changes
    await this.reloadObsidian();
  }

  /**
   * Update an existing profile
   */
  async updateProfile(profileId: string, updates: Partial<SettingsProfile>): Promise<void> {
    const profileIndex = this.plugin.settings.profiles.findIndex(p => p.id === profileId);
    
    if (profileIndex === -1) {
      throw new Error('Profile not found');
    }

    this.plugin.settings.profiles[profileIndex] = {
      ...this.plugin.settings.profiles[profileIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.plugin.saveSettings();
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    this.plugin.settings.profiles = this.plugin.settings.profiles.filter(p => p.id !== profileId);
    
    // If deleted profile was active, clear active profile
    if (this.plugin.settings.activeProfile === profileId) {
      this.plugin.settings.activeProfile = '';
    }

    await this.plugin.saveSettings();
  }

  /**
   * Export a profile to JSON
   */
  exportProfile(profile: SettingsProfile): string {
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Import a profile from JSON
   */
  async importProfile(json: string): Promise<SettingsProfile> {
    try {
      const profile = JSON.parse(json) as SettingsProfile;
      
      // Validate profile structure
      if (!profile.id || !profile.name || !profile.settings) {
        throw new Error('Invalid profile format');
      }

      // Generate new ID to avoid conflicts
      profile.id = this.generateId();
      profile.updatedAt = new Date().toISOString();

      return profile;
    } catch (error) {
      throw new Error(`Failed to import profile: ${error.message}`);
    }
  }

  /**
   * Convert Obsidian settings to profile settings format
   */
  private convertToProfileSettings(obsidianSettings: ObsidianSettings): ProfileSettings {
    const profileSettings: ProfileSettings = {
      plugins: [],
      appearance: {
        theme: obsidianSettings.appearance?.theme || 'default',
        cssSnippets: obsidianSettings.appearance?.cssSnippets || [],
        baseFontSize: obsidianSettings.appearance?.baseFontSize || 16,
        interfaceFontFamily: obsidianSettings.appearance?.interfaceFontFamily || '',
        textFontFamily: obsidianSettings.appearance?.textFontFamily || '',
        monospaceFontFamily: obsidianSettings.appearance?.monospaceFontFamily || ''
      },
      hotkeys: obsidianSettings.hotkeys || {},
      corePlugins: {},
      community: {
        plugins: obsidianSettings.community || [],
        themes: obsidianSettings.themes || []
      }
    };

    // Convert plugin settings
    if (obsidianSettings.plugins) {
      for (const [pluginId, settings] of Object.entries(obsidianSettings.plugins)) {
        profileSettings.plugins.push({
          id: pluginId,
          enabled: true, // TODO: Check actual enabled state
          settings
        });
      }
    }

    // Convert core plugins
    if (obsidianSettings.core) {
      profileSettings.corePlugins = obsidianSettings.core;
    }

    return profileSettings;
  }

  /**
   * Convert profile settings back to Obsidian format
   */
  convertToObsidianSettings(profileSettings: ProfileSettings): ObsidianSettings {
    const obsidianSettings: ObsidianSettings = {
      appearance: profileSettings.appearance,
      hotkeys: profileSettings.hotkeys,
      core: profileSettings.corePlugins,
      community: profileSettings.community.plugins,
      themes: profileSettings.community.themes,
      plugins: {}
    };

    // Convert plugin settings
    for (const plugin of profileSettings.plugins) {
      obsidianSettings.plugins[plugin.id] = plugin.settings;
    }

    return obsidianSettings;
  }

  /**
   * Merge two profile settings with inheritance
   */
  private mergeProfileSettings(parent: ProfileSettings, child: ProfileSettings): ProfileSettings {
    const merged: ProfileSettings = JSON.parse(JSON.stringify(parent)); // Deep clone

    // Merge appearance
    Object.assign(merged.appearance, child.appearance);

    // Merge hotkeys
    Object.assign(merged.hotkeys, child.hotkeys);

    // Merge core plugins
    Object.assign(merged.corePlugins, child.corePlugins);

    // Merge community settings
    merged.community.plugins = [...new Set([...parent.community.plugins, ...child.community.plugins])];
    merged.community.themes = [...new Set([...parent.community.themes, ...child.community.themes])];

    // Merge plugin settings
    const pluginMap = new Map(parent.plugins.map(p => [p.id, p]));
    for (const plugin of child.plugins) {
      pluginMap.set(plugin.id, plugin);
    }
    merged.plugins = Array.from(pluginMap.values());

    return merged;
  }

  /**
   * Generate a unique ID for profiles
   */
  private generateId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reload Obsidian to apply settings changes
   */
  private async reloadObsidian(): Promise<void> {
    // Trigger a reload of Obsidian's configuration
    // This is a simplified version - in practice, you might need more sophisticated handling
    (this.app as any).commands.executeCommandById('app:reload');
  }

  /**
   * Compare two profiles and return differences
   */
  compareProfiles(profile1: SettingsProfile, profile2: SettingsProfile): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const diff = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[]
    };

    // Compare plugins
    const plugins1 = new Set(profile1.settings.plugins.map(p => p.id));
    const plugins2 = new Set(profile2.settings.plugins.map(p => p.id));

    for (const plugin of profile2.settings.plugins) {
      if (!plugins1.has(plugin.id)) {
        diff.added.push(`Plugin: ${plugin.id}`);
      }
    }

    for (const plugin of profile1.settings.plugins) {
      if (!plugins2.has(plugin.id)) {
        diff.removed.push(`Plugin: ${plugin.id}`);
      }
    }

    // Compare appearance settings
    if (JSON.stringify(profile1.settings.appearance) !== JSON.stringify(profile2.settings.appearance)) {
      diff.modified.push('Appearance settings');
    }

    // Compare hotkeys
    if (JSON.stringify(profile1.settings.hotkeys) !== JSON.stringify(profile2.settings.hotkeys)) {
      diff.modified.push('Hotkey settings');
    }

    return diff;
  }
}