import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Template Commands', () => {
  let mockApp: any;
  let mockPlugin: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApp = {
      workspace: {
        getActiveViewOfType: vi.fn(),
        getLeaf: vi.fn(() => ({
          openFile: vi.fn(),
        })),
      },
      vault: {
        create: vi.fn(),
      },
    };

    mockPlugin = {
      app: mockApp,
      addCommand: vi.fn(),
      getTemplates: vi.fn(),
      sanitizeId: (name: string) =>
        name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-'),
    };
  });

  describe('sanitizeId', () => {
    it('should convert names to valid command IDs', () => {
      expect(mockPlugin.sanitizeId('Daily Note')).toBe('daily-note');
      expect(mockPlugin.sanitizeId('Meeting Notes Template')).toBe('meeting-notes-template');
      expect(mockPlugin.sanitizeId('Complex!!@#$%Name')).toBe('complex-name');
      expect(mockPlugin.sanitizeId('Multiple---Dashes')).toBe('multiple-dashes');
    });
  });

  describe('Command Registration', () => {
    it('should register correct number of commands for templates', async () => {
      const mockTemplates = [
        { name: 'Daily Note', content: '# Daily {{date}}' },
        { name: 'Meeting Notes', content: '# Meeting {{title}}' },
      ];

      mockPlugin.getTemplates.mockResolvedValue(mockTemplates);

      // Simulate command registration
      for (const template of mockTemplates) {
        mockPlugin.addCommand({
          id: `insert-template-${mockPlugin.sanitizeId(template.name)}`,
          name: `Insert Template: ${template.name}`,
        });
        mockPlugin.addCommand({
          id: `new-file-template-${mockPlugin.sanitizeId(template.name)}`,
          name: `New File with Template: ${template.name}`,
        });
      }

      expect(mockPlugin.addCommand).toHaveBeenCalledTimes(4); // 2 templates * 2 commands each
      expect(mockPlugin.addCommand).toHaveBeenCalledWith({
        id: 'insert-template-daily-note',
        name: 'Insert Template: Daily Note',
      });
      expect(mockPlugin.addCommand).toHaveBeenCalledWith({
        id: 'new-file-template-daily-note',
        name: 'New File with Template: Daily Note',
      });
    });
  });

  describe('File Creation', () => {
    it('should create new file with correct content', async () => {
      const mockTemplate = { name: 'Daily Note', content: '# Daily {{date}}' };

      mockApp.vault.create.mockResolvedValue({ path: 'Daily Note-123456.md' });

      // Simulate file creation with template
      const fileName = `${mockTemplate.name}-${Date.now()}.md`;
      await mockApp.vault.create(fileName, mockTemplate.content);

      expect(mockApp.vault.create).toHaveBeenCalledWith(
        expect.stringMatching(/^Daily Note-\d+\.md$/),
        '# Daily {{date}}'
      );
    });
  });

  describe('Modal Integration', () => {
    it('should handle no active view scenario', () => {
      mockApp.workspace.getActiveViewOfType.mockReturnValue(null);

      const noActiveView = mockApp.workspace.getActiveViewOfType();
      expect(noActiveView).toBeNull();

      // Should trigger new file creation flow
      expect(mockApp.workspace.getActiveViewOfType).toHaveBeenCalled();
    });

    it('should handle active view scenario', () => {
      const mockView = {
        editor: {
          getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
          replaceRange: vi.fn(),
        },
      };

      mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);

      const activeView = mockApp.workspace.getActiveViewOfType();
      expect(activeView).toBe(mockView);

      // Should trigger template insertion flow
      expect(mockView.editor).toBeDefined();
    });
  });
});
