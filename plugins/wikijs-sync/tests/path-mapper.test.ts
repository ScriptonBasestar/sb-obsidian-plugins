import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathMapper } from '../src/path-mapper';
import { PathMapping } from '../src/types';
import { Vault, TFile, TFolder } from 'obsidian';

describe('PathMapper', () => {
  let pathMapper: PathMapper;
  let mockVault: Vault;
  let mappings: PathMapping[];

  beforeEach(() => {
    mockVault = {
      getMarkdownFiles: vi.fn().mockReturnValue([]),
      getAbstractFileByPath: vi.fn(),
      getRoot: vi.fn()
    } as any;

    mappings = [
      {
        obsidianPath: 'docs',
        wikiPath: '/documentation',
        enabled: true
      },
      {
        obsidianPath: 'notes/daily',
        wikiPath: '/journal',
        enabled: true
      }
    ];

    pathMapper = new PathMapper(mockVault, mappings);
  });

  describe('obsidianToWiki', () => {
    it('should apply custom mappings', () => {
      expect(pathMapper.obsidianToWiki('docs/setup.md')).toBe('/documentation/setup');
      expect(pathMapper.obsidianToWiki('notes/daily/2024-01-16.md')).toBe('/journal/2024-01-16');
    });

    it('should normalize paths without custom mapping', () => {
      expect(pathMapper.obsidianToWiki('My Notes/Test File.md')).toBe('/my-notes/test-file');
      expect(pathMapper.obsidianToWiki('Project (1)/README.md')).toBe('/project-1/readme');
    });

    it('should handle special characters', () => {
      expect(pathMapper.obsidianToWiki('Notes & Ideas.md')).toBe('/notes-ideas');
      expect(pathMapper.obsidianToWiki('Test!@#$%^&*().md')).toBe('/test');
      expect(pathMapper.obsidianToWiki('Multiple   Spaces.md')).toBe('/multiple-spaces');
    });

    it('should cache results', () => {
      const path = 'test/file.md';
      const result1 = pathMapper.obsidianToWiki(path);
      const result2 = pathMapper.obsidianToWiki(path);
      expect(result1).toBe(result2);
    });

    it('should skip disabled mappings', () => {
      mappings[0].enabled = false;
      pathMapper = new PathMapper(mockVault, mappings);
      expect(pathMapper.obsidianToWiki('docs/test.md')).toBe('/docs/test');
    });
  });

  describe('wikiToObsidian', () => {
    it('should reverse custom mappings', () => {
      expect(pathMapper.wikiToObsidian('/documentation/setup')).toBe('docs/setup.md');
      expect(pathMapper.wikiToObsidian('/journal/2024-01-16')).toBe('notes/daily/2024-01-16.md');
    });

    it('should add .md extension if missing', () => {
      expect(pathMapper.wikiToObsidian('/notes/test')).toBe('notes/test.md');
      expect(pathMapper.wikiToObsidian('/already.md')).toBe('already.md');
    });

    it('should handle root paths', () => {
      expect(pathMapper.wikiToObsidian('/test')).toBe('test.md');
      expect(pathMapper.wikiToObsidian('test')).toBe('test.md');
    });
  });

  describe('path normalization', () => {
    it('should handle edge cases', () => {
      expect(pathMapper.obsidianToWiki('')).toBe('/');
      expect(pathMapper.obsidianToWiki('/')).toBe('/');
      expect(pathMapper.obsidianToWiki('//multiple//slashes//')).toBe('/multiple/slashes');
      expect(pathMapper.obsidianToWiki('---test---')).toBe('/test');
    });

    it('should preserve folder structure', () => {
      expect(pathMapper.obsidianToWiki('folder/subfolder/file.md')).toBe('/folder/subfolder/file');
      expect(pathMapper.obsidianToWiki('a/b/c/d/e.md')).toBe('/a/b/c/d/e');
    });
  });

  describe('buildPageTree', () => {
    it('should build tree from vault structure', async () => {
      const mockRoot = {
        children: [
          {
            name: 'folder1',
            path: 'folder1',
            children: [
              { name: 'file1.md', basename: 'file1', path: 'folder1/file1.md', extension: 'md' }
            ]
          },
          { name: 'file2.md', basename: 'file2', path: 'file2.md', extension: 'md' }
        ]
      } as any;

      mockVault.getRoot.mockReturnValue(mockRoot);
      
      // Mock instanceof checks
      Object.setPrototypeOf(mockRoot.children[0], TFolder.prototype);
      Object.setPrototypeOf(mockRoot.children[0].children[0], TFile.prototype);
      Object.setPrototypeOf(mockRoot.children[1], TFile.prototype);

      const tree = await pathMapper.buildPageTree();
      expect(tree).toHaveLength(2);
      expect(tree[0].isFolder).toBe(true);
      expect(tree[0].children).toHaveLength(1);
    });
  });

  describe('getAllMappedPaths', () => {
    it('should return all file mappings', () => {
      const mockFiles = [
        { path: 'docs/api.md' },
        { path: 'notes/daily/2024.md' },
        { path: 'other.md' }
      ];
      mockVault.getMarkdownFiles.mockReturnValue(mockFiles);

      const mapped = pathMapper.getAllMappedPaths();
      expect(mapped).toHaveLength(3);
      expect(mapped[0]).toEqual({
        obsidian: 'docs/api.md',
        wiki: '/documentation/api'
      });
      expect(mapped[1]).toEqual({
        obsidian: 'notes/daily/2024.md',
        wiki: '/journal/2024'
      });
    });
  });

  describe('mapping management', () => {
    it('should add new mapping', () => {
      const newMapping: PathMapping = {
        obsidianPath: 'projects',
        wikiPath: '/work',
        enabled: true
      };
      pathMapper.addMapping(newMapping);
      expect(pathMapper.obsidianToWiki('projects/test.md')).toBe('/work/test');
    });

    it('should remove mapping', () => {
      pathMapper.removeMapping('docs');
      expect(pathMapper.obsidianToWiki('docs/test.md')).toBe('/docs/test');
    });

    it('should validate mappings', () => {
      mockVault.getAbstractFileByPath.mockReturnValue({ path: 'docs' });
      Object.setPrototypeOf(mockVault.getAbstractFileByPath('docs'), TFolder.prototype);

      const validMapping: PathMapping = {
        obsidianPath: 'docs',
        wikiPath: '/valid',
        enabled: true
      };
      expect(pathMapper.validateMapping(validMapping)).toBe(true);

      const invalidMapping: PathMapping = {
        obsidianPath: '',
        wikiPath: '/invalid',
        enabled: true
      };
      expect(pathMapper.validateMapping(invalidMapping)).toBe(false);
    });

    it('should clear cache when mappings change', () => {
      const path = 'test.md';
      pathMapper.obsidianToWiki(path); // Cache it
      
      pathMapper.updateMappings([]);
      // If cache wasn't cleared, this would return the same result
      // Implementation should recalculate
      expect(pathMapper.obsidianToWiki(path)).toBe('/test');
    });
  });
});