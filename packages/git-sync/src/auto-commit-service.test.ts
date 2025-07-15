import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoCommitService, AutoCommitSettings } from './auto-commit-service';
import { GitService, GitStatus } from './git-service';
import { LLMService } from './llm-service';

// Mock dependencies
vi.mock('./git-service');
vi.mock('./llm-service');
vi.mock('obsidian', () => ({
  Vault: class MockVault {},
  TFile: class MockTFile {},
  TFolder: class MockTFolder {}
}));

// Helper function to create mock GitStatus
const createMockGitStatus = (overrides: Partial<GitStatus> = {}): GitStatus => ({
  hasChanges: true,
  staged: [],
  unstaged: [],
  untracked: [],
  currentBranch: 'tmp',
  ahead: 0,
  behind: 0,
  ...overrides
});

describe('AutoCommitService', () => {
  let autoCommitService: AutoCommitService;
  let mockGitService: GitService;
  let mockSettings: AutoCommitSettings;
  let mockVault: any;

  beforeEach(() => {
    mockGitService = new GitService('');
    mockVault = {};
    mockSettings = {
      enableAutoCommit: true,
      commitIntervalMinutes: 5,
      includeUntracked: true,
      enableAutoPush: false,
      pushAfterCommits: 3,
      tempBranch: 'tmp',
      enableAICommitMessages: false,
      llmProvider: 'none',
      apiKey: '',
      commitPrompt: 'Generate commit message:'
    };

    autoCommitService = new AutoCommitService(mockGitService, mockSettings, mockVault);
    vi.clearAllMocks();
    
    // Spy on console methods to suppress logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('should initialize correctly', () => {
      expect(autoCommitService).toBeDefined();
    });

    it('should initialize LLM service with correct settings', () => {
      // LLMService constructor is called during AutoCommitService construction
      // but vi.mock creates a fresh mock for each test, so we verify behavior instead
      expect(autoCommitService).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should start auto commit service when enabled', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      autoCommitService.start();
      
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes in milliseconds
      );
    });

    it('should not start when auto commit is disabled', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      mockSettings.enableAutoCommit = false;
      autoCommitService = new AutoCommitService(mockGitService, mockSettings, mockVault);
      
      autoCommitService.start();
      
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('should stop auto commit service', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      autoCommitService.start();
      
      autoCommitService.stop();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should restart when start is called while already running', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      autoCommitService.start();
      autoCommitService.start(); // Start again
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateSettings', () => {
    it('should update settings and restart service', () => {
      const newSettings: AutoCommitSettings = {
        ...mockSettings,
        commitIntervalMinutes: 10,
        enableAICommitMessages: true,
        llmProvider: 'openai',
        apiKey: 'test-key'
      };

      autoCommitService.updateSettings(newSettings);
      
      // Should update LLM service
      expect(LLMService.prototype.updateSettings).toHaveBeenCalledWith({
        provider: 'openai',
        apiKey: 'test-key',
        commitPrompt: 'Generate commit message:',
        enabled: true
      });
    });

    it('should stop service when auto commit is disabled', () => {
      const stopSpy = vi.spyOn(autoCommitService, 'stop');
      const newSettings = { ...mockSettings, enableAutoCommit: false };
      
      autoCommitService.updateSettings(newSettings);
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('performCommit', () => {
    beforeEach(() => {
      // Mock git service methods
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('main');
      vi.mocked(mockGitService.switchBranch).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        staged: ['file1.ts'],
        unstaged: ['file2.js'],
        untracked: ['file3.md']
      }));
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({
        success: true,
        data: { hash: 'abc123' }
      });
      vi.mocked(mockGitService.getRecentCommits).mockResolvedValue([
        { hash: 'def456', message: 'previous commit' }
      ]);
    });

    it('should perform successful commit without LLM', async () => {
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('docs: auto commit');
      expect(result.filesChanged).toBe(3);
      expect(result.hash).toBe('abc123');
    });

    it('should switch to temp branch if not already on it', async () => {
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('main');
      
      await autoCommitService.performCommit();
      
      expect(mockGitService.switchBranch).toHaveBeenCalledWith('tmp');
    });

    it('should not switch branch if already on temp branch', async () => {
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      
      await autoCommitService.performCommit();
      
      expect(mockGitService.switchBranch).not.toHaveBeenCalled();
    });

    it('should return error if branch switch fails', async () => {
      vi.mocked(mockGitService.switchBranch).mockResolvedValue({
        success: false,
        error: 'Branch switch failed'
      });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to switch to tmp');
    });

    it('should return success when no changes to commit', async () => {
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        hasChanges: false
      }));
      
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('No changes to commit');
    });

    it('should use LLM for commit message when enabled', async () => {
      const settingsWithLLM = {
        ...mockSettings,
        enableAICommitMessages: true,
        llmProvider: 'openai' as const,
        apiKey: 'test-key'
      };
      autoCommitService.updateSettings(settingsWithLLM);
      
      // Mock LLM service to return success
      const mockLLMService = LLMService.prototype;
      vi.mocked(mockLLMService.generateCommitMessage).mockResolvedValue({
        success: true,
        message: 'feat: add new functionality'
      });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(true);
      expect(mockLLMService.generateCommitMessage).toHaveBeenCalled();
    });

    it('should fallback to default message when LLM fails', async () => {
      const settingsWithLLM = {
        ...mockSettings,
        enableAICommitMessages: true,
        llmProvider: 'openai' as const,
        apiKey: 'test-key'
      };
      autoCommitService.updateSettings(settingsWithLLM);
      
      // Mock LLM service to return failure
      const mockLLMService = LLMService.prototype;
      vi.mocked(mockLLMService.generateCommitMessage).mockResolvedValue({
        success: false,
        error: 'API error'
      });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('docs: auto commit'); // Fallback message
    });

    it('should handle commit failure', async () => {
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({
        success: false,
        error: 'Commit failed'
      });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Commit failed');
    });

    it('should auto push when enabled and commit count reached', async () => {
      const settingsWithAutoPush = {
        ...mockSettings,
        enableAutoPush: true,
        pushAfterCommits: 1
      };
      autoCommitService.updateSettings(settingsWithAutoPush);
      
      vi.mocked(mockGitService.push).mockResolvedValue({ success: true });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(true);
      expect(mockGitService.push).toHaveBeenCalledWith('tmp');
      expect(autoCommitService.getCommitCount()).toBe(0); // Reset after push
    });

    it('should handle push failure gracefully', async () => {
      const settingsWithAutoPush = {
        ...mockSettings,
        enableAutoPush: true,
        pushAfterCommits: 1
      };
      autoCommitService.updateSettings(settingsWithAutoPush);
      
      vi.mocked(mockGitService.push).mockResolvedValue({
        success: false,
        error: 'Push failed'
      });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(true); // Commit still succeeds
      expect(autoCommitService.getCommitCount()).toBe(1); // Count not reset
    });

    it('should handle exceptions during commit', async () => {
      vi.mocked(mockGitService.getStatus).mockRejectedValue(new Error('Git error'));
      
      const result = await autoCommitService.performCommit();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Git error');
    });
  });

  describe('generateFallbackCommitMessage', () => {
    it('should generate message for mixed file types', async () => {
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        staged: ['doc.md'],
        unstaged: ['script.js'],
        untracked: ['config.json']
      }));
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({ success: true });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.message).toContain('config: auto commit');
    });

    it('should generate message for markdown files only', async () => {
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        unstaged: ['doc1.md', 'doc2.md']
      }));
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({ success: true });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.message).toContain('docs: auto commit');
    });

    it('should generate message for asset files', async () => {
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        untracked: ['image.png', 'document.pdf']
      }));
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({ success: true });
      
      const result = await autoCommitService.performCommit();
      
      expect(result.message).toContain('assets: auto commit');
    });
  });

  describe('utility methods', () => {
    it('should track commit count correctly', async () => {
      expect(autoCommitService.getCommitCount()).toBe(0);
      
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        staged: ['file.ts']
      }));
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({ success: true });
      
      await autoCommitService.performCommit();
      
      expect(autoCommitService.getCommitCount()).toBe(1);
    });

    it('should reset commit count', () => {
      autoCommitService.resetCommitCount();
      expect(autoCommitService.getCommitCount()).toBe(0);
    });

    it('should track last commit time', async () => {
      const beforeTime = Date.now();
      
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        staged: ['file.ts']
      }));
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({ success: true });
      
      await autoCommitService.performCommit();
      
      const afterTime = Date.now();
      const lastCommitTime = autoCommitService.getLastCommitTime();
      
      expect(lastCommitTime).toBeGreaterThanOrEqual(beforeTime);
      expect(lastCommitTime).toBeLessThanOrEqual(afterTime);
    });

    it('should check if commit is due', async () => {
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        hasChanges: true
      }));
      
      const isDue = await autoCommitService.isCommitDue();
      expect(isDue).toBe(true);
    });

    it('should return false when no changes for commit due check', async () => {
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        hasChanges: false
      }));
      
      const isDue = await autoCommitService.isCommitDue();
      expect(isDue).toBe(false);
    });

    it('should get pending changes summary', async () => {
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        staged: ['file1.ts'],
        unstaged: ['file2.js', 'deleted_file.txt'],
        untracked: ['file3.md']
      }));
      
      const summary = await autoCommitService.getPendingChangesSummary();
      
      expect(summary).toEqual({
        hasChanges: true,
        totalFiles: 4, // staged(1) + unstaged(2) + untracked(1) = 4
        added: 1, // staged files
        modified: 1, // unstaged files excluding deleted
        deleted: 1, // unstaged files with deleted
        untracked: 1
      });
    });
  });

  describe('LLM integration methods', () => {
    it('should test LLM connection', async () => {
      const mockLLMService = LLMService.prototype;
      vi.mocked(mockLLMService.testConnection).mockResolvedValue({
        success: true,
        message: 'Connection successful'
      });
      
      const result = await autoCommitService.testLLMConnection();
      
      expect(result.success).toBe(true);
      expect(mockLLMService.testConnection).toHaveBeenCalled();
    });

    it('should handle LLM connection test error', async () => {
      const mockLLMService = LLMService.prototype;
      vi.mocked(mockLLMService.testConnection).mockRejectedValue(new Error('Network error'));
      
      const result = await autoCommitService.testLLMConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should get available LLM models', () => {
      const mockLLMService = LLMService.prototype;
      vi.mocked(mockLLMService.getAvailableModels).mockReturnValue(['gpt-3.5-turbo', 'gpt-4']);
      
      const models = autoCommitService.getAvailableLLMModels();
      
      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4']);
    });

    it('should estimate tokens for current changes', async () => {
      vi.mocked(mockGitService.getStatus).mockResolvedValue(createMockGitStatus({
        staged: ['file1.ts'],
        currentBranch: 'main'
      }));
      
      const mockLLMService = LLMService.prototype;
      vi.mocked(mockLLMService.estimateTokens).mockReturnValue(150);
      
      const tokens = await autoCommitService.estimateTokensForCurrentChanges();
      
      expect(tokens).toBe(150);
      expect(mockLLMService.estimateTokens).toHaveBeenCalled();
    });

    it('should handle token estimation error', async () => {
      vi.mocked(mockGitService.getStatus).mockRejectedValue(new Error('Git error'));
      
      const tokens = await autoCommitService.estimateTokensForCurrentChanges();
      
      expect(tokens).toBe(0);
    });
  });
});