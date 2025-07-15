import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/__mocks__/obsidian.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'obsidian': path.resolve(__dirname, 'src/__mocks__/obsidian.ts')
    }
  }
});