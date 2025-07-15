import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoCommitService } from './auto-commit-service';
import { GitService } from './git-service';

// Mock dependencies
vi.mock('./git-service');
vi.mock('obsidian', () => ({
  Vault: class MockVault {},
}));

describe('AutoCommitService - Auto Merge', () => {
  let service: AutoCommitService;
  let mockGitService: GitService;
  let mockVault: any;

  beforeEach(() => {
    mockGitService = new GitService('');
    mockVault = {};

    const settings = {
      enableAutoCommit: true,
      commitIntervalMinutes: 10,
      includeUntracked: true,
      enableAutoPush: true,
      pushAfterCommits: 1,
      tempBranch: 'tmp',
      mainBranch: 'main',
      enableAutoMerge: true,
      mergeStrategy: 'merge' as const,
      enableAICommitMessages: false,
      llmProvider: 'none' as const,
      apiKey: '',
      commitPrompt: '',
      useTemplateEngine: false,
      selectedTemplate: '',
    };

    service = new AutoCommitService(mockGitService, settings, mockVault);

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('performManualAutoMerge', () => {
    it('should perform auto merge when conditions are met', async () => {
      // Setup successful merge scenario
      vi.mocked(mockGitService.isSafeToAutoMerge).mockResolvedValue({ safe: true });
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.switchBranch).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.getStatus).mockResolvedValue({
        hasChanges: false,
        staged: [],
        unstaged: [],
        untracked: [],
        currentBranch: 'main',
        ahead: 0,
        behind: 0,
      });
      vi.mocked(mockGitService.pullRebase).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.mergeBranches).mockResolvedValue({
        success: true,
        conflicts: false,
      });
      vi.mocked(mockGitService.push).mockResolvedValue({ success: true });

      await service.performManualAutoMerge();

      expect(mockGitService.isSafeToAutoMerge).toHaveBeenCalledWith('tmp', 'main');
      expect(mockGitService.switchBranch).toHaveBeenCalledWith('main');
      expect(mockGitService.pullRebase).toHaveBeenCalledWith('main');
      expect(mockGitService.mergeBranches).toHaveBeenCalledWith('tmp', 'main', 'merge');
      expect(mockGitService.push).toHaveBeenCalledWith('main');
      expect(console.log).toHaveBeenCalledWith('Auto merge successful: tmp → main');
    });

    it('should skip merge when safety check fails', async () => {
      vi.mocked(mockGitService.isSafeToAutoMerge).mockResolvedValue({
        safe: false,
        reason: 'No commits ahead on temp branch',
      });

      await service.performManualAutoMerge();

      expect(mockGitService.isSafeToAutoMerge).toHaveBeenCalled();
      expect(mockGitService.switchBranch).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Skipping auto merge: No commits ahead on temp branch'
      );
    });

    it('should skip merge when main branch has uncommitted changes', async () => {
      vi.mocked(mockGitService.isSafeToAutoMerge).mockResolvedValue({ safe: true });
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.switchBranch).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.getStatus).mockResolvedValue({
        hasChanges: true, // Main branch has changes
        staged: ['file.txt'],
        unstaged: [],
        untracked: [],
        currentBranch: 'main',
        ahead: 0,
        behind: 0,
      });

      await service.performManualAutoMerge();

      expect(mockGitService.switchBranch).toHaveBeenCalledWith('main');
      expect(mockGitService.pullRebase).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        'Main branch has uncommitted changes, skipping auto merge'
      );
    });

    it('should handle merge conflicts gracefully', async () => {
      vi.mocked(mockGitService.isSafeToAutoMerge).mockResolvedValue({ safe: true });
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.switchBranch).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.getStatus).mockResolvedValue({
        hasChanges: false,
        staged: [],
        unstaged: [],
        untracked: [],
        currentBranch: 'main',
        ahead: 0,
        behind: 0,
      });
      vi.mocked(mockGitService.pullRebase).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.mergeBranches).mockResolvedValue({
        success: true,
        conflicts: true,
        error: 'Merge conflicts detected',
      });

      await service.performManualAutoMerge();

      expect(mockGitService.mergeBranches).toHaveBeenCalled();
      expect(mockGitService.push).not.toHaveBeenCalled(); // No push on conflicts
      expect(console.warn).toHaveBeenCalledWith(
        'Auto merge has conflicts - manual resolution required'
      );
    });

    it('should handle merge failure and switch back to temp branch', async () => {
      vi.mocked(mockGitService.isSafeToAutoMerge).mockResolvedValue({ safe: true });
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.switchBranch).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.getStatus).mockResolvedValue({
        hasChanges: false,
        staged: [],
        unstaged: [],
        untracked: [],
        currentBranch: 'main',
        ahead: 0,
        behind: 0,
      });
      vi.mocked(mockGitService.pullRebase).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.mergeBranches).mockResolvedValue({
        success: false,
        error: 'Merge failed',
      });

      await service.performManualAutoMerge();

      expect(mockGitService.mergeBranches).toHaveBeenCalled();
      expect(mockGitService.switchBranch).toHaveBeenCalledWith('tmp'); // Switch back
      expect(console.warn).toHaveBeenCalledWith('Auto merge failed: Merge failed');
    });

    it('should handle push failure after successful merge', async () => {
      vi.mocked(mockGitService.isSafeToAutoMerge).mockResolvedValue({ safe: true });
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.switchBranch).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.getStatus).mockResolvedValue({
        hasChanges: false,
        staged: [],
        unstaged: [],
        untracked: [],
        currentBranch: 'main',
        ahead: 0,
        behind: 0,
      });
      vi.mocked(mockGitService.pullRebase).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.mergeBranches).mockResolvedValue({
        success: true,
        conflicts: false,
      });
      vi.mocked(mockGitService.push).mockResolvedValue({
        success: false,
        error: 'Push failed',
      });

      await service.performManualAutoMerge();

      expect(mockGitService.push).toHaveBeenCalledWith('main');
      expect(mockGitService.switchBranch).toHaveBeenLastCalledWith('tmp'); // Switch back to temp
      expect(console.log).toHaveBeenCalledWith('Auto merge successful: tmp → main');
      expect(console.warn).toHaveBeenCalledWith('Auto merge push failed: Push failed');
    });

    it('should handle errors and attempt to switch back to temp branch', async () => {
      vi.mocked(mockGitService.isSafeToAutoMerge).mockResolvedValue({ safe: true });
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.switchBranch).mockRejectedValue(new Error('Switch failed'));

      await service.performManualAutoMerge();

      expect(console.error).toHaveBeenCalledWith('Auto merge error:', expect.any(Error));
      // Should try to switch back to temp branch even after error
      expect(mockGitService.switchBranch).toHaveBeenCalledWith('tmp');
    });
  });

  describe('auto merge integration with commit flow', () => {
    it('should trigger auto merge after successful auto push when enabled', async () => {
      // Setup service with commit count that will trigger push (pushAfterCommits = 1)
      // So we need to make sure this is the first commit that triggers push
      const settings = {
        enableAutoCommit: true,
        commitIntervalMinutes: 10,
        includeUntracked: true,
        enableAutoPush: true,
        pushAfterCommits: 1, // This will trigger push immediately
        tempBranch: 'tmp',
        mainBranch: 'main',
        enableAutoMerge: true,
        mergeStrategy: 'merge' as const,
        enableAICommitMessages: false,
        llmProvider: 'none' as const,
        apiKey: '',
        commitPrompt: 'test commit',
        useTemplateEngine: false,
        selectedTemplate: '',
      };

      service.updateSettings(settings);

      // Mock a successful commit scenario
      vi.mocked(mockGitService.getCurrentBranch)
        .mockResolvedValueOnce('tmp') // First call for branch check
        .mockResolvedValueOnce('tmp') // For merge safety check
        .mockResolvedValueOnce('main') // After switching to main
        .mockResolvedValueOnce('tmp'); // Final switch back

      vi.mocked(mockGitService.getStatus)
        .mockResolvedValueOnce({
          hasChanges: true,
          staged: [],
          unstaged: ['file.txt'],
          untracked: [],
          currentBranch: 'tmp',
          ahead: 1,
          behind: 0,
        })
        .mockResolvedValueOnce({
          hasChanges: false,
          staged: [],
          unstaged: [],
          untracked: [],
          currentBranch: 'main',
          ahead: 0,
          behind: 0,
        });
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({
        success: true,
        data: { hash: 'abc123' },
      });
      vi.mocked(mockGitService.push).mockResolvedValue({ success: true });

      // Mock auto merge success - need to setup all the calls in sequence
      vi.mocked(mockGitService.isSafeToAutoMerge).mockResolvedValue({ safe: true });
      vi.mocked(mockGitService.switchBranch).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.pullRebase).mockResolvedValue({ success: true });
      vi.mocked(mockGitService.mergeBranches).mockResolvedValue({
        success: true,
        conflicts: false,
      });

      const result = await service.performCommit();

      expect(result.success).toBe(true);
      expect(mockGitService.push).toHaveBeenCalledWith('tmp');
      // Auto merge should be triggered after successful push
      expect(mockGitService.isSafeToAutoMerge).toHaveBeenCalled();
      expect(mockGitService.mergeBranches).toHaveBeenCalled();
    });

    it('should not trigger auto merge when enableAutoMerge is false', async () => {
      // Update settings to disable auto merge
      const settings = {
        enableAutoCommit: true,
        commitIntervalMinutes: 10,
        includeUntracked: true,
        enableAutoPush: true,
        pushAfterCommits: 1,
        tempBranch: 'tmp',
        mainBranch: 'main',
        enableAutoMerge: false, // Disabled
        mergeStrategy: 'merge' as const,
        enableAICommitMessages: false,
        llmProvider: 'none' as const,
        apiKey: '',
        commitPrompt: '',
        useTemplateEngine: false,
        selectedTemplate: '',
      };

      service.updateSettings(settings);

      // Mock successful commit and push
      vi.mocked(mockGitService.getCurrentBranch).mockResolvedValue('tmp');
      vi.mocked(mockGitService.getStatus).mockResolvedValue({
        hasChanges: true,
        staged: [],
        unstaged: ['file.txt'],
        untracked: [],
        currentBranch: 'tmp',
        ahead: 1,
        behind: 0,
      });
      vi.mocked(mockGitService.addAndCommit).mockResolvedValue({
        success: true,
        data: { hash: 'abc123' },
      });
      vi.mocked(mockGitService.push).mockResolvedValue({ success: true });

      const result = await service.performCommit();

      expect(result.success).toBe(true);
      expect(mockGitService.push).toHaveBeenCalledWith('tmp');
      // Auto merge should NOT be triggered
      expect(mockGitService.isSafeToAutoMerge).not.toHaveBeenCalled();
      expect(mockGitService.mergeBranches).not.toHaveBeenCalled();
    });
  });
});
