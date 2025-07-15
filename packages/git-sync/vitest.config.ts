import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'vitest.config.ts',
        'esbuild.config.mjs'
      ]
    }
  },
  resolve: {
    alias: {
      'obsidian': new URL('./src/__mocks__/obsidian.ts', import.meta.url).pathname
    }
  }
});