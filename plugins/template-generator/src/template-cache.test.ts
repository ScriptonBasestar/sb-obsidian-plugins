import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TemplateCache } from './template-cache';

// Mock Obsidian TFile
const createMockFile = (path: string, content: string, mtime: number, size: number) => ({
  path,
  basename: path.split('/').pop()?.replace('.md', '') || '',
  extension: 'md',
  stat: {
    mtime,
    size,
  },
});

// Mock Vault
const createMockVault = () => {
  const files = new Map();
  const eventListeners = new Map();

  return {
    getFiles: vi.fn(() => Array.from(files.values())),
    getAbstractFileByPath: vi.fn((path: string) => files.get(path)),
    read: vi.fn((file: any) => Promise.resolve(`# ${file.basename}\n\nTemplate content`)),
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event).push(callback);
    }),

    // Test helpers
    addFile: (
      path: string,
      content: string,
      mtime: number = Date.now(),
      size: number = content.length
    ) => {
      const file = createMockFile(path, content, mtime, size);
      files.set(path, file);
      return file;
    },
    removeFile: (path: string) => {
      files.delete(path);
    },
    triggerEvent: (event: string, ...args: any[]) => {
      const listeners = eventListeners.get(event) || [];
      listeners.forEach((callback: (...args: any[]) => void) => callback(...args));
    },
  };
};

describe('TemplateCache', () => {
  let mockVault: any;
  let cache: TemplateCache;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVault = createMockVault();
    cache = new TemplateCache(mockVault, 'templates');
  });

  afterEach(() => {
    cache.clearCache();
  });

  describe('Basic caching', () => {
    it('should cache templates after first load', async () => {
      // Arrange
      const file = mockVault.addFile('templates/test.md', '# Test Template', 1000, 100);

      // Act - First call should read from vault
      const templates1 = await cache.getTemplates();
      expect(mockVault.read).toHaveBeenCalledTimes(1);

      // Act - Second call should use cache
      const templates2 = await cache.getTemplates();
      expect(mockVault.read).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Assert
      expect(templates1).toEqual(templates2);
      expect(templates1).toHaveLength(1);
      expect(templates1[0].name).toBe('test');
    });

    it('should invalidate cache when file is modified', async () => {
      // Arrange
      const file = mockVault.addFile('templates/test.md', '# Test Template', 1000, 100);

      // Initial load
      await cache.getTemplates();
      expect(mockVault.read).toHaveBeenCalledTimes(1);

      // Simulate file modification
      file.stat.mtime = 2000;
      file.stat.size = 200;

      // Act
      await cache.getTemplates();

      // Assert - Should reload from vault
      expect(mockVault.read).toHaveBeenCalledTimes(2);
    });

    it('should handle cache invalidation on file events', async () => {
      // Arrange
      const file = mockVault.addFile('templates/test.md', '# Test Template', 1000, 100);

      // Initial load
      await cache.getTemplates();

      // Act - Trigger modify event
      mockVault.triggerEvent('modify', file);

      // The cache should be marked for invalidation
      const stats = cache.getCacheStats();
      expect(stats.entries.some((entry) => entry.path === file.path)).toBe(false);
    });
  });

  describe('File system events', () => {
    it('should handle file creation', async () => {
      // Initial state - no files
      let templates = await cache.getTemplates();
      expect(templates).toHaveLength(0);

      // Add a new template file
      const newFile = mockVault.addFile('templates/new.md', '# New Template', Date.now(), 50);
      mockVault.triggerEvent('create', newFile);

      // Cache should be invalidated, new file should be loaded
      templates = await cache.getTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('new');
    });

    it('should handle file deletion', async () => {
      // Arrange
      const file = mockVault.addFile('templates/test.md', '# Test Template', 1000, 100);
      await cache.getTemplates();

      // Act - Delete file
      mockVault.removeFile('templates/test.md');
      mockVault.triggerEvent('delete', file);

      // Assert - Cache entry should be removed
      const stats = cache.getCacheStats();
      expect(stats.entries.find((entry) => entry.path === file.path)).toBeUndefined();
    });

    it('should handle file rename', async () => {
      // Arrange
      const file = mockVault.addFile('templates/old.md', '# Old Template', 1000, 100);
      await cache.getTemplates();

      // Act - Simulate rename
      mockVault.removeFile('templates/old.md');
      const newFile = mockVault.addFile('templates/new.md', '# Old Template', 1000, 100);
      mockVault.triggerEvent('rename', newFile, 'templates/old.md');

      // Assert - Old cache entry should be removed
      const stats = cache.getCacheStats();
      expect(stats.entries.find((entry) => entry.path === 'templates/old.md')).toBeUndefined();
    });
  });

  describe('Template lookup methods', () => {
    beforeEach(async () => {
      // Setup test templates with metadata
      mockVault.read.mockImplementation((file: any): Promise<string> => {
        const templates: Record<string, string> = {
          'daily.md': `---
title: Daily Note
category: daily
tags: [daily, notes]
---
# Daily {{date}}`,
          'meeting.md': `---
title: Meeting Notes
category: meeting
tags: [meeting, work]
---
# Meeting {{title}}`,
          'simple.md': `# Simple template without frontmatter`,
        };
        const fileName = file.path.split('/').pop() as string;
        return Promise.resolve(templates[fileName] || '# Default');
      });

      mockVault.addFile('templates/daily.md', '', 1000, 100);
      mockVault.addFile('templates/meeting.md', '', 1001, 200);
      mockVault.addFile('templates/simple.md', '', 1002, 50);
    });

    it('should find template by name', async () => {
      const template = await cache.getTemplateByName('daily');
      expect(template).toBeTruthy();
      expect(template?.name).toBe('daily');
      expect(template?.metadata.category).toBe('daily');
    });

    it('should find templates by category', async () => {
      const dailyTemplates = await cache.getTemplatesByCategory('daily');
      expect(dailyTemplates).toHaveLength(1);
      expect(dailyTemplates[0].name).toBe('daily');

      const meetingTemplates = await cache.getTemplatesByCategory('meeting');
      expect(meetingTemplates).toHaveLength(1);
      expect(meetingTemplates[0].name).toBe('meeting');
    });

    it('should find templates by tag', async () => {
      const dailyTagged = await cache.getTemplatesByTag('daily');
      expect(dailyTagged).toHaveLength(1);
      expect(dailyTagged[0].name).toBe('daily');

      const workTagged = await cache.getTemplatesByTag('work');
      expect(workTagged).toHaveLength(1);
      expect(workTagged[0].name).toBe('meeting');
    });

    it('should search templates by content and metadata', async () => {
      // Search by title
      let results = await cache.searchTemplates('Daily Note');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('daily');

      // Search by category
      results = await cache.searchTemplates('meeting');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('meeting');

      // Search by content
      results = await cache.searchTemplates('Simple template');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('simple');
    });
  });

  describe('Cache management', () => {
    it('should provide cache statistics', async () => {
      mockVault.addFile('templates/test1.md', '# Test 1', 1000, 100);
      mockVault.addFile('templates/test2.md', '# Test 2', 1001, 200);

      await cache.getTemplates();

      const stats = cache.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries.every((entry) => entry.isValid)).toBe(true);
    });

    it('should clear cache completely', async () => {
      mockVault.addFile('templates/test.md', '# Test', 1000, 100);
      await cache.getTemplates();

      expect(cache.getCacheStats().size).toBe(1);

      cache.clearCache();

      expect(cache.getCacheStats().size).toBe(0);
    });

    it('should update template folder and clear cache', async () => {
      mockVault.addFile('templates/test.md', '# Test', 1000, 100);
      await cache.getTemplates();

      expect(cache.getCacheStats().size).toBe(1);

      cache.updateTemplateFolder('new-templates');

      expect(cache.getCacheStats().size).toBe(0);
    });

    it('should preload templates for performance', async () => {
      mockVault.addFile('templates/test1.md', '# Test 1', 1000, 100);
      mockVault.addFile('templates/test2.md', '# Test 2', 1001, 200);

      await cache.preloadTemplates();

      expect(mockVault.read).toHaveBeenCalledTimes(2);
      expect(cache.getCacheStats().size).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should handle vault read errors gracefully', async () => {
      const file = mockVault.addFile('templates/error.md', '# Error Template', 1000, 100);
      mockVault.read.mockRejectedValueOnce(new Error('Permission denied'));

      const template = await cache.getTemplate(file);

      expect(template).toBeNull();
      expect(cache.getCacheStats().size).toBe(0);
    });

    it('should handle missing files in cache validation', async () => {
      const file = mockVault.addFile('templates/test.md', '# Test', 1000, 100);
      await cache.getTemplates();

      // Remove file from vault but keep in cache
      mockVault.removeFile('templates/test.md');

      const stats = cache.getCacheStats();
      const entry = stats.entries.find((e) => e.path === 'templates/test.md');
      expect(entry?.isValid).toBe(false);
    });
  });
});
