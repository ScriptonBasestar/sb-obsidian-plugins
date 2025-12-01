import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as moment from 'moment';

import MetadataManagerPlugin from './main';

// Mock Obsidian
vi.mock('obsidian', () => ({
  App: class MockApp {},
  Plugin: class MockPlugin {
    addCommand = vi.fn();
    addSettingTab = vi.fn();
    registerEvent = vi.fn();
    loadData = vi.fn().mockResolvedValue({});
    saveData = vi.fn().mockResolvedValue(undefined);
    app = {
      vault: {
        on: vi.fn(),
        read: vi.fn(),
        modify: vi.fn(),
      },
    };
  },
  PluginSettingTab: class MockPluginSettingTab {},
  Setting: class MockSetting {},
  TFile: class MockTFile {
    constructor(
      public name: string,
      public path: string,
      public basename: string
    ) {}
    parent = { name: 'folder', path: 'folder' };
  },
  Notice: class MockNotice {},
  TAbstractFile: class MockTAbstractFile {},
  moment,
}));

describe('MetadataManagerPlugin', () => {
  let plugin: MetadataManagerPlugin;

  beforeEach(() => {
    const mockApp = {
      vault: {
        on: vi.fn(),
        read: vi.fn(),
        modify: vi.fn(),
      },
    } as any;

    const mockManifest = {
      id: 'metadata-manager',
      name: 'Metadata Manager',
      version: '1.0.0',
    } as any;

    plugin = new MetadataManagerPlugin(mockApp, mockManifest);
    plugin.app = {
      vault: {
        on: vi.fn(),
        read: vi.fn(),
        modify: vi.fn(),
      },
    } as any;

    // Initialize settings with defaults
    plugin.settings = {
      enableAutoInsert: true,
      autoInsertOnNewFiles: true,
      autoInsertDelay: 1000,
      defaultTemplate:
        '---\ntitle: {{title}}\ncreated: {{created}}\nmodified: {{modified}}\ntags: []\n---',
      templatesByFolder: {},
      requiredFields: ['title', 'created'],
      optionalFields: ['tags', 'author', 'description'],
      autoGenerateCreated: true,
      autoGenerateModified: true,
      autoGenerateId: false,
      enableAutoFormat: true,
      fieldOrder: ['title', 'created', 'modified', 'tags', 'author', 'description'],
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
    };
  });

  describe('Template Processing', () => {
    it('should process template variables correctly', () => {
      const template = '---\ntitle: {{title}}\ncreated: {{created}}\nmodified: {{modified}}\n---';
      const mockFile = {
        basename: 'test-file',
        parent: { name: 'test-folder' },
      } as any;

      const result = (plugin as any).processTemplate(template, mockFile);

      expect(result).toContain('title: test-file');
      expect(result).toContain('created: 2024-01-01 12:00:00');
      expect(result).toContain('modified: 2024-01-01 12:00:00');
    });

    it('should generate unique IDs', () => {
      const id1 = (plugin as any).generateId();
      const id2 = (plugin as any).generateId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('Frontmatter Parsing', () => {
    it('should parse valid frontmatter correctly', () => {
      const content = `---
title: Test Document
created: 2024-01-01
tags: [test, document]
---

This is the body content.`;

      const result = (plugin as any).parseFrontmatter(content);

      expect(result.frontmatter).toEqual({
        title: 'Test Document',
        created: '2024-01-01',
        tags: ['test', 'document'],
      });
      expect(result.body).toBe('\nThis is the body content.');
    });

    it('should handle content without frontmatter', () => {
      const content = 'This is just body content.';

      const result = (plugin as any).parseFrontmatter(content);

      expect(result.frontmatter).toBeNull();
      expect(result.body).toBe(content);
    });

    it('should handle malformed frontmatter gracefully', () => {
      const content = `---
title: Test Document
invalid: [unclosed bracket
---

Body content.`;

      const result = (plugin as any).parseFrontmatter(content);

      expect(result.frontmatter).toBeNull();
      expect(result.body).toBe(content);
    });
  });

  describe('Frontmatter Validation', () => {
    beforeEach(() => {
      plugin.settings = {
        requiredFields: ['title', 'created'],
        dateFormat: 'YYYY-MM-DD HH:mm:ss',
      } as any;
    });

    it('should validate required fields', () => {
      const frontmatter = {
        title: 'Test Document',
        // missing 'created' field
      };

      const issues = (plugin as any).validateFrontmatter(frontmatter);

      expect(issues).toContain('Missing required field: created');
    });

    it('should validate date formats', () => {
      const frontmatter = {
        title: 'Test Document',
        created: 'invalid-date',
        modified: '2024-01-01 12:00:00',
      };

      const issues = (plugin as any).validateFrontmatter(frontmatter);

      expect(issues).toContain('Invalid created date format');
      expect(issues).not.toContain('Invalid modified date format');
    });

    it('should validate tags as array', () => {
      const frontmatter = {
        title: 'Test Document',
        created: '2024-01-01 12:00:00',
        tags: 'should-be-array',
      };

      const issues = (plugin as any).validateFrontmatter(frontmatter);

      expect(issues).toContain('Tags should be an array');
    });

    it('should pass validation for valid frontmatter', () => {
      const frontmatter = {
        title: 'Test Document',
        created: '2024-01-01 12:00:00',
        modified: '2024-01-01 12:00:00',
        tags: ['test', 'document'],
      };

      const issues = (plugin as any).validateFrontmatter(frontmatter);

      expect(issues).toHaveLength(0);
    });
  });

  describe('Template Selection', () => {
    beforeEach(() => {
      plugin.settings = {
        defaultTemplate: 'default template',
        templatesByFolder: {
          journal: 'journal template',
          'projects/work': 'work template',
        },
      } as any;
    });

    it('should use folder-specific template when available', () => {
      const mockFile = {
        parent: { path: 'journal/daily' },
      } as any;

      const template = (plugin as any).getTemplateForFile(mockFile);

      expect(template).toBe('journal template');
    });

    it('should use most specific folder template', () => {
      const mockFile = {
        parent: { path: 'projects/work/current' },
      } as any;

      const template = (plugin as any).getTemplateForFile(mockFile);

      expect(template).toBe('work template');
    });

    it('should fallback to default template', () => {
      const mockFile = {
        parent: { path: 'random/folder' },
      } as any;

      const template = (plugin as any).getTemplateForFile(mockFile);

      expect(template).toBe('default template');
    });

    it('should handle root files', () => {
      const mockFile = {
        parent: { path: '' },
      } as any;

      const template = (plugin as any).getTemplateForFile(mockFile);

      expect(template).toBe('default template');
    });
  });

  describe('Frontmatter Formatting', () => {
    beforeEach(() => {
      plugin.settings = {
        fieldOrder: ['title', 'created', 'modified', 'tags'],
      } as any;
    });

    it('should order fields according to settings', () => {
      const frontmatter = {
        tags: ['test'],
        modified: '2024-01-01',
        title: 'Test',
        created: '2024-01-01',
        author: 'John',
      };

      const formatted = (plugin as any).formatFrontmatterObject(frontmatter);

      // Should start with fields in order
      expect(formatted).toMatch(
        /^title: Test\ncreated: 2024-01-01\nmodified: 2024-01-01\ntags:\s*- test/
      );
      // Should include remaining fields
      expect(formatted).toContain('author: John');
    });
  });
});
