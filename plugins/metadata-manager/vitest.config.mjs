import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: [path.resolve(__dirname, '../../vitest.setup.ts')],
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
          'vitest.config.mjs',
          'esbuild.config.mjs',
        ],
      },
      mockReset: true,
      clearMocks: true,
      restoreMocks: true,
    },
    resolve: {
      alias: {
        obsidian: path.resolve(__dirname, '../../test-utils/obsidian-mock.ts'),
      },
    },
  }),
  {
    // Package-specific overrides can go here
  }
);