import { Plugin } from 'obsidian';
import { GitSyncPlugin } from './main';

export function registerCommands(plugin: GitSyncPlugin): void {
  // Git operations
  plugin.addCommand({
    id: 'manual-commit',
    name: 'Manual Commit',
    callback: () => plugin.manualCommit(),
  });

  plugin.addCommand({
    id: 'manual-push',
    name: 'Manual Push',
    callback: () => plugin.manualPush(),
  });

  plugin.addCommand({
    id: 'manual-pull',
    name: 'Manual Pull',
    callback: () => plugin.manualPull(),
  });

  // Branch management
  plugin.addCommand({
    id: 'switch-to-temp-branch',
    name: 'Switch to Temp Branch',
    callback: () => plugin.switchToTempBranch(),
  });

  plugin.addCommand({
    id: 'merge-temp-to-main',
    name: 'Merge Temp to Main',
    callback: () => plugin.mergeTempToMain(),
  });

  // Auto features
  plugin.addCommand({
    id: 'toggle-auto-commit',
    name: 'Toggle Auto Commit',
    callback: () => plugin.toggleAutoCommit(),
  });

  // AI features
  plugin.addCommand({
    id: 'test-llm-connection',
    name: 'Test LLM API Connection',
    callback: () => plugin.testLLMConnection(),
  });

  plugin.addCommand({
    id: 'generate-ai-commit-message',
    name: 'Generate AI Commit Message',
    callback: () => plugin.generateAICommitMessage(),
  });

  plugin.addCommand({
    id: 'preview-prompt',
    name: 'Preview Commit Prompt',
    callback: () => plugin.previewPrompt(),
  });

  // Testing commands
  plugin.addCommand({
    id: 'test-startup-pull',
    name: 'Test Startup Pull',
    callback: () => plugin.testStartupPull(),
  });

  plugin.addCommand({
    id: 'test-auto-merge',
    name: 'Test Auto Merge',
    callback: () => plugin.testAutoMerge(),
  });
}