export interface SettingsSyncSettings {
  profiles: SettingsProfile[];
  activeProfile: string;
  gitRepo: string;
  gitConfig?: GitConfig;
  autoSync: boolean;
  syncInterval: number;
  excludedFiles: string[];
  sensitiveKeys: string[];
  lastSync: string;
}

export interface SettingsProfile {
  id: string;
  name: string;
  description: string;
  settings: ProfileSettings;
  inheritFrom?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSettings {
  plugins: PluginSettings[];
  appearance: AppearanceSettings;
  hotkeys: HotkeySettings;
  corePlugins: CorePluginSettings;
  community: CommunitySettings;
}

export interface PluginSettings {
  id: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface AppearanceSettings {
  theme: string;
  cssSnippets: string[];
  baseFontSize: number;
  interfaceFontFamily: string;
  textFontFamily: string;
  monospaceFontFamily: string;
}

export interface HotkeySettings {
  [command: string]: {
    modifiers: string[];
    key: string;
  };
}

export interface CorePluginSettings {
  [pluginId: string]: {
    enabled: boolean;
    settings?: Record<string, any>;
  };
}

export interface CommunitySettings {
  plugins: string[];
  themes: string[];
}

export interface GitConfig {
  remote: string;
  branch: string;
  author: {
    name: string;
    email: string;
  };
}

export interface SyncResult {
  success: boolean;
  message: string;
  conflicts?: string[];
  changes?: ChangeItem[];
}

export interface ChangeItem {
  type: 'added' | 'modified' | 'deleted';
  path: string;
  content?: string;
}

export interface ObsidianSettings {
  [key: string]: any;
}

export const DEFAULT_SETTINGS: SettingsSyncSettings = {
  profiles: [],
  activeProfile: '',
  gitRepo: '',
  autoSync: false,
  syncInterval: 30,
  excludedFiles: [
    'workspace.json',
    'workspace-mobile.json',
    'graph.json',
    'canvas.json'
  ],
  sensitiveKeys: [
    'apiKey',
    'token',
    'password',
    'secret'
  ],
  lastSync: ''
};