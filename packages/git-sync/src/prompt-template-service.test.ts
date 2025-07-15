import { describe, it, expect } from 'vitest';
import { PromptTemplateService, PromptVariables } from './prompt-template-service';

describe('PromptTemplateService', () => {
  const mockVariables: PromptVariables = {
    files: {
      staged: ['file1.ts', 'file2.js'],
      unstaged: ['file3.md'],
      untracked: ['file4.json'],
      total: 4
    },
    branch: 'feature/test',
    diff: 'some diff content',
    recentCommits: ['abc123: previous commit', 'def456: another commit'],
    timestamp: '2025-07-15 13:30:00',
    author: 'Test User'
  };

  describe('getDefaultTemplates', () => {
    it('should return default templates', () => {
      const templates = PromptTemplateService.getDefaultTemplates();
      
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('description');
      expect(templates[0]).toHaveProperty('template');
    });

    it('should include conventional commits template', () => {
      const templates = PromptTemplateService.getDefaultTemplates();
      const conventional = templates.find(t => t.id === 'conventional');
      
      expect(conventional).toBeDefined();
      expect(conventional?.name).toContain('Conventional');
      expect(conventional?.template).toContain('conventional commit');
    });

    it('should include korean template', () => {
      const templates = PromptTemplateService.getDefaultTemplates();
      const korean = templates.find(t => t.id === 'korean');
      
      expect(korean).toBeDefined();
      expect(korean?.name).toContain('한국어');
      expect(korean?.template).toContain('한국어로');
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', () => {
      const template = PromptTemplateService.getTemplate('conventional');
      
      expect(template).toBeDefined();
      expect(template?.id).toBe('conventional');
    });

    it('should return undefined for non-existent template', () => {
      const template = PromptTemplateService.getTemplate('non-existent');
      
      expect(template).toBeUndefined();
    });
  });

  describe('processTemplate', () => {
    it('should replace simple variables', () => {
      const template = 'Files: {{files.total}}, Branch: {{branch}}, Time: {{timestamp}}';
      
      const result = PromptTemplateService.processTemplate(template, mockVariables);
      
      expect(result).toContain('Files: 4');
      expect(result).toContain('Branch: feature/test');
      expect(result).toContain('Time: 2025-07-15 13:30:00');
    });

    it('should replace array variables', () => {
      const template = 'Staged: {{files.staged}}, Unstaged: {{files.unstaged}}, New: {{files.untracked}}';
      
      const result = PromptTemplateService.processTemplate(template, mockVariables);
      
      expect(result).toContain('Staged: file1.ts, file2.js');
      expect(result).toContain('Unstaged: file3.md');
      expect(result).toContain('New: file4.json');
    });

    it('should handle long file lists with truncation', () => {
      const longVariables: PromptVariables = {
        ...mockVariables,
        files: {
          ...mockVariables.files,
          staged: ['file1.ts', 'file2.js', 'file3.md', 'file4.json', 'file5.py', 'file6.go', 'file7.rb']
        }
      };
      
      const template = 'Staged: {{files.staged}}';
      const result = PromptTemplateService.processTemplate(template, longVariables);
      
      expect(result).toContain('and 2 more');
    });

    it('should process conditional blocks - with files', () => {
      const template = '{{#if files.staged}}Has staged files: {{files.staged}}{{/if}}';
      
      const result = PromptTemplateService.processTemplate(template, mockVariables);
      
      expect(result).toContain('Has staged files: file1.ts, file2.js');
    });

    it('should process conditional blocks - without files', () => {
      const template = '{{#if files.staged}}Has staged files{{/if}}';
      const emptyVariables: PromptVariables = {
        ...mockVariables,
        files: { staged: [], unstaged: [], untracked: [], total: 0 }
      };
      
      const result = PromptTemplateService.processTemplate(template, emptyVariables);
      
      expect(result).not.toContain('Has staged files');
    });

    it('should handle diff replacement', () => {
      const template = 'Changes: {{diff}}';
      
      const result = PromptTemplateService.processTemplate(template, mockVariables);
      
      expect(result).toContain('Changes: some diff content');
    });

    it('should truncate long diff', () => {
      const longDiff = 'a'.repeat(1000);
      const longVariables: PromptVariables = {
        ...mockVariables,
        diff: longDiff
      };
      
      const template = 'Changes: {{diff}}';
      const result = PromptTemplateService.processTemplate(template, longVariables);
      
      expect(result).toContain('...');
    });

    it('should handle missing optional variables', () => {
      const template = 'Diff: {{diff}}, Author: {{author}}';
      const minimalVariables: PromptVariables = {
        files: { staged: [], unstaged: [], untracked: [], total: 0 },
        branch: 'main',
        timestamp: '2025-07-15 13:30:00'
      };
      
      const result = PromptTemplateService.processTemplate(template, minimalVariables);
      
      expect(result).toContain('Diff: (no diff available)');
      expect(result).not.toContain('{{author}}'); // Should be removed
    });

    it('should handle nested conditional blocks', () => {
      const template = `{{#if files.total}}
Total files: {{files.total}}
{{#if files.staged}}
Staged: {{files.staged}}
{{/if}}
{{#if files.unstaged}}
Modified: {{files.unstaged}}
{{/if}}
{{/if}}`;
      
      const result = PromptTemplateService.processTemplate(template, mockVariables);
      
      expect(result).toContain('Total files: 4');
      expect(result).toContain('Staged: file1.ts, file2.js');
      expect(result).toContain('Modified: file3.md');
    });
  });

  describe('processConditionalBlocks', () => {
    it('should handle multiple conditional types', () => {
      const template = `{{#if files.staged}}Staged files exist{{/if}}
{{#if files.unstaged}}Modified files exist{{/if}}
{{#if files.untracked}}New files exist{{/if}}
{{#if recentCommits}}Recent commits exist{{/if}}
{{#if diff}}Diff exists{{/if}}`;
      
      const result = PromptTemplateService.processTemplate(template, mockVariables);
      
      expect(result).toContain('Staged files exist');
      expect(result).toContain('Modified files exist');
      expect(result).toContain('New files exist');
      expect(result).toContain('Recent commits exist');
      expect(result).toContain('Diff exists');
    });
  });

  describe('createVariables', () => {
    it('should create variables from commit context', () => {
      const context = {
        files: {
          staged: ['file1.ts'],
          unstaged: ['file2.js'],
          untracked: ['file3.md']
        },
        branch: 'main',
        diff: 'some diff',
        recentCommits: ['commit1'],
        author: 'Test User'
      };
      
      const variables = PromptTemplateService.createVariables(context);
      
      expect(variables.files.total).toBe(3);
      expect(variables.branch).toBe('main');
      expect(variables.diff).toBe('some diff');
      expect(variables.recentCommits).toEqual(['commit1']);
      expect(variables.author).toBe('Test User');
      expect(variables.timestamp).toBeDefined();
    });

    it('should handle missing context properties', () => {
      const context = {
        files: { staged: ['file1.ts'] }
      };
      
      const variables = PromptTemplateService.createVariables(context);
      
      expect(variables.files.staged).toEqual(['file1.ts']);
      expect(variables.files.unstaged).toEqual([]);
      expect(variables.files.untracked).toEqual([]);
      expect(variables.files.total).toBe(1);
      expect(variables.branch).toBe('unknown');
    });

    it('should calculate total files correctly', () => {
      const context = {
        files: {
          staged: ['a', 'b'],
          unstaged: ['c'],
          untracked: ['d', 'e', 'f']
        }
      };
      
      const variables = PromptTemplateService.createVariables(context);
      
      expect(variables.files.total).toBe(6);
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const template = '{{files.total}} files on {{branch}}';
      
      const result = PromptTemplateService.validateTemplate(template);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate template with conditional blocks', () => {
      const template = '{{#if files.staged}}Staged: {{files.staged}}{{/if}}';
      
      const result = PromptTemplateService.validateTemplate(template);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unmatched conditional blocks', () => {
      const template = '{{#if files.staged}}Missing end tag';
      
      const result = PromptTemplateService.validateTemplate(template);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unmatched conditional blocks: {{#if}} and {{/if}} count mismatch');
    });

    it('should detect unknown variables', () => {
      const template = '{{unknown.variable}} is not valid';
      
      const result = PromptTemplateService.validateTemplate(template);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unknown variable'))).toBe(true);
    });

    it('should allow all valid variables', () => {
      const template = `
        {{files.staged}} {{files.unstaged}} {{files.untracked}} {{files.total}}
        {{branch}} {{diff}} {{recentCommits}} {{timestamp}} {{author}}
      `;
      
      const result = PromptTemplateService.validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });

    it('should ignore conditional prefixes in validation', () => {
      const template = '{{#if files.staged}}{{/if}}';
      
      const result = PromptTemplateService.validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('getTemplateHelp', () => {
    it('should return help documentation', () => {
      const help = PromptTemplateService.getTemplateHelp();
      
      expect(help).toContain('Available template variables');
      expect(help).toContain('{{files.staged}}');
      expect(help).toContain('{{branch}}');
      expect(help).toContain('Conditional blocks');
      expect(help).toContain('{{#if files.staged}}');
      expect(help).toContain('Example:');
    });

    it('should include all variable types in help', () => {
      const help = PromptTemplateService.getTemplateHelp();
      
      expect(help).toContain('{{files.total}}');
      expect(help).toContain('{{diff}}');
      expect(help).toContain('{{recentCommits}}');
      expect(help).toContain('{{timestamp}}');
      expect(help).toContain('{{author}}');
    });
  });

  describe('template integration with real examples', () => {
    it('should process conventional commits template', () => {
      const template = PromptTemplateService.getTemplate('conventional');
      expect(template).toBeDefined();
      
      if (template) {
        const result = PromptTemplateService.processTemplate(template.template, mockVariables);
        
        expect(result).toContain('conventional commit');
        expect(result).toContain('feature/test');
        expect(result).toContain('file1.ts, file2.js');
      }
    });

    it('should process korean template', () => {
      const template = PromptTemplateService.getTemplate('korean');
      expect(template).toBeDefined();
      
      if (template) {
        const result = PromptTemplateService.processTemplate(template.template, mockVariables);
        
        expect(result).toContain('한국어로');
        expect(result).toContain('feature/test');
        expect(result).toContain('2025-07-15 13:30:00');
      }
    });

    it('should process simple template', () => {
      const template = PromptTemplateService.getTemplate('simple');
      expect(template).toBeDefined();
      
      if (template) {
        const result = PromptTemplateService.processTemplate(template.template, mockVariables);
        
        expect(result).toContain('4 files changed');
        expect(result).toContain('feature/test');
      }
    });
  });
});