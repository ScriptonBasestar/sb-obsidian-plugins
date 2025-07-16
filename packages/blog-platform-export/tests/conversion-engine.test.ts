import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversionEngine } from '../src/conversion-engine';
import { Vault } from 'obsidian';

describe('ConversionEngine', () => {
  let engine: ConversionEngine;
  let mockVault: Vault;

  beforeEach(() => {
    mockVault = {
      read: vi.fn()
    } as any;
    engine = new ConversionEngine(mockVault);
  });

  describe('extractFrontmatter', () => {
    it('should extract YAML frontmatter', () => {
      const content = `---
title: Test Post
tags: [test, sample]
date: 2024-01-16
---

# Content Here

This is the body.`;

      const { frontmatter, body } = engine.extractFrontmatter(content);

      expect(frontmatter.title).toBe('Test Post');
      expect(frontmatter.tags).toEqual(['test', 'sample']);
      expect(frontmatter.date).toBe('2024-01-16');
      expect(body).toBe('# Content Here\n\nThis is the body.');
    });

    it('should handle content without frontmatter', () => {
      const content = '# Just Content\n\nNo frontmatter here.';
      const { frontmatter, body } = engine.extractFrontmatter(content);

      expect(frontmatter).toEqual({});
      expect(body).toBe(content);
    });

    it('should handle malformed YAML gracefully', () => {
      const content = `---
title: Test
invalid: [unclosed
---

Content`;

      const { frontmatter, body } = engine.extractFrontmatter(content);
      expect(frontmatter).toEqual({});
      expect(body).toBe(content);
    });
  });

  describe('extractLinks', () => {
    it('should extract wikilinks', () => {
      const content = 'This links to [[Another Note]] and [[Note|Alias]].';
      const links = engine.extractLinks(content);

      expect(links).toHaveLength(2);
      expect(links[0]).toEqual({
        type: 'wikilink',
        original: '[[Another Note]]',
        target: 'Another Note',
        alias: undefined,
        position: { start: 17, end: 32 }
      });
      expect(links[1]).toEqual({
        type: 'wikilink',
        original: '[[Note|Alias]]',
        target: 'Note',
        alias: 'Alias',
        position: { start: 37, end: 51 }
      });
    });

    it('should extract markdown links', () => {
      const content = 'This is a [markdown link](./page.md) and [external](https://example.com).';
      const links = engine.extractLinks(content);

      expect(links).toHaveLength(2);
      expect(links[0].type).toBe('markdown');
      expect(links[0].target).toBe('./page.md');
      expect(links[1].type).toBe('external');
      expect(links[1].target).toBe('https://example.com');
    });
  });

  describe('extractImages', () => {
    it('should extract embedded images', () => {
      const content = 'Here is an image: ![[image.png]] and another ![[folder/image2.jpg]].';
      const images = engine.extractImages(content);

      expect(images).toHaveLength(2);
      expect(images[0]).toEqual({
        type: 'embedded',
        path: 'image.png',
        position: { start: 18, end: 32 }
      });
      expect(images[1].path).toBe('folder/image2.jpg');
    });

    it('should extract markdown images', () => {
      const content = 'Image: ![Alt text](./image.png "Title") here.';
      const images = engine.extractImages(content);

      expect(images).toHaveLength(1);
      expect(images[0]).toEqual({
        type: 'linked',
        path: './image.png',
        alt: 'Alt text',
        title: 'Title',
        position: { start: 7, end: 39 }
      });
    });
  });

  describe('convertWikiLinksToMarkdown', () => {
    it('should convert wikilinks to markdown links', () => {
      const content = 'Link to [[Page]] and [[Page|Custom Alias]].';
      const result = engine.convertWikiLinksToMarkdown(content);

      expect(result).toBe('Link to [Page](page) and [Custom Alias](page).');
    });

    it('should use provided link mapping', () => {
      const content = 'Link to [[Special Page]].';
      const mapping = new Map([['Special Page', '/docs/special-page']]);
      const result = engine.convertWikiLinksToMarkdown(content, mapping);

      expect(result).toBe('Link to [Special Page](/docs/special-page).');
    });
  });

  describe('convertEmbeddedImages', () => {
    it('should convert embedded images to markdown', () => {
      const content = 'Image: ![[my-image.png]] here.';
      const result = engine.convertEmbeddedImages(content);

      expect(result).toBe('Image: ![my-image](my-image.png) here.');
    });

    it('should use provided path mapping', () => {
      const content = 'Image: ![[assets/image.png]] here.';
      const mapping = new Map([['assets/image.png', '/static/image.png']]);
      const result = engine.convertEmbeddedImages(content, mapping);

      expect(result).toBe('Image: ![image](/static/image.png) here.');
    });
  });

  describe('processCodeBlocks', () => {
    it('should convert math blocks for Hugo', () => {
      const content = 'Equation: $$E = mc^2$$ and inline $x = y$.';
      const result = engine.processCodeBlocks(content, 'hugo');

      expect(result).toContain('{{< math >}}');
      expect(result).toContain('{{< math inline >}}');
    });

    it('should preserve math blocks for Jekyll', () => {
      const content = 'Equation: $$E = mc^2$$ and inline $x = y$.';
      const result = engine.processCodeBlocks(content, 'jekyll');

      expect(result).toContain('$$\nE = mc^2\n$$');
      expect(result).toContain('$x = y$');
    });
  });

  describe('cleanContent', () => {
    it('should remove Obsidian-specific syntax', () => {
      const content = `Some content %%comment%% here.
      
      With a block reference ^abc123
      
      And more content.`;

      const result = engine.cleanContent(content);

      expect(result).not.toContain('%%comment%%');
      expect(result).not.toContain('^abc123');
      expect(result.trim()).toBe('Some content  here.\n      \n      With a block reference \n      \n      And more content.');
    });

    it('should clean up multiple empty lines', () => {
      const content = 'Line 1\n\n\n\n\nLine 2';
      const result = engine.cleanContent(content);

      expect(result).toBe('Line 1\n\nLine 2');
    });
  });

  describe('slugify', () => {
    it('should create valid slugs', () => {
      expect(engine.slugify('My Great Post!')).toBe('my-great-post');
      expect(engine.slugify('Special & Characters')).toBe('special-characters');
      expect(engine.slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(engine.slugify('UPPERCASE')).toBe('uppercase');
    });
  });

  describe('validateContent', () => {
    it('should identify unresolved wikilinks', () => {
      const content = 'This has [[unresolved]] links and [[another|one]].';
      const result = engine.validateContent(content);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Found 2 unresolved wikilinks');
    });

    it('should identify embedded files', () => {
      const content = 'File: ![[document.pdf]] and image ![[image.png]].';
      const result = engine.validateContent(content);

      expect(result.warnings).toContain('Found 2 embedded files that may need path updates');
    });

    it('should identify Obsidian-specific syntax', () => {
      const content = 'Comment %%hidden%% and reference ^abc123.';
      const result = engine.validateContent(content);

      expect(result.warnings).toContain('Found Obsidian comments that will be removed');
      expect(result.warnings).toContain('Found block references that will be removed');
    });
  });

  describe('extractHeadings', () => {
    it('should extract headings with levels and anchors', () => {
      const content = `# Main Title
      
## Section One

### Subsection

## Another Section`;

      const headings = engine.extractHeadings(content);

      expect(headings).toHaveLength(4);
      expect(headings[0]).toEqual({
        level: 1,
        text: 'Main Title',
        anchor: 'main-title'
      });
      expect(headings[1]).toEqual({
        level: 2,
        text: 'Section One',
        anchor: 'section-one'
      });
    });
  });
});