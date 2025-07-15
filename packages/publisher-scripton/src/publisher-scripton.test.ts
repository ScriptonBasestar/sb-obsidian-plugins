import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublisherScriptonPlugin from './main';
import { ScriptonApiService } from './scripton-api-service';

// Mock Obsidian
vi.mock('obsidian', () => ({
  App: class MockApp {},
  Plugin: class MockPlugin {
    addCommand = vi.fn();
    addSettingTab = vi.fn();
    addStatusBarItem = vi.fn().mockReturnValue({ setText: vi.fn() });
    loadData = vi.fn().mockResolvedValue({});
    saveData = vi.fn().mockResolvedValue(undefined);
    app = {
      vault: {
        read: vi.fn(),
        readBinary: vi.fn(),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
        getAllLoadedFiles: vi.fn().mockReturnValue([])
      },
      metadataCache: {
        getFirstLinkpathDest: vi.fn()
      }
    };
  },
  PluginSettingTab: class MockPluginSettingTab {},
  Setting: class MockSetting {},
  TFile: class MockTFile {
    constructor(public name: string, public path: string, public basename: string, public extension: string) {}
    parent = { name: 'folder', path: 'folder' };
  },
  TFolder: class MockTFolder {
    constructor(public name: string, public path: string) {}
    children = [];
  },
  Notice: class MockNotice {},
  Modal: class MockModal {},
  FuzzySuggestModal: class MockFuzzySuggestModal {},
  Component: class MockComponent {}
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn().mockReturnValue({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })
  }
}));

describe('PublisherScriptonPlugin', () => {
  let plugin: PublisherScriptonPlugin;

  beforeEach(() => {
    plugin = new PublisherScriptonPlugin();
    plugin.app = {
      vault: {
        read: vi.fn(),
        readBinary: vi.fn(),
        getMarkdownFiles: vi.fn().mockReturnValue([]),
        getAllLoadedFiles: vi.fn().mockReturnValue([])
      },
      metadataCache: {
        getFirstLinkpathDest: vi.fn()
      }
    } as any;
    
    // Initialize settings with defaults
    plugin.settings = {
      apiKey: 'test-api-key',
      apiEndpoint: 'https://api.scripton.cloud',
      enablePublishing: true,
      defaultVisibility: 'private',
      includeAttachments: true,
      preserveLinks: true,
      stripFrontmatter: false,
      convertWikiLinks: true,
      customCssStyles: '',
      enableAutoPublish: false,
      autoPublishFolders: [],
      autoPublishTags: [],
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableDetailedLogs: false,
      logLevel: 'warn'
    };
  });

  describe('Content Processing', () => {
    it('should convert wiki links to markdown', () => {
      const content = 'This is a [[Wiki Link]] and [[Another Link|Display Text]].';
      
      const result = (plugin as any).convertWikiLinksToMarkdown(content);
      
      expect(result).toBe('This is a [Wiki Link](Wiki Link) and [Display Text](Another Link).');
    });

    it('should extract tags from frontmatter', () => {
      const content = `---
title: Test Note
tags: [tag1, tag2, "tag with spaces"]
---

This is #inline-tag content.`;

      const tags = (plugin as any).extractTags(content);
      
      expect(tags).toContain('tag1');
      expect(tags).toContain('tag2');
      expect(tags).toContain('tag with spaces');
      expect(tags).toContain('inline-tag');
    });

    it('should extract inline tags', () => {
      const content = 'This content has #tag1 and #another-tag/subtag.';
      
      const tags = (plugin as any).extractTags(content);
      
      expect(tags).toContain('tag1');
      expect(tags).toContain('another-tag/subtag');
    });

    it('should process content with options', async () => {
      const content = `---
title: Test Note
tags: [test]
---

This is [[a link]] content.`;
      
      const mockFile = {
        basename: 'test-file',
        path: 'test-file.md'
      } as any;

      const options = {
        stripFrontmatter: true,
        convertWikiLinks: true,
        includeAttachments: false
      };

      const result = await (plugin as any).processContent(content, mockFile, options);
      
      expect(result).not.toContain('---');
      expect(result).not.toContain('title: Test Note');
      expect(result).toContain('[a link](a link)');
    });
  });

  describe('Folder Processing', () => {
    it('should get markdown files from folder recursively', () => {
      const mockFiles = [
        { name: 'file1.md', extension: 'md' },
        { name: 'file2.txt', extension: 'txt' },
        { name: 'file3.md', extension: 'md' }
      ];
      
      const mockSubfolder = {
        children: [
          { name: 'sub1.md', extension: 'md' }
        ]
      };
      
      const mockFolder = {
        children: [...mockFiles, mockSubfolder]
      } as any;

      const result = (plugin as any).getMarkdownFilesInFolder(mockFolder);
      
      expect(result).toHaveLength(3); // 2 from main folder + 1 from subfolder
    });
  });

  describe('Settings Management', () => {
    it('should save settings and update API service', async () => {
      const mockApiService = {
        updateSettings: vi.fn()
      };
      
      (plugin as any).apiService = mockApiService;
      plugin.saveData = vi.fn().mockResolvedValue(undefined);
      
      await plugin.saveSettings();
      
      expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
      expect(mockApiService.updateSettings).toHaveBeenCalledWith(plugin.settings);
    });
  });
});

describe('ScriptonApiService', () => {
  let service: ScriptonApiService;
  let mockAxios: any;

  beforeEach(() => {
    const mockSettings = {
      apiKey: 'test-key',
      apiEndpoint: 'https://api.test.com',
      enableDetailedLogs: false,
      logLevel: 'warn',
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000
    };

    service = new ScriptonApiService(mockSettings);
    mockAxios = (service as any).api;
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      mockAxios.get.mockResolvedValue({
        data: { user: { id: 1, name: 'Test User' } }
      });

      const result = await service.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual({ id: 1, name: 'Test User' });
      expect(mockAxios.get).toHaveBeenCalledWith('/auth/test');
    });

    it('should handle connection test failure', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Note Publishing', () => {
    it('should publish note successfully', async () => {
      const publishOptions = {
        title: 'Test Note',
        content: 'Test content',
        visibility: 'private' as const,
        tags: ['test'],
        includeAttachments: true,
        preserveLinks: true
      };

      mockAxios.post.mockResolvedValue({
        data: {
          id: 'note-123',
          url: 'https://scripton.cloud/notes/note-123'
        }
      });

      const result = await service.publishNote(publishOptions);
      
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://scripton.cloud/notes/note-123');
      expect(result.id).toBe('note-123');
      
      expect(mockAxios.post).toHaveBeenCalledWith('/notes', expect.objectContaining({
        title: 'Test Note',
        content: 'Test content',
        visibility: 'private',
        tags: ['test']
      }));
    });

    it('should handle publish failure', async () => {
      const publishOptions = {
        title: 'Test Note',
        content: 'Test content',
        visibility: 'private' as const,
        tags: ['test'],
        includeAttachments: true,
        preserveLinks: true
      };

      mockAxios.post.mockRejectedValue({
        response: {
          data: { message: 'Invalid API key' }
        }
      });

      const result = await service.publishNote(publishOptions);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('Error Handling', () => {
    it('should extract error message from response', () => {
      const error = {
        response: {
          data: { message: 'Custom error message' }
        }
      };

      const errorMessage = (service as any).extractErrorMessage(error);
      
      expect(errorMessage).toBe('Custom error message');
    });

    it('should fallback to generic error message', () => {
      const error = {};

      const errorMessage = (service as any).extractErrorMessage(error);
      
      expect(errorMessage).toBe('Unknown error occurred');
    });

    it('should determine if error should be retried', () => {
      const networkError = { code: 'NETWORK_ERROR' };
      const serverError = { response: { status: 500 } };
      const clientError = { response: { status: 400 } };

      expect((service as any).shouldRetry(networkError)).toBe(true);
      expect((service as any).shouldRetry(serverError)).toBe(true);
      expect((service as any).shouldRetry(clientError)).toBe(false);
    });
  });

  describe('Logging', () => {
    it('should log messages with appropriate level', () => {
      (service as any).log('info', 'Test message');
      
      const logs = service.getLogs();
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Test message');
    });

    it('should respect log level filtering', () => {
      const settings = {
        logLevel: 'warn',
        enableDetailedLogs: false
      };
      
      service.updateSettings(settings);
      
      expect((service as any).shouldLog('error')).toBe(true);
      expect((service as any).shouldLog('warn')).toBe(true);
      expect((service as any).shouldLog('info')).toBe(false);
      expect((service as any).shouldLog('debug')).toBe(false);
    });

    it('should clear logs', () => {
      (service as any).log('info', 'Test message 1');
      (service as any).log('info', 'Test message 2');
      
      expect(service.getLogs()).toHaveLength(2);
      
      service.clearLogs();
      
      expect(service.getLogs()).toHaveLength(1); // Clear message itself
    });
  });
});