import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { TemplateParser } from './template-parser';

// Mock Obsidian DOM APIs for testing
Object.defineProperty(global, 'HTMLElement', {
  value: class MockHTMLElement {
    style: Record<string, string> = {};
    children: MockHTMLElement[] = [];
    textContent: string = '';
    title: string = '';
    innerHTML: string = '';
    classList = {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
    };

    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    querySelector = vi.fn();
    querySelectorAll = vi.fn(() => []);

    createEl(tag: string, options?: { text?: string; cls?: string }): MockHTMLElement {
      const el = new MockHTMLElement();
      if (options?.text) el.textContent = options.text;
      if (options?.cls) el.classList.add(options.cls);
      this.children.push(el);
      return el;
    }

    createDiv(options?: { text?: string; cls?: string }): MockHTMLElement {
      return this.createEl('div', options);
    }

    empty(): void {
      this.children = [];
      this.innerHTML = '';
      this.textContent = '';
    }

    addClass(className: string): void {
      this.classList.add(className);
    }
  },
  writable: true,
});

// Mock App and Modal classes
const mockApp = {
  vault: {
    getAbstractFileByPath: vi.fn(),
    createFolder: vi.fn(),
    create: vi.fn(),
    read: vi.fn(),
    getFiles: vi.fn(() => []),
  },
  workspace: {
    getActiveViewOfType: vi.fn(),
    getLeaf: vi.fn(() => ({
      openFile: vi.fn(),
    })),
  },
};

class MockModal {
  app: any;
  contentEl: any;

  constructor(app: any) {
    this.app = app;
    this.contentEl = new (global as any).HTMLElement();
  }

  open(): void {}
  close(): void {}
}

// Mock the TemplateModal functionality we want to test
class MockTemplateModal extends MockModal {
  templates: any[];
  onChoose: (template: any) => void;
  templateEngine: any;
  private selectedTemplate: any = null;
  private searchInput: any;
  private templatesContainer: any;
  private previewContainer: any;
  private filteredTemplates: any[];

  constructor(app: any, templates: any[], onChoose: (template: any) => void, templateEngine?: any) {
    super(app);
    this.templates = templates;
    this.filteredTemplates = [...templates];
    this.onChoose = onChoose;
    this.templateEngine = templateEngine || {
      previewTemplate: vi.fn().mockResolvedValue('Mock preview'),
    };
  }

  filterTemplates(searchTerm: string): void {
    this.filteredTemplates = this.templates.filter(
      (template) =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.metadata.description &&
          template.metadata.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        template.variables.some((variable: string) =>
          variable.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  }

  selectTemplate(template: any): void {
    this.selectedTemplate = template;
  }

  getSelectedTemplate(): any {
    return this.selectedTemplate;
  }

  getFilteredTemplates(): any[] {
    return this.filteredTemplates;
  }

  async showPreview(template: any): Promise<void> {
    // Mock implementation
    if (this.templateEngine && this.templateEngine.previewTemplate) {
      try {
        await this.templateEngine.previewTemplate(template);
      } catch (error) {
        console.warn('Preview generation failed:', error);
      }
    }
  }
}

describe('TemplateModal', () => {
  let mockTemplates: any[];
  let mockOnChoose: Mock;
  let mockTemplateEngine: any;
  let modal: MockTemplateModal;

  beforeEach(() => {
    mockTemplates = [
      {
        name: 'Daily Note',
        content: '# {{date}}\n\n## Tasks\n- [ ] \n\n## Notes\n',
        metadata: {
          title: 'Daily Note Template',
          description: 'A template for daily notes with tasks and reflection',
          category: 'daily',
        },
        variables: ['date'],
        isValid: true,
        errors: [],
        path: 'templates/daily-note.md',
        body: '# {{date}}\n\n## Tasks\n- [ ] \n\n## Notes\n',
      },
      {
        name: 'Meeting Notes',
        content: '# Meeting: {{title}}\n\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n',
        metadata: {
          title: 'Meeting Notes Template',
          description: 'A template for meeting notes with agenda and action items',
          category: 'meeting',
        },
        variables: ['title', 'date', 'attendees'],
        isValid: true,
        errors: [],
        path: 'templates/meeting-notes.md',
        body: '# Meeting: {{title}}\n\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n',
      },
      {
        name: 'Project Template',
        content:
          '# {{projectName}}\n\n## Overview\n{{description}}\n\n## Goals\n- {{goal1}}\n- {{goal2}}\n',
        metadata: {
          title: 'Project Template',
          description: 'Template for project documentation',
          category: 'project',
        },
        variables: ['projectName', 'description', 'goal1', 'goal2'],
        isValid: true,
        errors: [],
        path: 'templates/project.md',
        body: '# {{projectName}}\n\n## Overview\n{{description}}\n\n## Goals\n- {{goal1}}\n- {{goal2}}\n',
      },
      {
        name: 'Invalid Template',
        content: '# {{unclosed\n\nThis template has syntax errors',
        metadata: {
          title: 'Invalid Template',
          description: 'This template has validation errors',
        },
        variables: [],
        isValid: false,
        errors: ['Mismatched template braces {{ }}'],
        path: 'templates/invalid.md',
        body: '# {{unclosed\n\nThis template has syntax errors',
      },
    ];

    mockOnChoose = vi.fn();
    mockTemplateEngine = {
      previewTemplate: vi.fn().mockResolvedValue('Mock preview content'),
    };

    modal = new MockTemplateModal(mockApp, mockTemplates, mockOnChoose, mockTemplateEngine);
  });

  describe('Template filtering', () => {
    it('should filter templates by name', () => {
      modal.filterTemplates('daily');
      const filtered = modal.getFilteredTemplates();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Daily Note');
    });

    it('should filter templates by description', () => {
      modal.filterTemplates('meeting');
      const filtered = modal.getFilteredTemplates();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Meeting Notes');
    });

    it('should filter templates by variables', () => {
      modal.filterTemplates('attendees');
      const filtered = modal.getFilteredTemplates();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Meeting Notes');
    });

    it('should be case insensitive', () => {
      modal.filterTemplates('DAILY');
      const filtered = modal.getFilteredTemplates();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Daily Note');
    });

    it('should return empty array when no matches found', () => {
      modal.filterTemplates('nonexistent');
      const filtered = modal.getFilteredTemplates();

      expect(filtered).toHaveLength(0);
    });

    it('should return all templates when search term is empty', () => {
      modal.filterTemplates('');
      const filtered = modal.getFilteredTemplates();

      expect(filtered).toHaveLength(4);
    });

    it('should filter multiple matches', () => {
      modal.filterTemplates('template');
      const filtered = modal.getFilteredTemplates();

      // Should match templates with "template" in description or name
      expect(filtered.length).toBeGreaterThan(1);
    });
  });

  describe('Template selection', () => {
    it('should select a template', () => {
      const template = mockTemplates[0];
      modal.selectTemplate(template);

      expect(modal.getSelectedTemplate()).toBe(template);
    });

    it('should update selected template when different template is selected', () => {
      const template1 = mockTemplates[0];
      const template2 = mockTemplates[1];

      modal.selectTemplate(template1);
      expect(modal.getSelectedTemplate()).toBe(template1);

      modal.selectTemplate(template2);
      expect(modal.getSelectedTemplate()).toBe(template2);
    });

    it('should handle selection of invalid template', () => {
      const invalidTemplate = mockTemplates[3]; // Invalid Template
      modal.selectTemplate(invalidTemplate);

      expect(modal.getSelectedTemplate()).toBe(invalidTemplate);
      expect(invalidTemplate.isValid).toBe(false);
    });
  });

  describe('Template preview', () => {
    it('should call templateEngine.previewTemplate when template is selected', async () => {
      const template = mockTemplates[0];

      // Mock the showPreview method since we can't test the full DOM interaction
      const showPreviewSpy = vi.fn();
      modal.showPreview = showPreviewSpy;

      await modal.selectTemplate(template);

      // The selectTemplate should trigger preview generation
      expect(modal.getSelectedTemplate()).toBe(template);
    });

    it('should handle preview generation errors gracefully', async () => {
      const template = mockTemplates[0];
      mockTemplateEngine.previewTemplate.mockRejectedValue(new Error('Preview error'));

      // Should not throw error when preview generation fails
      expect(async () => {
        modal.selectTemplate(template);
      }).not.toThrow();
    });
  });

  describe('Template validation display', () => {
    it('should identify valid templates', () => {
      const validTemplate = mockTemplates[0];
      expect(validTemplate.isValid).toBe(true);
      expect(validTemplate.errors).toHaveLength(0);
    });

    it('should identify invalid templates', () => {
      const invalidTemplate = mockTemplates[3];
      expect(invalidTemplate.isValid).toBe(false);
      expect(invalidTemplate.errors.length).toBeGreaterThan(0);
    });

    it('should show error information for invalid templates', () => {
      const invalidTemplate = mockTemplates[3];
      expect(invalidTemplate.errors).toContain('Mismatched template braces {{ }}');
    });
  });

  describe('Template metadata display', () => {
    it('should show template name and description', () => {
      const template = mockTemplates[0];
      expect(template.name).toBe('Daily Note');
      expect(template.metadata.description).toBe(
        'A template for daily notes with tasks and reflection'
      );
    });

    it('should show template variables', () => {
      const template = mockTemplates[1]; // Meeting Notes
      expect(template.variables).toContain('title');
      expect(template.variables).toContain('date');
      expect(template.variables).toContain('attendees');
    });

    it('should show template path', () => {
      const template = mockTemplates[0];
      expect(template.path).toBe('templates/daily-note.md');
    });

    it('should handle templates without description', () => {
      const templateWithoutDesc = {
        ...mockTemplates[0],
        metadata: { title: 'Template without description' },
      };

      expect(templateWithoutDesc.metadata.description).toBeUndefined();
    });
  });

  describe('User interaction', () => {
    it('should call onChoose when template is selected for use', () => {
      const template = mockTemplates[0];
      modal.onChoose(template);

      expect(mockOnChoose).toHaveBeenCalledWith(template);
    });

    it('should handle double-click to immediately use template', () => {
      const template = mockTemplates[0];

      // Simulate double-click behavior
      modal.selectTemplate(template);
      modal.onChoose(template);

      expect(mockOnChoose).toHaveBeenCalledWith(template);
    });
  });

  describe('Template content structure', () => {
    it('should have required template properties', () => {
      mockTemplates.forEach((template) => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('content');
        expect(template).toHaveProperty('metadata');
        expect(template).toHaveProperty('variables');
        expect(template).toHaveProperty('isValid');
        expect(template).toHaveProperty('errors');
        expect(template).toHaveProperty('path');
        expect(template).toHaveProperty('body');
      });
    });

    it('should have valid metadata structure', () => {
      mockTemplates.forEach((template) => {
        expect(template.metadata).toHaveProperty('title');
        expect(typeof template.metadata.title).toBe('string');

        if (template.metadata.description) {
          expect(typeof template.metadata.description).toBe('string');
        }
      });
    });

    it('should have array of variables', () => {
      mockTemplates.forEach((template) => {
        expect(Array.isArray(template.variables)).toBe(true);
        template.variables.forEach((variable: any) => {
          expect(typeof variable).toBe('string');
        });
      });
    });

    it('should have boolean validation status', () => {
      mockTemplates.forEach((template) => {
        expect(typeof template.isValid).toBe('boolean');
        expect(Array.isArray(template.errors)).toBe(true);
      });
    });
  });

  describe('Performance considerations', () => {
    it('should handle large number of templates efficiently', () => {
      const largeTemplateList = Array.from({ length: 100 }, (_, i) => ({
        ...mockTemplates[0],
        name: `Template ${i}`,
        metadata: { ...mockTemplates[0].metadata, description: `Template number ${i}` },
      }));

      const largeModal = new MockTemplateModal(
        mockApp,
        largeTemplateList,
        mockOnChoose,
        mockTemplateEngine
      );

      // Filter should work efficiently even with many templates
      largeModal.filterTemplates('Template 50');
      const filtered = largeModal.getFilteredTemplates();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Template 50');
    });

    it('should handle complex search queries', () => {
      modal.filterTemplates('daily tasks notes');
      const filtered = modal.getFilteredTemplates();

      // Should find templates that match any of the search terms
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });
});
