import { describe, it, expect } from 'vitest';
import { formatDate, sanitizeFilename } from '../utils';

describe('formatDate', () => {
  it('should format date with default format', () => {
    const date = new Date('2024-03-15');
    expect(formatDate(date)).toBe('2024-03-15');
  });

  it('should handle single digit months and days', () => {
    const date = new Date('2024-01-05');
    expect(formatDate(date)).toBe('2024-01-05');
  });
});

describe('sanitizeFilename', () => {
  it('should remove invalid characters from filename', () => {
    expect(sanitizeFilename('file<>name')).toBe('file--name');
    expect(sanitizeFilename('path/to/file')).toBe('path-to-file');
    expect(sanitizeFilename('file:name*')).toBe('file-name-');
  });

  it('should handle normal filenames', () => {
    expect(sanitizeFilename('normal-filename.md')).toBe('normal-filename.md');
  });
});
