import { defineConfig } from 'vitest/config';
import path from 'path';

export const sharedVitestConfig = defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/mocks/**',
        '**/test-utils/**',
        'vitest.config.ts',
        'esbuild.config.mjs',
      ],
    },
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      obsidian: path.resolve(__dirname, './test-utils/obsidian-mock.ts'),
    },
  },
});
