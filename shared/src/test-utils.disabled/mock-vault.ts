import {
  Vault,
  TFile,
  TFolder,
  TAbstractFile,
  FileStats,
  DataAdapter,
  normalizePath,
} from 'obsidian';
import { vi } from 'vitest';

export interface MockVault extends Partial<Vault> {
  adapter: DataAdapter;
  read: ReturnType<typeof vi.fn>;
  cachedRead: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createBinary: ReturnType<typeof vi.fn>;
  createFolder: ReturnType<typeof vi.fn>;
  modify: ReturnType<typeof vi.fn>;
  modifyBinary: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  trash: ReturnType<typeof vi.fn>;
  rename: ReturnType<typeof vi.fn>;
  copy: ReturnType<typeof vi.fn>;
  getAbstractFileByPath: ReturnType<typeof vi.fn>;
  getFiles: ReturnType<typeof vi.fn>;
  getMarkdownFiles: ReturnType<typeof vi.fn>;
  getAllLoadedFiles: ReturnType<typeof vi.fn>;
  process: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  offref: ReturnType<typeof vi.fn>;
  trigger: ReturnType<typeof vi.fn>;
  tryTrigger: ReturnType<typeof vi.fn>;
}

export function createMockVault(overrides?: Partial<MockVault>): MockVault {
  const files: Map<string, { content: string | ArrayBuffer; stat: FileStats }> = new Map();
  const folders: Set<string> = new Set();

  const mockAdapter: Partial<DataAdapter> = {
    basePath: '/mock/vault',
    read: vi.fn(async (path) => {
      const file = files.get(normalizePath(path));
      if (!file) throw new Error(`File not found: ${path}`);
      return file.content as string;
    }),
    readBinary: vi.fn(async (path) => {
      const file = files.get(normalizePath(path));
      if (!file) throw new Error(`File not found: ${path}`);
      return file.content as ArrayBuffer;
    }),
    write: vi.fn(async (path, content) => {
      files.set(normalizePath(path), {
        content,
        stat: {
          ctime: Date.now(),
          mtime: Date.now(),
          size: content.length,
        },
      });
    }),
    writeBinary: vi.fn(async (path, content) => {
      files.set(normalizePath(path), {
        content,
        stat: {
          ctime: Date.now(),
          mtime: Date.now(),
          size: content.byteLength,
        },
      });
    }),
    append: vi.fn(async (path, content) => {
      const existing = files.get(normalizePath(path));
      if (!existing) throw new Error(`File not found: ${path}`);
      const newContent = (existing.content as string) + content;
      files.set(normalizePath(path), {
        content: newContent,
        stat: {
          ...existing.stat,
          mtime: Date.now(),
          size: newContent.length,
        },
      });
    }),
    remove: vi.fn(async (path) => {
      if (!files.delete(normalizePath(path))) {
        throw new Error(`File not found: ${path}`);
      }
    }),
    rename: vi.fn(async (oldPath, newPath) => {
      const file = files.get(normalizePath(oldPath));
      if (!file) throw new Error(`File not found: ${oldPath}`);
      files.delete(normalizePath(oldPath));
      files.set(normalizePath(newPath), file);
    }),
    copy: vi.fn(async (source, dest) => {
      const file = files.get(normalizePath(source));
      if (!file) throw new Error(`File not found: ${source}`);
      files.set(normalizePath(dest), { ...file });
    }),
    exists: vi.fn(async (path) => {
      return files.has(normalizePath(path)) || folders.has(normalizePath(path));
    }),
    stat: vi.fn(async (path) => {
      const file = files.get(normalizePath(path));
      if (!file) throw new Error(`File not found: ${path}`);
      return file.stat;
    }),
    mkdir: vi.fn(async (path) => {
      folders.add(normalizePath(path));
    }),
    rmdir: vi.fn(async (path) => {
      if (!folders.delete(normalizePath(path))) {
        throw new Error(`Folder not found: ${path}`);
      }
    }),
    list: vi.fn(async (path) => {
      const normalizedPath = normalizePath(path);
      const items: { path: string; type: 'file' | 'folder' }[] = [];

      // List files
      for (const [filePath] of files) {
        if (filePath.startsWith(normalizedPath + '/')) {
          const relativePath = filePath.slice(normalizedPath.length + 1);
          if (!relativePath.includes('/')) {
            items.push({ path: relativePath, type: 'file' });
          }
        }
      }

      // List folders
      for (const folderPath of folders) {
        if (folderPath.startsWith(normalizedPath + '/')) {
          const relativePath = folderPath.slice(normalizedPath.length + 1);
          if (!relativePath.includes('/')) {
            items.push({ path: relativePath, type: 'folder' });
          }
        }
      }

      return { files: items.filter((i) => i.type === 'file').map((i) => i.path) };
    }),
  };

  const mockVault: MockVault = {
    adapter: mockAdapter as DataAdapter,
    read: vi.fn(async (file) => {
      const path = typeof file === 'string' ? file : file.path;
      const readFn = mockAdapter.read;
      if (!readFn) throw new Error('read method not available');
      return readFn(normalizePath(path));
    }),
    cachedRead: vi.fn(async (file) => {
      const path = typeof file === 'string' ? file : file.path;
      const readFn = mockAdapter.read;
      if (!readFn) throw new Error('read method not available');
      return readFn(normalizePath(path));
    }),
    create: vi.fn(async (path, content, options) => {
      const writeFn = mockAdapter.write;
      if (!writeFn) throw new Error('write method not available');
      await writeFn(normalizePath(path), content);
      return createMockTFile(path, content);
    }),
    createBinary: vi.fn(async (path, content, options) => {
      const writeBinaryFn = mockAdapter.writeBinary;
      if (!writeBinaryFn) throw new Error('writeBinary method not available');
      await writeBinaryFn(normalizePath(path), content);
      return createMockTFile(path, content);
    }),
    createFolder: vi.fn(async (path) => {
      const mkdirFn = mockAdapter.mkdir;
      if (!mkdirFn) throw new Error('mkdir method not available');
      await mkdirFn(normalizePath(path));
      return createMockTFolder(path);
    }),
    modify: vi.fn(async (file, content, options) => {
      const path = typeof file === 'string' ? file : file.path;
      const writeFn = mockAdapter.write;
      if (!writeFn) throw new Error('write method not available');
      await writeFn(normalizePath(path), content);
    }),
    modifyBinary: vi.fn(async (file, content, options) => {
      const path = typeof file === 'string' ? file : file.path;
      const writeBinaryFn = mockAdapter.writeBinary;
      if (!writeBinaryFn) throw new Error('writeBinary method not available');
      await writeBinaryFn(normalizePath(path), content);
    }),
    delete: vi.fn(async (file, force) => {
      const path = typeof file === 'string' ? file : file.path;
      const removeFn = mockAdapter.remove;
      if (!removeFn) throw new Error('remove method not available');
      await removeFn(normalizePath(path));
    }),
    trash: vi.fn(async (file, system) => {
      const path = typeof file === 'string' ? file : file.path;
      const removeFn = mockAdapter.remove;
      if (!removeFn) throw new Error('remove method not available');
      await removeFn(normalizePath(path));
    }),
    rename: vi.fn(async (file, newPath) => {
      const oldPath = typeof file === 'string' ? file : file.path;
      const renameFn = mockAdapter.rename;
      if (!renameFn) throw new Error('rename method not available');
      await renameFn(normalizePath(oldPath), normalizePath(newPath));
    }),
    copy: vi.fn(async (file, newPath) => {
      const sourcePath = typeof file === 'string' ? file : file.path;
      const copyFn = mockAdapter.copy;
      if (!copyFn) throw new Error('copy method not available');
      await copyFn(normalizePath(sourcePath), normalizePath(newPath));
      return createMockTFile(newPath, '');
    }),
    getAbstractFileByPath: vi.fn((path) => {
      const normalizedPath = normalizePath(path);
      if (files.has(normalizedPath)) {
        return createMockTFile(path, '');
      }
      if (folders.has(normalizedPath)) {
        return createMockTFolder(path);
      }
      return null;
    }),
    getFiles: vi.fn(() => {
      return Array.from(files.keys()).map((path) => createMockTFile(path, ''));
    }),
    getMarkdownFiles: vi.fn(() => {
      return Array.from(files.keys())
        .filter((path) => path.endsWith('.md'))
        .map((path) => createMockTFile(path, ''));
    }),
    getAllLoadedFiles: vi.fn(() => {
      const allFiles: TAbstractFile[] = [];
      files.forEach((_, path) => allFiles.push(createMockTFile(path, '')));
      folders.forEach((path) => allFiles.push(createMockTFolder(path)));
      return allFiles;
    }),
    process: vi.fn(async (file, fn) => {
      const tFile = typeof file === 'string' ? createMockTFile(file, '') : file;
      const readFn = mockAdapter.read;
      if (!readFn) throw new Error('read method not available');
      const content = await readFn(tFile.path);
      const result = await fn(content);
      const writeFn = mockAdapter.write;
      if (!writeFn) throw new Error('write method not available');
      await writeFn(tFile.path, result);
      return result;
    }),
    on: vi.fn(),
    off: vi.fn(),
    offref: vi.fn(),
    trigger: vi.fn(),
    tryTrigger: vi.fn(),
    ...overrides,
  };

  return mockVault;
}

function createMockTFile(path: string, content: string | ArrayBuffer): TFile {
  const name = path.split('/').pop() || '';
  return {
    path: normalizePath(path),
    name,
    basename: name.replace(/\.[^/.]+$/, ''),
    extension: name.split('.').pop() || '',
    vault: {} as Vault,
    parent: null,
    stat: {
      ctime: Date.now(),
      mtime: Date.now(),
      size: typeof content === 'string' ? content.length : content.byteLength,
    },
  } as TFile;
}

function createMockTFolder(path: string): TFolder {
  const name = path.split('/').pop() || '';
  return {
    path: normalizePath(path),
    name,
    parent: null,
    vault: {} as Vault,
    children: [],
    isRoot: vi.fn().mockReturnValue(path === '/'),
  } as unknown as TFolder;
}
