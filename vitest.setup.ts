import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Obsidian global
global.app = {
  vault: {},
  workspace: {},
  metadataCache: {},
  fileManager: {},
} as any;

// Mock electron
vi.mock('electron', () => ({
  remote: {
    app: {
      getPath: vi.fn(() => '/mock/path'),
    },
  },
}));

// Mock Node.js modules that might be used
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
  },
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  resolve: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: vi.fn((path) => path.split('/').pop()),
  extname: vi.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
}));

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};

// Restore console for debugging
(global as any).restoreConsole = () => {
  global.console = originalConsole;
};

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
} as any;

// Mock crypto API
global.crypto = {
  randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
} as any;

// Setup DOM environment
beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
});