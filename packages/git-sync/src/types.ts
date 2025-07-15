import { FileSystemAdapter } from 'obsidian';

// Extended FileSystemAdapter with basePath property
export interface ExtendedFileSystemAdapter extends FileSystemAdapter {
  basePath: string;
}

export interface GitSyncSettings {
  enabled: boolean;
  autoCommitInterval: number;
  autoPushInterval: number;
  commitMessage: string;
  useLLMForCommitMessages: boolean;
  llmProvider: 'claude' | 'openai';
  llmApiKey: string;
  llmModel: string;
  branch: string;
  remoteName: string;
  useTempBranch: boolean;
  tempBranchPrefix: string;
  excludePatterns: string[];
  conflictResolution: 'manual' | 'merge' | 'overwrite';
  editorCommand: string;
}

export interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  renamed: Array<{ from: string; to: string }>;
  conflicted: string[];
  untracked: string[];
}

export interface CommitResult {
  success: boolean;
  message?: string;
  hash?: string;
  error?: Error;
}

export interface PushResult {
  success: boolean;
  message?: string;
  error?: Error;
}

export interface ConflictInfo {
  files: string[];
  resolved: boolean;
  message: string;
}