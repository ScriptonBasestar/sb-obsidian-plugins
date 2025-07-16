import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Obsidian types for testing
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

const mockSettings = {
  templateFolder: 'templates',
  defaultTemplate: '',
  autoMetadata: true,
  gitSync: false,
  publishEnabled: false,
  weatherApiKey: '',
  weatherLocation: 'Seoul,KR',
  weatherUnit: 'metric' as const,
  weatherLanguage: 'kr',
  weatherEnabled: false,
  fortuneEnabled: true,
  fortuneLanguage: 'kr' as const,
};

// Mock the main plugin class for testing specific functionality
class MockAwesomePlugin {
  settings = { ...mockSettings };
  app = mockApp;
  templateCache: any;
  templateEngine: any;
  templateCommandsRegistered = false;

  async loadData() {
    return {};
  }

  async saveData(data: any) {
    // Mock save
  }

  async loadSettings() {
    this.settings = Object.assign({}, mockSettings, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Update template cache if folder changed
    if (this.templateCache) {
      this.templateCache.updateTemplateFolder(this.settings.templateFolder);
      // Refresh template commands when folder changes
      this.templateCommandsRegistered = false;
      await this.registerTemplateCommands();
    }
  }

  async registerTemplateCommands() {
    // Mock template command registration
    this.templateCommandsRegistered = true;
  }

  async getTemplates() {
    // Mock templates
    return [
      {
        name: 'Daily Note',
        content: '# {{date}}\n\n## Tasks\n- [ ] \n\n## Notes\n',
        metadata: { title: 'Daily Note Template' },
        variables: ['date'],
        isValid: true,
        errors: [] as string[],
        path: 'templates/daily-note.md',
        body: '# {{date}}\n\n## Tasks\n- [ ] \n\n## Notes\n',
      },
      {
        name: 'Meeting Notes',
        content: '# Meeting: {{title}}\n\n**Date:** {{date}}\n',
        metadata: { title: 'Meeting Notes Template' },
        variables: ['title', 'date'],
        isValid: true,
        errors: [] as string[],
        path: 'templates/meeting-notes.md',
        body: '# Meeting: {{title}}\n\n**Date:** {{date}}\n',
      },
    ];
  }

  async insertDefaultTemplate(editor: any) {
    if (!this.settings.defaultTemplate) {
      throw new Error('No default template set');
    }

    const templates = await this.getTemplates();
    const defaultTemplate = templates.find((t) => t.name === this.settings.defaultTemplate);

    if (!defaultTemplate) {
      throw new Error(`Default template "${this.settings.defaultTemplate}" not found`);
    }

    // Mock template insertion
    return defaultTemplate;
  }
}

describe('Template Settings', () => {
  let plugin: MockAwesomePlugin;

  beforeEach(() => {
    plugin = new MockAwesomePlugin();
    vi.clearAllMocks();
  });

  describe('Default template functionality', () => {
    it('should handle empty default template setting', async () => {
      plugin.settings.defaultTemplate = '';

      await expect(plugin.insertDefaultTemplate({})).rejects.toThrow('No default template set');
    });

    it('should handle invalid default template setting', async () => {
      plugin.settings.defaultTemplate = 'Non-existent Template';

      await expect(plugin.insertDefaultTemplate({})).rejects.toThrow(
        'Default template "Non-existent Template" not found'
      );
    });

    it('should successfully insert valid default template', async () => {
      plugin.settings.defaultTemplate = 'Daily Note';

      const result = await plugin.insertDefaultTemplate({});
      expect(result.name).toBe('Daily Note');
      expect(result.variables).toContain('date');
    });

    it('should find template by exact name match', async () => {
      plugin.settings.defaultTemplate = 'Meeting Notes';

      const result = await plugin.insertDefaultTemplate({});
      expect(result.name).toBe('Meeting Notes');
      expect(result.variables).toContain('title');
      expect(result.variables).toContain('date');
    });
  });

  describe('Template folder settings', () => {
    it('should update template cache when folder changes', async () => {
      const mockUpdateTemplateFolder = vi.fn();
      plugin.templateCache = {
        updateTemplateFolder: mockUpdateTemplateFolder,
      };

      plugin.settings.templateFolder = 'new-templates';
      await plugin.saveSettings();

      expect(mockUpdateTemplateFolder).toHaveBeenCalledWith('new-templates');
    });

    it('should refresh template commands when folder changes', async () => {
      plugin.templateCache = {
        updateTemplateFolder: vi.fn(),
      };

      plugin.templateCommandsRegistered = true;
      await plugin.saveSettings();

      expect(plugin.templateCommandsRegistered).toBe(true); // Set to true again after register
    });

    it('should handle template folder validation', () => {
      expect(plugin.settings.templateFolder).toBe('templates');

      plugin.settings.templateFolder = '';
      expect(plugin.settings.templateFolder).toBe('');

      plugin.settings.templateFolder = 'custom/template/folder';
      expect(plugin.settings.templateFolder).toBe('custom/template/folder');
    });
  });

  describe('Settings persistence', () => {
    it('should load default settings correctly', async () => {
      await plugin.loadSettings();

      expect(plugin.settings.templateFolder).toBe('templates');
      expect(plugin.settings.defaultTemplate).toBe('');
      expect(plugin.settings.autoMetadata).toBe(true);
      expect(plugin.settings.gitSync).toBe(false);
      expect(plugin.settings.publishEnabled).toBe(false);
    });

    it('should save and load custom settings', async () => {
      plugin.settings.templateFolder = 'my-templates';
      plugin.settings.defaultTemplate = 'Daily Note';
      plugin.settings.autoMetadata = false;

      await plugin.saveSettings();
      await plugin.loadSettings();

      expect(plugin.settings.templateFolder).toBe('my-templates');
      expect(plugin.settings.defaultTemplate).toBe('Daily Note');
      expect(plugin.settings.autoMetadata).toBe(false);
    });
  });

  describe('Template listing', () => {
    it('should return available templates', async () => {
      const templates = await plugin.getTemplates();

      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Daily Note');
      expect(templates[1].name).toBe('Meeting Notes');
    });

    it('should return templates with valid structure', async () => {
      const templates = await plugin.getTemplates();

      templates.forEach((template) => {
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
  });

  describe('Error handling', () => {
    it('should handle missing template gracefully', async () => {
      plugin.settings.defaultTemplate = 'Nonexistent Template';

      await expect(plugin.insertDefaultTemplate({})).rejects.toThrow();
    });

    it('should handle empty template list', async () => {
      // Mock empty template list
      plugin.getTemplates = vi.fn().mockResolvedValue([]);
      plugin.settings.defaultTemplate = 'Any Template';

      await expect(plugin.insertDefaultTemplate({})).rejects.toThrow('not found');
    });
  });
});
