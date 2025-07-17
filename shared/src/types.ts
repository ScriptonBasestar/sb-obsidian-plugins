import { Plugin } from 'obsidian';

export interface BasePluginSettings {
  debug: boolean;
}

export interface BasePlugin extends Plugin {
  settings: BasePluginSettings;
  loadSettings(): Promise<void>;
  saveSettings(): Promise<void>;
}

// Additional types for task runner
export interface PluginDataInput {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
}

export interface PluginDataOutput {
  success: boolean;
  message?: string;
  data?: any;
}

export interface TaskRunnerOptions {
  timeout?: number;
  retry?: number;
  debug?: boolean;
}
