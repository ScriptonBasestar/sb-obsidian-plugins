export interface GitSyncSettings {
  // Branch settings
  tempBranch: string;
  mainBranch: string;

  // Auto commit settings
  enableAutoCommit: boolean;
  commitIntervalMinutes: number;
  includeUntracked: boolean;

  // Auto push settings
  enableAutoPush: boolean;
  pushAfterCommits: number;

  // LLM settings
  enableAICommitMessages: boolean;
  llmProvider: 'none' | 'openai' | 'anthropic';
  apiKey: string;
  commitPrompt: string;
  useTemplateEngine: boolean;
  selectedTemplate: string;

  // Auto pull settings
  enableAutoPull: boolean;
  pullOnStartup: boolean;
  pullOnStartupDelay: number;
  pullOnStartupSilent: boolean;

  // Merge settings
  enableAutoMerge: boolean;
  mergeStrategy: 'merge' | 'rebase' | 'squash';

  // Conflict resolution
  openEditorOnConflict: boolean;
  editorCommand: string;
}

export const DEFAULT_SETTINGS: GitSyncSettings = {
  // Branch settings
  tempBranch: 'tmp',
  mainBranch: 'main',

  // Auto commit settings
  enableAutoCommit: false,
  commitIntervalMinutes: 10,
  includeUntracked: true,

  // Auto push settings
  enableAutoPush: false,
  pushAfterCommits: 5,

  // LLM settings
  enableAICommitMessages: false,
  llmProvider: 'none',
  apiKey: '',
  commitPrompt: 'Generate a concise commit message for the following changes:',
  useTemplateEngine: false,
  selectedTemplate: 'conventional',

  // Auto pull settings
  enableAutoPull: false,
  pullOnStartup: false,
  pullOnStartupDelay: 5,
  pullOnStartupSilent: true,

  // Merge settings
  enableAutoMerge: false,
  mergeStrategy: 'merge',

  // Conflict resolution
  openEditorOnConflict: false,
  editorCommand: 'code',
};