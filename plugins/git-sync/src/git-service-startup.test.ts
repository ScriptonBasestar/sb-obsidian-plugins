import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitService } from './git-service';

// Mock simple-git
vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => ({
    checkIsRepo: vi.fn(),
    getRemotes: vi.fn(),
    pullRebase: vi.fn(),
    revparse: vi.fn(),
    status: vi.fn(),
    log: vi.fn(),
  })),
}));

describe('GitService - Startup Pull Methods', () => {
  let gitService: GitService;
  let mockGit: any;

  beforeEach(() => {
    gitService = new GitService('/test/repo');
    mockGit = (gitService as any).git;
    vi.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true when in a git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);

      const result = await gitService.isGitRepository();

      expect(result).toBe(true);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should return false when not in a git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);

      const result = await gitService.isGitRepository();

      expect(result).toBe(false);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should return false when checkIsRepo throws an error', async () => {
      mockGit.checkIsRepo.mockRejectedValue(new Error('Not a git repository'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await gitService.isGitRepository();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check if git repository:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('hasRemote', () => {
    it('should return true when origin remote exists', async () => {
      mockGit.getRemotes.mockResolvedValue([
        { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } },
        { name: 'upstream', refs: { fetch: 'https://github.com/upstream/repo.git' } },
      ]);

      const result = await gitService.hasRemote();

      expect(result).toBe(true);
      expect(mockGit.getRemotes).toHaveBeenCalledWith(true);
    });

    it('should return true when specified remote exists', async () => {
      mockGit.getRemotes.mockResolvedValue([
        { name: 'upstream', refs: { fetch: 'https://github.com/upstream/repo.git' } },
      ]);

      const result = await gitService.hasRemote('upstream');

      expect(result).toBe(true);
      expect(mockGit.getRemotes).toHaveBeenCalledWith(true);
    });

    it('should return false when origin remote does not exist', async () => {
      mockGit.getRemotes.mockResolvedValue([
        { name: 'upstream', refs: { fetch: 'https://github.com/upstream/repo.git' } },
      ]);

      const result = await gitService.hasRemote();

      expect(result).toBe(false);
    });

    it('should return false when no remotes exist', async () => {
      mockGit.getRemotes.mockResolvedValue([]);

      const result = await gitService.hasRemote();

      expect(result).toBe(false);
    });

    it('should return false when getRemotes throws an error', async () => {
      mockGit.getRemotes.mockRejectedValue(new Error('Failed to get remotes'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await gitService.hasRemote();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check remote configuration:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('hasUncommittedChanges', () => {
    beforeEach(() => {
      // Mock getCurrentBranch and other status dependencies
      mockGit.revparse.mockResolvedValue('main\n');
      mockGit.raw = vi.fn().mockResolvedValue('0\t0\n');
    });

    it('should return true when there are uncommitted changes', async () => {
      mockGit.status.mockResolvedValue({
        files: [
          { path: 'file1.ts', index: 'M', working_dir: ' ' },
          { path: 'file2.js', index: ' ', working_dir: 'M' },
        ],
        staged: ['file1.ts'],
        modified: ['file2.js'],
        deleted: [],
        not_added: [],
      });

      const result = await gitService.hasUncommittedChanges();

      expect(result).toBe(true);
    });

    it('should return false when there are no uncommitted changes', async () => {
      mockGit.status.mockResolvedValue({
        files: [],
        staged: [],
        modified: [],
        deleted: [],
        not_added: [],
      });

      const result = await gitService.hasUncommittedChanges();

      expect(result).toBe(false);
    });

    it('should return false when getStatus throws an error', async () => {
      mockGit.status.mockRejectedValue(new Error('Git status failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await gitService.hasUncommittedChanges();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check uncommitted changes:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      mockGit.revparse.mockResolvedValue('feature/test-branch\n');

      const result = await gitService.getCurrentBranch();

      expect(result).toBe('feature/test-branch');
      expect(mockGit.revparse).toHaveBeenCalledWith(['--abbrev-ref', 'HEAD']);
    });

    it('should return trimmed branch name', async () => {
      mockGit.revparse.mockResolvedValue('  main  \n');

      const result = await gitService.getCurrentBranch();

      expect(result).toBe('main');
    });

    it('should return "unknown" when revparse fails', async () => {
      mockGit.revparse.mockRejectedValue(new Error('Not a git repository'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await gitService.getCurrentBranch();

      expect(result).toBe('unknown');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get current branch:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('hasCommitsAhead', () => {
    beforeEach(() => {
      mockGit.revparse.mockResolvedValue('main\n');
      mockGit.raw = vi.fn().mockResolvedValue('0\t2\n'); // 0 behind, 2 ahead
    });

    it('should return true when branch has commits ahead', async () => {
      mockGit.status.mockResolvedValue({
        files: [],
        staged: [],
        modified: [],
        deleted: [],
        not_added: [],
      });

      const result = await gitService.hasCommitsAhead('main');

      expect(result).toBe(true);
    });

    it('should return false when branch has no commits ahead', async () => {
      mockGit.raw = vi.fn().mockResolvedValue('0\t0\n'); // 0 behind, 0 ahead
      mockGit.status.mockResolvedValue({
        files: [],
        staged: [],
        modified: [],
        deleted: [],
        not_added: [],
      });

      const result = await gitService.hasCommitsAhead('main');

      expect(result).toBe(false);
    });
  });

  describe('isSafeToAutoMerge', () => {
    beforeEach(() => {
      mockGit.revparse.mockResolvedValue('tmp\n');
      mockGit.raw = vi.fn().mockResolvedValue('0\t2\n'); // 0 behind, 2 ahead
    });

    it('should return safe when all conditions are met', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.getRemotes.mockResolvedValue([
        { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } },
      ]);
      mockGit.status.mockResolvedValue({
        files: [],
        staged: [],
        modified: [],
        deleted: [],
        not_added: [],
      });

      const result = await gitService.isSafeToAutoMerge('tmp', 'main');

      expect(result.safe).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return unsafe when not in git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);

      const result = await gitService.isSafeToAutoMerge('tmp', 'main');

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('Not in a git repository');
    });

    it('should return unsafe when no remote configured', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.getRemotes.mockResolvedValue([]);

      const result = await gitService.isSafeToAutoMerge('tmp', 'main');

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('No remote repository configured');
    });

    it('should return unsafe when not on temp branch', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.getRemotes.mockResolvedValue([
        { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } },
      ]);
      mockGit.revparse.mockResolvedValue('main\n'); // Currently on main, not tmp

      const result = await gitService.isSafeToAutoMerge('tmp', 'main');

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('Not on temp branch (currently on main)');
    });

    it('should return unsafe when no commits ahead', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.getRemotes.mockResolvedValue([
        { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } },
      ]);
      mockGit.revparse.mockResolvedValue('tmp\n');
      mockGit.raw = vi.fn().mockResolvedValue('0\t0\n'); // 0 behind, 0 ahead
      mockGit.status.mockResolvedValue({
        files: [],
        staged: [],
        modified: [],
        deleted: [],
        not_added: [],
      });

      const result = await gitService.isSafeToAutoMerge('tmp', 'main');

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('No commits ahead on temp branch');
    });
  });

  describe('integration scenarios', () => {
    it('should properly validate repository state for startup pull', async () => {
      // Setup successful repository state
      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.getRemotes.mockResolvedValue([
        { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } },
      ]);

      const isRepo = await gitService.isGitRepository();
      const hasRemote = await gitService.hasRemote();

      expect(isRepo).toBe(true);
      expect(hasRemote).toBe(true);

      // This combination would allow startup pull to proceed
      expect(isRepo && hasRemote).toBe(true);
    });

    it('should prevent startup pull when not in git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);
      mockGit.getRemotes.mockResolvedValue([]);

      const isRepo = await gitService.isGitRepository();
      const hasRemote = await gitService.hasRemote(); // This would still check, but result doesn't matter

      expect(isRepo).toBe(false);
      // Startup pull should be skipped regardless of remote status
    });

    it('should prevent startup pull when no remote configured', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.getRemotes.mockResolvedValue([]);

      const isRepo = await gitService.isGitRepository();
      const hasRemote = await gitService.hasRemote();

      expect(isRepo).toBe(true);
      expect(hasRemote).toBe(false);
      // Startup pull should be skipped due to missing remote
    });

    it('should validate auto-merge safety conditions', async () => {
      // Setup for safe auto-merge
      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.getRemotes.mockResolvedValue([
        { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git' } },
      ]);
      mockGit.revparse.mockResolvedValue('tmp\n');
      mockGit.raw = vi.fn().mockResolvedValue('0\t2\n'); // 2 commits ahead
      mockGit.status.mockResolvedValue({
        files: [],
        staged: [],
        modified: [],
        deleted: [],
        not_added: [],
      });

      const result = await gitService.isSafeToAutoMerge('tmp', 'main');

      expect(result.safe).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});
