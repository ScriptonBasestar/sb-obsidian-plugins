import { Plugin, PluginManifest, App } from 'obsidian';
import { vi } from 'vitest';
import { createMockApp } from './mock-app';

export interface MockPlugin<T = any> extends Partial<Plugin> {
  app: App;
  manifest: PluginManifest;
  settings: T;
  loadData: ReturnType<typeof vi.fn>;
  saveData: ReturnType<typeof vi.fn>;
  addCommand: ReturnType<typeof vi.fn>;
  addRibbonIcon: ReturnType<typeof vi.fn>;
  addStatusBarItem: ReturnType<typeof vi.fn>;
  addSettingTab: ReturnType<typeof vi.fn>;
  registerView: ReturnType<typeof vi.fn>;
  registerExtensions: ReturnType<typeof vi.fn>;
  registerEvent: ReturnType<typeof vi.fn>;
  registerDomEvent: ReturnType<typeof vi.fn>;
  registerInterval: ReturnType<typeof vi.fn>;
  registerCodeMirror: ReturnType<typeof vi.fn>;
  registerEditorExtension: ReturnType<typeof vi.fn>;
  registerEditorSuggest: ReturnType<typeof vi.fn>;
  registerMarkdownPostProcessor: ReturnType<typeof vi.fn>;
  registerMarkdownCodeBlockProcessor: ReturnType<typeof vi.fn>;
}

export interface MockPluginOptions<T = any> {
  manifest?: Partial<PluginManifest>;
  settings?: T;
  app?: App;
}

export function createMockPlugin<T = any>(options: MockPluginOptions<T> = {}): MockPlugin<T> {
  const { manifest = {}, settings = {} as T, app = createMockApp() } = options;

  const mockManifest: PluginManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    minAppVersion: '0.15.0',
    description: 'A test plugin',
    author: 'Test Author',
    authorUrl: '',
    isDesktopOnly: false,
    ...manifest,
  };

  const registeredCommands: any[] = [];
  const registeredEvents: any[] = [];
  const registeredIntervals: number[] = [];

  const mockPlugin: MockPlugin<T> = {
    app,
    manifest: mockManifest,
    settings,
    loadData: vi.fn(async () => settings),
    saveData: vi.fn(async (data) => {
      Object.assign(settings, data);
    }),
    addCommand: vi.fn((command) => {
      registeredCommands.push(command);
      return { id: command.id };
    }),
    addRibbonIcon: vi.fn((icon, title, callback) => {
      const element = document.createElement('div');
      element.className = 'ribbon-icon';
      element.setAttribute('aria-label', title);
      element.addEventListener('click', callback);
      return element;
    }),
    addStatusBarItem: vi.fn(() => {
      const element = document.createElement('div');
      element.className = 'status-bar-item';
      return element;
    }),
    addSettingTab: vi.fn((tab) => {
      // Mock setting tab registration
    }),
    registerView: vi.fn((type, viewCreator) => {
      // Mock view registration
    }),
    registerExtensions: vi.fn((extensions, viewType) => {
      // Mock extension registration
    }),
    registerEvent: vi.fn((eventRef) => {
      registeredEvents.push(eventRef);
      return eventRef;
    }),
    registerDomEvent: vi.fn((el, type, callback) => {
      el.addEventListener(type, callback);
      return { el, type, callback };
    }),
    registerInterval: vi.fn((interval) => {
      registeredIntervals.push(interval);
      return interval;
    }),
    registerCodeMirror: vi.fn((callback) => {
      // Mock CodeMirror registration
    }),
    registerEditorExtension: vi.fn((extension) => {
      // Mock editor extension registration
    }),
    registerEditorSuggest: vi.fn((editorSuggest) => {
      // Mock editor suggest registration
    }),
    registerMarkdownPostProcessor: vi.fn((processor, priority) => {
      // Mock markdown post processor registration
    }),
    registerMarkdownCodeBlockProcessor: vi.fn((language, processor, priority) => {
      // Mock markdown code block processor registration
    }),
  };

  // Add helper methods for testing
  (mockPlugin as any).getRegisteredCommands = () => registeredCommands;
  (mockPlugin as any).getRegisteredEvents = () => registeredEvents;
  (mockPlugin as any).getRegisteredIntervals = () => registeredIntervals;

  // Add cleanup method
  (mockPlugin as any).cleanup = () => {
    registeredIntervals.forEach(clearInterval);
    registeredEvents.forEach((event) => {
      if (event.off) event.off();
    });
  };

  return mockPlugin;
}

export function createMockPluginWithSettings<T>(
  defaultSettings: T,
  savedSettings?: Partial<T>
): MockPlugin<T> {
  const settings = { ...defaultSettings, ...savedSettings };

  return createMockPlugin({
    settings,
    manifest: {
      id: 'test-plugin-with-settings',
      name: 'Test Plugin with Settings',
    },
  });
}

export function createMockPluginClass<T = any>(
  options: MockPluginOptions<T> = {}
): new (app: App, manifest: PluginManifest) => Plugin {
  return class MockPluginClass extends Plugin {
    settings: T;

    constructor(app: App, manifest: PluginManifest) {
      super(app, manifest);
      this.settings = options.settings || ({} as T);
    }

    async onload() {
      // Mock implementation
    }

    onunload() {
      // Mock implementation
    }

    async loadSettings() {
      this.settings = Object.assign({}, options.settings, await this.loadData());
    }

    async saveSettings() {
      await this.saveData(this.settings);
    }
  };
}
