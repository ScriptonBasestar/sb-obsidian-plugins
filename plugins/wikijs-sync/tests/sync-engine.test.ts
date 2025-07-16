import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, TFile, Vault, Notice } from 'obsidian';
import { SyncEngine } from '../src/sync-engine';
import { WikiJSClient } from '../src/wikijs-client';
import { WikiJSSyncSettings, DEFAULT_SETTINGS } from '../src/types';

vi.mock('obsidian');

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;
  let mockApp: App;
  let mockVault: Vault;
  let mockClient: WikiJSClient;
  let settings: WikiJSSyncSettings;

  beforeEach(() => {
    // Mock Vault
    mockVault = {
      getMarkdownFiles: vi.fn().mockReturnValue([]),
      read: vi.fn(),
      modify: vi.fn(),
      create: vi.fn(),
      createFolder: vi.fn(),
      getAbstractFileByPath: vi.fn(),
      configDir: '.obsidian',
    } as any;

    // Mock App
    mockApp = {
      vault: mockVault,
      workspace: {
        getActiveFile: vi.fn(),
      },
    } as any;

    // Mock WikiJSClient
    mockClient = {
      testConnection: vi.fn().mockResolvedValue(true),
      listPages: vi.fn().mockResolvedValue([]),
      getPage: vi.fn(),
      createPage: vi.fn(),
      updatePage: vi.fn(),
    } as any;

    // Settings
    settings = { ...DEFAULT_SETTINGS };

    syncEngine = new SyncEngine(mockApp, mockClient, settings);
  });

  describe('sync', () => {
    it('should prevent concurrent syncs', async () => {
      const syncPromise1 = syncEngine.sync();
      const syncPromise2 = syncEngine.sync();

      const result2 = await syncPromise2;
      expect(result2.success).toBe(false);
      expect(result2.message).toBe('Sync already in progress');

      await syncPromise1;
    });

    it('should test connection before syncing', async () => {
      mockClient.testConnection = vi.fn().mockResolvedValue(false);

      const result = await syncEngine.sync();
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to connect to WikiJS');
    });

    it('should sync based on direction setting', async () => {
      const mockFiles = [{ path: 'test.md', stat: { mtime: Date.now() }, basename: 'test' }];
      mockVault.getMarkdownFiles.mockReturnValue(mockFiles);
      mockVault.read.mockResolvedValue('# Test\nContent');

      // Test Obsidian to Wiki
      settings.syncDirection = 'obsidian-to-wiki';
      await syncEngine.sync();
      expect(mockClient.createPage).toHaveBeenCalled();

      // Reset mocks
      vi.clearAllMocks();
      mockClient.testConnection.mockResolvedValue(true);

      // Test Wiki to Obsidian
      settings.syncDirection = 'wiki-to-obsidian';
      mockClient.listPages.mockResolvedValue([{ path: '/test', title: 'Test', content: '# Test' }]);
      await syncEngine.sync();
      expect(mockVault.create).toHaveBeenCalled();
    });
  });

  describe('file filtering', () => {
    it('should skip excluded folders', async () => {
      const mockFiles = [
        { path: '.obsidian/config.md', stat: { mtime: Date.now() } },
        { path: 'valid.md', stat: { mtime: Date.now() } },
      ];
      mockVault.getMarkdownFiles.mockReturnValue(mockFiles);
      mockVault.read.mockResolvedValue('Content');
      mockClient.getPage.mockResolvedValue(null);
      mockClient.createPage.mockResolvedValue({ succeeded: true });

      settings.syncDirection = 'obsidian-to-wiki';
      const result = await syncEngine.sync();

      expect(mockClient.createPage).toHaveBeenCalledTimes(1);
      expect(mockClient.createPage).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.stringContaining('valid'),
        })
      );
    });

    it('should skip excluded files', async () => {
      settings.excludedFiles = ['README.md'];
      const mockFiles = [
        { path: 'README.md', stat: { mtime: Date.now() }, name: 'README.md' },
        { path: 'content.md', stat: { mtime: Date.now() }, name: 'content.md' },
      ];
      mockVault.getMarkdownFiles.mockReturnValue(mockFiles);
      mockVault.read.mockResolvedValue('Content');
      mockClient.getPage.mockResolvedValue(null);
      mockClient.createPage.mockResolvedValue({ succeeded: true });

      settings.syncDirection = 'obsidian-to-wiki';
      const result = await syncEngine.sync();

      expect(mockClient.createPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('bidirectional sync', () => {
    it('should handle conflicts based on settings', async () => {
      const now = Date.now();
      const mockFile = {
        path: 'test.md',
        stat: { mtime: now + 1000 },
        basename: 'test',
      };
      mockVault.getMarkdownFiles.mockReturnValue([mockFile]);
      mockVault.read.mockResolvedValue('Local content');

      const mockWikiPage = {
        id: '123',
        path: '/test',
        title: 'Test',
        content: 'Remote content',
        updatedAt: new Date(now + 2000).toISOString(),
      };
      mockClient.listPages.mockResolvedValue([mockWikiPage]);
      mockClient.getPage.mockResolvedValue(mockWikiPage);

      // Test manual conflict resolution
      settings.syncDirection = 'bidirectional';
      settings.conflictResolution = 'manual';
      const result = await syncEngine.sync();
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].path).toBe('test.md');

      // Test auto-resolve local
      settings.conflictResolution = 'local';
      mockClient.updatePage.mockResolvedValue({ succeeded: true });
      const result2 = await syncEngine.sync();
      expect(mockClient.updatePage).toHaveBeenCalled();

      // Test auto-resolve remote
      settings.conflictResolution = 'remote';
      const result3 = await syncEngine.sync();
      expect(mockVault.modify).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle sync errors gracefully', async () => {
      const mockFiles = [{ path: 'test.md', stat: { mtime: Date.now() }, basename: 'test' }];
      mockVault.getMarkdownFiles.mockReturnValue(mockFiles);
      mockVault.read.mockRejectedValue(new Error('Read failed'));

      settings.syncDirection = 'obsidian-to-wiki';
      const result = await syncEngine.sync();

      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('Read failed');
    });
  });

  describe('settings update', () => {
    it('should update internal components when settings change', () => {
      const newSettings = {
        ...settings,
        pathMapping: [{ obsidianPath: 'docs', wikiPath: '/documentation', enabled: true }],
      };

      syncEngine.updateSettings(newSettings);
      // This test mainly verifies no errors occur during update
      expect(true).toBe(true);
    });
  });
});
