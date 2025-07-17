import { vi, expect } from 'vitest';
import { TFile, TFolder, Notice } from 'obsidian';

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Waits for a mock function to be called with specific arguments
 */
export async function waitForCall(
  mockFn: ReturnType<typeof vi.fn>,
  expectedArgs?: any[],
  timeout = 5000
): Promise<void> {
  await waitFor(() => {
    if (!mockFn.called) return false;
    if (!expectedArgs) return true;

    return mockFn.mock.calls.some((call) => JSON.stringify(call) === JSON.stringify(expectedArgs));
  }, timeout);
}

/**
 * Creates a mock TFile with proper structure
 */
export function createMockFile(
  path: string,
  content = '',
  frontmatter?: Record<string, any>
): TFile & { content: string; frontmatter?: Record<string, any> } {
  const name = path.split('/').pop() || '';
  const file = {
    path,
    name,
    basename: name.replace(/\.[^/.]+$/, ''),
    extension: name.split('.').pop() || 'md',
    vault: {} as any,
    parent: null,
    stat: {
      ctime: Date.now(),
      mtime: Date.now(),
      size: content.length,
    },
    content,
    frontmatter,
  } as TFile & { content: string; frontmatter?: Record<string, any> };

  return file;
}

/**
 * Creates a mock TFolder with proper structure
 */
export function createMockFolder(path: string, children: string[] = []): TFolder {
  const name = path.split('/').pop() || '';
  const folder = {
    path,
    name,
    parent: null,
    vault: {} as any,
    children: children.map((child) => {
      const childPath = `${path}/${child}`;
      return child.includes('.') ? createMockFile(childPath) : createMockFolder(childPath);
    }),
    isRoot: () => path === '/',
  } as unknown as TFolder;

  return folder;
}

/**
 * Mocks the Notice class for testing
 */
export function mockNotice(): {
  notices: Array<{ message: string; timeout?: number }>;
  reset: () => void;
} {
  const notices: Array<{ message: string; timeout?: number }> = [];

  // Mock the Notice constructor
  vi.mocked(Notice).mockImplementation((message: string, timeout?: number) => {
    notices.push({ message, timeout });
    return {
      setMessage: vi.fn(),
      hide: vi.fn(),
    } as any;
  });

  return {
    notices,
    reset: () => notices.splice(0, notices.length),
  };
}

/**
 * Creates a mock frontmatter string
 */
export function createFrontmatter(data: Record<string, any>): string {
  const yaml = Object.entries(data)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map((v) => `"${v}"`).join(', ')}]`;
      } else if (typeof value === 'object' && value !== null) {
        return `${key}: ${JSON.stringify(value)}`;
      } else {
        return `${key}: ${value}`;
      }
    })
    .join('\n');

  return `---\n${yaml}\n---`;
}

/**
 * Creates a mock markdown file with frontmatter
 */
export function createMarkdownFile(frontmatter: Record<string, any>, content: string): string {
  return `${createFrontmatter(frontmatter)}\n\n${content}`;
}

/**
 * Extracts frontmatter from markdown content
 */
export function extractFrontmatter(content: string): {
  frontmatter: Record<string, any> | null;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: null, body: content };
  }

  const [, frontmatterContent, body] = match;
  const frontmatter: Record<string, any> = {};

  frontmatterContent.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[key] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/^["']|["']$/g, ''));
      }
      // Parse booleans
      else if (value === 'true' || value === 'false') {
        frontmatter[key] = value === 'true';
      }
      // Parse numbers
      else if (!isNaN(Number(value))) {
        frontmatter[key] = Number(value);
      }
      // Parse strings
      else {
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  });

  return { frontmatter, body: body.trim() };
}

/**
 * Test helper for async operations with cleanup
 */
export async function withCleanup<T>(
  setup: () => T | Promise<T>,
  test: (context: T) => void | Promise<void>,
  cleanup?: (context: T) => void | Promise<void>
): Promise<void> {
  const context = await setup();

  try {
    await test(context);
  } finally {
    if (cleanup) {
      await cleanup(context);
    }
  }
}

/**
 * Asserts that a promise rejects with a specific error
 */
export async function expectToReject(
  promise: Promise<any>,
  expectedError?: string | RegExp | Error
): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject, but it resolved');
  } catch (error) {
    if (expectedError) {
      if (expectedError instanceof RegExp) {
        expect(error.message).toMatch(expectedError);
      } else if (expectedError instanceof Error) {
        expect(error).toEqual(expectedError);
      } else {
        expect(error.message).toBe(expectedError);
      }
    }
  }
}

/**
 * Creates a mock command callback
 */
export function createMockCommand(id: string, name: string, callback?: () => void) {
  return {
    id,
    name,
    callback: callback || vi.fn(),
    checkCallback: vi.fn((checking: boolean) => {
      if (!checking && callback) {
        callback();
      }
      return true;
    }),
    editorCallback: vi.fn(),
    editorCheckCallback: vi.fn(),
    hotkeys: [],
  };
}

/**
 * Test data generators
 */
export const testData = {
  randomString: (length = 10): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },

  randomDate: (start = new Date(2020, 0, 1), end = new Date()): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },

  randomTags: (count = 3): string[] => {
    const tags = ['work', 'personal', 'todo', 'idea', 'note', 'project', 'meeting', 'research'];
    return Array.from({ length: count }, () => tags[Math.floor(Math.random() * tags.length)]);
  },

  randomFrontmatter: (): Record<string, any> => ({
    title: testData.randomString(20),
    created: testData.randomDate().toISOString(),
    modified: testData.randomDate().toISOString(),
    tags: testData.randomTags(),
    author: testData.randomString(10),
  }),
};
