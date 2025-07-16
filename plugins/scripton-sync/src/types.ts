import { FileSystemAdapter } from 'obsidian';

// Extended FileSystemAdapter with basePath property
export interface ExtendedFileSystemAdapter extends FileSystemAdapter {
  basePath: string;
}

// Main plugin settings
export interface ScriptonSyncSettings {
  // Profile and settings sync
  profiles: SettingsProfile[];
  activeProfile: string;
  scriptonCloudUrl?: string;
  scriptonCloudApiKey?: string;
  
  // Git configuration
  gitConfig?: GitConfig;
  
  // Branch strategy
  branchStrategy: BranchStrategy;
  defaultBranch: string;
  tempBranchPrefix: string;
  autoMergeToDefault: boolean;
  
  // Auto sync settings
  autoSync: boolean;
  syncInterval: number;
  
  // Auto commit settings
  enableAutoCommit: boolean;
  commitIntervalMinutes: number;
  includeUntracked: boolean;
  
  // Auto push settings
  enableAutoPush: boolean;
  pushAfterCommits: number;
  
  // Auto pull settings
  enableAutoPull: boolean;
  pullOnStartup: boolean;
  pullOnStartupDelay: number;
  pullOnStartupSilent: boolean;
  
  // Merge settings
  enableAutoMerge: boolean;
  mergeStrategy: 'merge' | 'rebase' | 'squash';
  
  // LLM settings for commit messages
  enableAICommitMessages: boolean;
  llmProvider: 'none' | 'openai' | 'anthropic';
  apiKey: string;
  commitPrompt: string;
  useTemplateEngine: boolean;
  selectedTemplate: string;
  
  // Conflict resolution
  conflictResolution: 'manual' | 'merge' | 'overwrite';
  openEditorOnConflict: boolean;
  editorCommand: string;
  
  // File exclusions and security
  excludedFiles: string[];
  sensitiveKeys: string[];
  
  // Metadata
  lastSync: string;
}

// Branch strategy types
export type BranchStrategy = 'simple' | 'develop-host' | 'feature-branch' | 'custom';

export interface BranchConfig {
  strategy: BranchStrategy;
  defaultBranch: string;
  developPrefix: string;
  featurePrefix: string;
  autoCreateHostBranch: boolean;
  autoMergeToDefault: boolean;
  squashMerge: boolean;
}

// Settings profile for cloud sync
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

// Git related types
export interface GitConfig {
  remote: string;
  branch: string;
  author: {
    name: string;
    email: string;
  };
}

export interface GitStatus {
  hasChanges: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  currentBranch: string;
  ahead: number;
  behind: number;
}

export interface GitResult {
  success: boolean;
  error?: string;
  conflicts?: boolean;
  data?: any;
}

// Sync related types
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

// Scripton Cloud types
export interface ScriptonCloudConfig {
  apiUrl: string;
  apiKey: string;
  organizationId?: string;
  teamId?: string;
}

export interface CloudSyncResult {
  success: boolean;
  profileId: string;
  timestamp: string;
  changes: ChangeItem[];
  error?: string;
}

// General types
export interface ObsidianSettings {
  [key: string]: any;
}

// Default settings
export const DEFAULT_SETTINGS: ScriptonSyncSettings = {
  // Profile and settings
  profiles: [],
  activeProfile: '',
  scriptonCloudUrl: 'https://scripton.cloud',
  scriptonCloudApiKey: '',
  
  // Git configuration
  gitConfig: undefined,
  
  // Branch strategy
  branchStrategy: 'develop-host',
  defaultBranch: 'main',
  tempBranchPrefix: 'develop/',
  autoMergeToDefault: true,
  
  // Auto sync
  autoSync: false,
  syncInterval: 30,
  
  // Auto commit
  enableAutoCommit: false,
  commitIntervalMinutes: 10,
  includeUntracked: true,
  
  // Auto push
  enableAutoPush: false,
  pushAfterCommits: 5,
  
  // Auto pull
  enableAutoPull: false,
  pullOnStartup: true,
  pullOnStartupDelay: 10,
  pullOnStartupSilent: true,
  
  // Merge settings
  enableAutoMerge: false,
  mergeStrategy: 'squash',
  
  // LLM settings
  enableAICommitMessages: false,
  llmProvider: 'none',
  apiKey: '',
  commitPrompt: 'Generate a concise commit message for the following changes:',
  useTemplateEngine: false,
  selectedTemplate: 'default',
  
  // Conflict resolution
  conflictResolution: 'manual',
  openEditorOnConflict: true,
  editorCommand: 'code',
  
  // File exclusions
  excludedFiles: [
    'workspace.json',
    'workspace-mobile.json',
    'graph.json',
    'canvas.json',
    '.obsidian/workspace',
    '.obsidian/workspaces.json'
  ],
  
  // Security
  sensitiveKeys: [
    'apiKey',
    'token',
    'password',
    'secret',
    'credential',
    'auth'
  ],
  
  // Metadata
  lastSync: ''
};