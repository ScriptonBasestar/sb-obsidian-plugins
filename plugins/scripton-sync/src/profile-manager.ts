import { App, Notice } from 'obsidian';

import ScriptonSyncPlugin from './main';
import { SettingsProfile } from './types';

export class ProfileManager {
  private app: App;
  private plugin: ScriptonSyncPlugin;

  constructor(app: App, plugin: ScriptonSyncPlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  public async createFromCurrent(): Promise<SettingsProfile> {
    const now = new Date().toISOString();

    const profile: SettingsProfile = {
      id: Date.now().toString(),
      name: `Profile ${Date.now()}`,
      description: 'Created from current settings',
      settings: {
        plugins: [],
        appearance: {
          theme: 'default',
          cssSnippets: [],
          baseFontSize: 16,
          interfaceFontFamily: '',
          textFontFamily: '',
          monospaceFontFamily: '',
        },
        hotkeys: {},
        corePlugins: {},
        community: {
          plugins: [],
          themes: [],
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    this.plugin.settings.profiles.push(profile);
    await this.plugin.saveSettings();

    new Notice('Profile created successfully');
    return profile;
  }

  public async applyProfile(profileId: string): Promise<void> {
    const profile = this.plugin.settings.profiles.find((p) => p.id === profileId);

    if (!profile) {
      new Notice('Profile not found');
      return;
    }

    // Apply profile settings
    this.plugin.settings.activeProfile = profileId;
    await this.plugin.saveSettings();

    new Notice(`Applied profile: ${profile.name}`);
  }

  public async exportProfile(profileId: string): Promise<void> {
    await Promise.resolve();
    const profile = this.plugin.settings.profiles.find((p) => p.id === profileId);

    if (!profile) {
      new Notice('Profile not found');
      return;
    }

    // Export profile to file
    const data = JSON.stringify(profile, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${profile.name}.json`;
    link.click();

    URL.revokeObjectURL(url);
    new Notice('Profile exported successfully');
  }

  public async deleteProfile(profileId: string): Promise<void> {
    const index = this.plugin.settings.profiles.findIndex((p) => p.id === profileId);

    if (index === -1) {
      new Notice('Profile not found');
      return;
    }

    this.plugin.settings.profiles.splice(index, 1);

    if (this.plugin.settings.activeProfile === profileId) {
      this.plugin.settings.activeProfile = '';
    }

    await this.plugin.saveSettings();
    new Notice('Profile deleted successfully');
  }

  public async showSelector(): Promise<void> {
    // Implementation for showing profile selector modal
    await Promise.resolve();
    new Notice('Profile selector not implemented yet');
  }
}
