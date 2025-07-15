import { App, Vault, Workspace, MetadataCache, FileManager } from 'obsidian';
import { vi } from 'vitest';
import { createMockVault } from './mock-vault';
import { createMockWorkspace } from './mock-workspace';

export interface MockApp extends Partial<App> {
  vault: Vault;
  workspace: Workspace;
  metadataCache: MetadataCache;
  fileManager: FileManager;
}

export function createMockApp(overrides?: Partial<MockApp>): MockApp {
  const mockVault = createMockVault();
  const mockWorkspace = createMockWorkspace();

  const mockMetadataCache: Partial<MetadataCache> = {
    getFileCache: vi.fn().mockReturnValue(null),
    getCache: vi.fn().mockReturnValue(null),
    fileToLinktext: vi.fn((file, sourcePath) => file.basename),
    resolveLinks: vi.fn().mockReturnValue([]),
    on: vi.fn() as any,
    off: vi.fn() as any,
    offref: vi.fn() as any,
    trigger: vi.fn() as any,
    tryTrigger: vi.fn() as any,
  };

  const mockFileManager: Partial<FileManager> = {
    processFrontMatter: vi.fn().mockImplementation(async (file, fn) => {
      // Simulate frontmatter processing
      const cache = { frontmatter: {} };
      fn(cache.frontmatter);
    }),
    generateMarkdownLink: vi.fn((file, sourcePath) => `[[${file.basename}]]`),
  };

  const mockApp: MockApp = {
    vault: mockVault as Vault,
    workspace: mockWorkspace as Workspace,
    metadataCache: mockMetadataCache as MetadataCache,
    fileManager: mockFileManager as FileManager,
    lastEvent: null,
    ...overrides,
  };

  return mockApp;
}

export function createMockAppWithFiles(
  files: Array<{ path: string; content: string; frontmatter?: Record<string, any> }>
): MockApp {
  const mockApp = createMockApp();
  
  // Add files to vault
  files.forEach(({ path, content }) => {
    const file = {
      path,
      name: path.split('/').pop() || '',
      basename: (path.split('/').pop() || '').replace(/\.[^/.]+$/, ''),
      extension: path.split('.').pop() || '',
      vault: mockApp.vault,
      stat: {
        ctime: Date.now(),
        mtime: Date.now(),
        size: content.length,
      },
    };
    
    // Mock vault methods to work with this file
    vi.mocked(mockApp.vault.read).mockImplementation(async (f) => {
      if (f === file || (typeof f === 'object' && f.path === path)) {
        return content;
      }
      throw new Error('File not found');
    });
    
    vi.mocked(mockApp.vault.getAbstractFileByPath).mockImplementation((p) => {
      if (p === path) {
        return file as any;
      }
      return null;
    });
  });

  // Mock metadata cache to return frontmatter
  files.forEach(({ path, frontmatter }) => {
    if (frontmatter) {
      vi.mocked(mockApp.metadataCache.getFileCache).mockImplementation((file) => {
        if (typeof file === 'object' && file.path === path) {
          return { frontmatter } as any;
        }
        return null;
      });
    }
  });

  return mockApp;
}