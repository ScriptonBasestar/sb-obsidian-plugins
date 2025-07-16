import { describe, it, expect } from 'vitest';
import { TemplateParser } from './template-parser';

describe('TemplateParser', () => {
  describe('parseTemplate', () => {
    it('should parse template with frontmatter correctly', () => {
      const content = `---
title: Test Template
description: A test template
category: test
tags: [test, sample]
variables: [name, date]
author: Test Author
version: 1.0.0
---

# Hello {{name}}

Today is {{date}}.

## Tasks
- [ ] Complete {{name}} task
`;

      const result = TemplateParser.parseTemplate('test-template', content, 'test.md');

      expect(result.name).toBe('test-template');
      expect(result.path).toBe('test.md');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Check metadata parsing
      expect(result.metadata.title).toBe('Test Template');
      expect(result.metadata.description).toBe('A test template');
      expect(result.metadata.category).toBe('test');
      expect(result.metadata.tags).toEqual(['test', 'sample']);
      expect(result.metadata.variables).toEqual(['name', 'date']);
      expect(result.metadata.author).toBe('Test Author');
      expect(result.metadata.version).toBe('1.0.0');

      // Check variable extraction
      expect(result.variables).toEqual(['date', 'name']); // sorted alphabetically

      // Check body content (without frontmatter)
      expect(result.body).toContain('# Hello {{name}}');
      expect(result.body).not.toContain('---');
    });

    it('should parse template without frontmatter', () => {
      const content = `# Simple Template

Hello {{user}}!

Today's tasks:
- [ ] Review {{document}}
`;

      const result = TemplateParser.parseTemplate('simple', content, 'simple.md');

      expect(result.isValid).toBe(true);
      expect(result.body).toBe(content);
      expect(result.variables).toEqual(['document', 'user']);
      expect(result.metadata).toEqual({});
    });

    it('should detect malformed variables', () => {
      const content = `# Template with errors

{{unclosed variable
{{}} empty variable
Closed}} without opening
`;

      const result = TemplateParser.parseTemplate('invalid', content, 'invalid.md');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((error) => error.includes('Malformed variables'))).toBe(true);
    });

    it('should detect empty template body', () => {
      const content = `---
title: Empty Template
---


`;

      const result = TemplateParser.parseTemplate('empty', content, 'empty.md');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template body is empty');
    });

    it('should parse array values in frontmatter correctly', () => {
      const content1 = `---
tags: [one, two, three]
---
Content here`;

      const content2 = `---
tags: ["one", "two", "three"]
---
Content here`;

      const content3 = `---
tags: one, two, three
---
Content here`;

      const result1 = TemplateParser.parseTemplate('test1', content1, 'test1.md');
      const result2 = TemplateParser.parseTemplate('test2', content2, 'test2.md');
      const result3 = TemplateParser.parseTemplate('test3', content3, 'test3.md');

      expect(result1.metadata.tags).toEqual(['one', 'two', 'three']);
      expect(result2.metadata.tags).toEqual(['one', 'two', 'three']);
      expect(result3.metadata.tags).toEqual(['one', 'two', 'three']);
    });

    it('should extract all types of variables', () => {
      const content = `# Template

Date: {{date}}
Time: {{time}}
User: {{user.name}}
Count: {{item-count}}
Special: {{special_var}}
`;

      const result = TemplateParser.parseTemplate('vars', content, 'vars.md');

      expect(result.variables).toEqual(['date', 'item-count', 'special_var', 'time', 'user.name']);
    });

    it('should validate declared vs used variables', () => {
      const content = `---
variables: [name, date, unused]
---

Hello {{name}}!
Today is {{date}}.
`;

      const result = TemplateParser.parseTemplate('test', content, 'test.md');

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('Variables declared in frontmatter but not used: unused')
        )
      ).toBe(true);
    });
  });

  describe('getTemplatePreview', () => {
    it('should generate preview with variable substitution', () => {
      const template = TemplateParser.parseTemplate(
        'preview-test',
        '# Daily Note for {{date}}\n\n## Weather: {{weather}}\n\nHello {{name}}!',
        'test.md'
      );

      const preview = TemplateParser.getTemplatePreview(template);

      expect(preview).toContain('Daily Note for');
      expect(preview).toContain('[weather]');
      expect(preview).toContain('[name]');
      // Should substitute {{date}} with actual date
      expect(preview).not.toContain('{{date}}');
    });

    it('should truncate long previews', () => {
      const longContent = 'a'.repeat(200);
      const template = TemplateParser.parseTemplate('long-test', longContent, 'test.md');

      const preview = TemplateParser.getTemplatePreview(template);

      expect(preview.length).toBeLessThanOrEqual(153); // 150 + '...'
      expect(preview).toMatch(/\.\.\.$/); // Should end with '...'
    });

    it('should handle templates with frontmatter in preview', () => {
      const content = `---
title: Test
---

# Preview Content

This should appear in preview.`;

      const template = TemplateParser.parseTemplate('preview', content, 'test.md');
      const preview = TemplateParser.getTemplatePreview(template);

      expect(preview).toContain('Preview Content');
      expect(preview).not.toContain('title: Test');
      expect(preview).not.toContain('---');
    });
  });
});
