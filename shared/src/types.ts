import { Plugin } from 'obsidian';

export interface BasePluginSettings {
  debug: boolean;
}

export interface BasePlugin extends Plugin {
  settings: BasePluginSettings;
  loadSettings(): Promise<void>;
  saveSettings(): Promise<void>;
}