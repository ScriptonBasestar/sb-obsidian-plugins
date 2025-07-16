import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataConverter } from '../src/metadata-converter';
import { MetadataMapping } from '../src/types';

describe('MetadataConverter', () => {
  let converter: MetadataConverter;
  let mapping: MetadataMapping;

  beforeEach(() => {
    mapping = {
      tags: {
        enabled: true,
        prefix: 'obsidian:',
      },
      categories: {
        enabled: true,
        fieldName: 'categories',
      },
      customFields: [
        {
          obsidianField: 'author',
          wikiField: 'authorName',
          type: 'string',
        },
      ],
    };
    converter = new MetadataConverter(mapping);
  });

  describe('extractFrontmatter', () => {
    it('should extract YAML frontmatter', () => {
      const content = `---
title: Test Page
tags: [test, sample]
author: John Doe
---

# Content

This is the body content.`;

      const { frontmatter, body } = converter.extractFrontmatter(content);

      expect(frontmatter.title).toBe('Test Page');
      expect(frontmatter.tags).toEqual(['test', 'sample']);
      expect(frontmatter.author).toBe('John Doe');
      expect(body).toBe('# Content\n\nThis is the body content.');
    });

    it('should handle content without frontmatter', () => {
      const content = '# Just Content\n\nNo frontmatter here.';
      const { frontmatter, body } = converter.extractFrontmatter(content);

      expect(frontmatter).toEqual({});
      expect(body).toBe(content);
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---

# Content`;

      const { frontmatter, body } = converter.extractFrontmatter(content);
      expect(frontmatter).toEqual({});
      expect(body).toBe('# Content');
    });
  });

  describe('obsidianToWiki', () => {
    it('should convert Obsidian metadata to WikiJS format', () => {
      const obsidianMeta = {
        tags: ['note', 'important'],
        categories: ['docs', 'guides'],
        author: 'Jane Smith',
        description: 'A test page',
      };

      const wikiMeta = converter.obsidianToWiki(obsidianMeta);

      expect(wikiMeta.tags).toEqual(['obsidian:note', 'obsidian:important']);
      expect(wikiMeta.description).toBe('A test page');
      expect(wikiMeta.customFields).toEqual({
        authorName: 'Jane Smith',
      });
    });

    it('should handle disabled tag mapping', () => {
      mapping.tags.enabled = false;
      converter = new MetadataConverter(mapping);

      const obsidianMeta = {
        tags: ['test'],
      };

      const wikiMeta = converter.obsidianToWiki(obsidianMeta);
      expect(wikiMeta.tags).toBeUndefined();
    });

    it('should handle nested tags', () => {
      const obsidianMeta = {
        tags: ['project/frontend', 'status/done'],
      };

      const wikiMeta = converter.obsidianToWiki(obsidianMeta);
      expect(wikiMeta.tags).toEqual(['obsidian:project-frontend', 'obsidian:status-done']);
    });
  });

  describe('wikiToObsidian', () => {
    it('should convert WikiJS page to Obsidian metadata', () => {
      const wikiPage = {
        id: '123',
        path: '/test',
        title: 'Test Page',
        content: 'Content',
        tags: ['obsidian:note', 'wiki:other'],
        description: 'Test description',
        updatedAt: '2024-01-16T00:00:00Z',
        createdAt: '2024-01-15T00:00:00Z',
      } as any;

      const obsidianMeta = converter.wikiToObsidian(wikiPage);

      expect(obsidianMeta.title).toBe('Test Page');
      expect(obsidianMeta.tags).toEqual(['note']);
      expect(obsidianMeta.description).toBe('Test description');
      expect(obsidianMeta['wiki-id']).toBe('123');
      expect(obsidianMeta['wiki-updated']).toBe('2024-01-16T00:00:00Z');
    });

    it('should preserve non-prefixed tags', () => {
      mapping.tags.prefix = '';
      converter = new MetadataConverter(mapping);

      const wikiPage = {
        tags: ['note', 'important'],
      } as any;

      const obsidianMeta = converter.wikiToObsidian(wikiPage);
      expect(obsidianMeta.tags).toEqual(['note', 'important']);
    });
  });

  describe('mergeFrontmatter', () => {
    it('should merge frontmatter with content', () => {
      const content = '# My Content\n\nBody text';
      const frontmatter = {
        title: 'Test',
        tags: ['test'],
        author: 'Me',
      };

      const merged = converter.mergeFrontmatter(content, frontmatter);

      expect(merged).toContain('---');
      expect(merged).toContain('title: Test');
      expect(merged).toContain('tags:');
      expect(merged).toContain('  - test');
      expect(merged).toContain('author: Me');
      expect(merged).toContain('# My Content');
    });

    it('should handle empty frontmatter', () => {
      const content = '# Content';
      const frontmatter = {};

      const merged = converter.mergeFrontmatter(content, frontmatter);
      expect(merged).toBe('# Content');
    });

    it('should format arrays properly', () => {
      const content = 'Body';
      const frontmatter = {
        tags: ['a', 'b', 'c'],
        categories: ['x', 'y'],
      };

      const merged = converter.mergeFrontmatter(content, frontmatter);
      expect(merged).toContain('tags:\n  - a\n  - b\n  - c');
      expect(merged).toContain('categories:\n  - x\n  - y');
    });
  });

  describe('normalizeTags', () => {
    it('should normalize tag formats', () => {
      const tags = ['CamelCase', 'with spaces', 'with/slash', 'with-dash'];
      const normalized = converter['normalizeTags'](tags);

      expect(normalized).toEqual(['camelcase', 'with-spaces', 'with-slash', 'with-dash']);
    });
  });

  describe('custom field mapping', () => {
    it('should map custom fields based on type', () => {
      mapping.customFields = [
        { obsidianField: 'rating', wikiField: 'score', type: 'number' },
        { obsidianField: 'published', wikiField: 'isPublished', type: 'boolean' },
        { obsidianField: 'date', wikiField: 'publishDate', type: 'date' },
        { obsidianField: 'keywords', wikiField: 'tags', type: 'array' },
      ];
      converter = new MetadataConverter(mapping);

      const obsidianMeta = {
        rating: '4.5',
        published: 'true',
        date: '2024-01-16',
        keywords: 'test, sample',
      };

      const wikiMeta = converter.obsidianToWiki(obsidianMeta);

      expect(wikiMeta.customFields.score).toBe(4.5);
      expect(wikiMeta.customFields.isPublished).toBe(true);
      expect(wikiMeta.customFields.publishDate).toBe('2024-01-16');
      expect(wikiMeta.customFields.tags).toEqual(['test', 'sample']);
    });
  });
});
