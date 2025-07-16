import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetManager } from '../src/asset-manager';
import { Vault, TFile } from 'obsidian';
import { AssetHandlingOptions } from '../src/types';

describe('AssetManager', () => {
  let assetManager: AssetManager;
  let mockVault: Vault;
  let mockOptions: AssetHandlingOptions;

  beforeEach(() => {
    mockVault = {
      read: vi.fn(),
      readBinary: vi.fn(),
      getFiles: vi.fn()
    } as any;

    mockOptions = {
      copyImages: true,
      copyAttachments: true,
      optimizeImages: false,
      imageFormats: ['jpg', 'png', 'gif', 'webp'],
      maxImageSize: 2048,
      preserveStructure: true
    };

    assetManager = new AssetManager(mockVault, mockOptions);
  });

  describe('extractAssetReferences', () => {
    it('should extract embedded image references', async () => {
      const content = `
Here's an image: ![[image.png]]
And another: ![[folder/photo.jpg]]
      `;

      mockVault.read = vi.fn().mockResolvedValue(content);
      const file = { path: 'test.md' } as TFile;

      const references = await assetManager['extractAssetReferences'](file);

      expect(references).toEqual(['image.png', 'folder/photo.jpg']);
    });

    it('should extract markdown image references', async () => {
      const content = `
![Alt text](./images/photo.jpg)
![Another](../assets/diagram.png)
![External](https://example.com/image.jpg)
      `;

      mockVault.read = vi.fn().mockResolvedValue(content);
      const file = { path: 'test.md' } as TFile;

      const references = await assetManager['extractAssetReferences'](file);

      expect(references).toEqual(['./images/photo.jpg', '../assets/diagram.png']);
      expect(references).not.toContain('https://example.com/image.jpg');
    });

    it('should extract attachment references', async () => {
      const content = `
Document: ![[report.pdf]]
Spreadsheet: ![[data.xlsx]]
      `;

      mockVault.read = vi.fn().mockResolvedValue(content);
      const file = { path: 'test.md' } as TFile;

      const references = await assetManager['extractAssetReferences'](file);

      expect(references).toEqual(['report.pdf', 'data.xlsx']);
    });
  });

  describe('shouldCopyAsset', () => {
    it('should copy images when enabled', () => {
      const imageFile = { 
        extension: 'png',
        stat: { size: 1024 }
      } as TFile;

      const result = assetManager['shouldCopyAsset'](imageFile);
      expect(result).toBe(true);
    });

    it('should not copy images when disabled', () => {
      mockOptions.copyImages = false;
      assetManager = new AssetManager(mockVault, mockOptions);

      const imageFile = { 
        extension: 'png',
        stat: { size: 1024 }
      } as TFile;

      const result = assetManager['shouldCopyAsset'](imageFile);
      expect(result).toBe(false);
    });

    it('should not copy oversized images', () => {
      const largeImageFile = { 
        extension: 'png',
        stat: { size: 3 * 1024 * 1024 } // 3MB
      } as TFile;

      const result = assetManager['shouldCopyAsset'](largeImageFile);
      expect(result).toBe(false);
    });

    it('should not copy unsupported image formats', () => {
      const unsupportedFile = { 
        extension: 'bmp',
        stat: { size: 1024 }
      } as TFile;

      const result = assetManager['shouldCopyAsset'](unsupportedFile);
      expect(result).toBe(false);
    });
  });

  describe('getAssetTargetPath', () => {
    it('should preserve structure when enabled', () => {
      const asset = { 
        path: 'folder/subfolder/image.png',
        name: 'image.png'
      } as TFile;

      const targetPath = assetManager['getAssetTargetPath'](asset, '/output/assets');
      expect(targetPath).toBe('/output/assets/folder/subfolder/image.png');
    });

    it('should flatten structure when disabled', () => {
      mockOptions.preserveStructure = false;
      assetManager = new AssetManager(mockVault, mockOptions);

      const asset = { 
        path: 'folder/subfolder/image.png',
        name: 'image.png',
        extension: 'png'
      } as TFile;

      const targetPath = assetManager['getAssetTargetPath'](asset, '/output/assets');
      expect(targetPath).toBe('/output/assets/images/image.png');
    });
  });

  describe('updateAssetReferences', () => {
    it('should update embedded image references', () => {
      const content = 'Image: ![[folder/image.png]] here.';
      const mapping = new Map([['folder/image.png', 'assets/images/image.png']]);

      const result = assetManager.updateAssetReferences(content, mapping);
      expect(result).toBe('Image: ![image](assets/images/image.png) here.');
    });

    it('should update markdown image references', () => {
      const content = 'Image: ![Alt](./folder/image.png) here.';
      const mapping = new Map([['./folder/image.png', 'assets/images/image.png']]);

      const result = assetManager.updateAssetReferences(content, mapping);
      expect(result).toBe('Image: ![Alt](assets/images/image.png) here.');
    });

    it('should use base URL when provided', () => {
      const content = 'Image: ![[image.png]] here.';
      const mapping = new Map([['image.png', 'assets/image.png']]);
      const baseUrl = 'https://cdn.example.com';

      const result = assetManager.updateAssetReferences(content, mapping, baseUrl);
      expect(result).toBe('Image: ![image](https://cdn.example.com/assets/image.png) here.');
    });
  });

  describe('buildAssetMapping', () => {
    it('should create correct mapping', () => {
      const assets = [
        {
          originalPath: 'folder/image.png',
          targetPath: '/output/assets/folder/image.png',
          size: 1024,
          type: 'image'
        },
        {
          originalPath: 'docs/file.pdf',
          targetPath: '/output/assets/docs/file.pdf',
          size: 2048,
          type: 'attachment'
        }
      ];

      const mapping = assetManager.buildAssetMapping(assets);

      expect(mapping.get('folder/image.png')).toBe('/output/assets/folder/image.png');
      expect(mapping.get('image.png')).toBe('/output/assets/folder/image.png');
      expect(mapping.get('docs/file.pdf')).toBe('/output/assets/docs/file.pdf');
      expect(mapping.get('file.pdf')).toBe('/output/assets/docs/file.pdf');
    });
  });

  describe('generateAssetReport', () => {
    it('should generate comprehensive report', () => {
      const assets = [
        { originalPath: 'img1.png', targetPath: '/out/img1.png', size: 1024, type: 'image' },
        { originalPath: 'img2.jpg', targetPath: '/out/img2.jpg', size: 2048, type: 'image' },
        { originalPath: 'doc.pdf', targetPath: '/out/doc.pdf', size: 4096, type: 'attachment' }
      ];

      const report = assetManager.generateAssetReport(assets);

      expect(report.totalAssets).toBe(3);
      expect(report.totalSize).toBe(7168);
      expect(report.images.count).toBe(2);
      expect(report.images.size).toBe(3072);
      expect(report.attachments.count).toBe(1);
      expect(report.attachments.size).toBe(4096);
      expect(report.totalSizeFormatted).toBe('7 KB');
    });
  });

  describe('isAssetFile', () => {
    it('should identify image files', () => {
      const imageFile = { extension: 'png' } as TFile;
      expect(assetManager['isAssetFile'](imageFile)).toBe(true);
    });

    it('should identify document files', () => {
      const docFile = { extension: 'pdf' } as TFile;
      expect(assetManager['isAssetFile'](docFile)).toBe(true);
    });

    it('should reject non-asset files', () => {
      const textFile = { extension: 'md' } as TFile;
      expect(assetManager['isAssetFile'](textFile)).toBe(false);
    });
  });

  describe('isImageFile', () => {
    it('should identify common image formats', () => {
      const formats = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
      
      formats.forEach(format => {
        const file = { extension: format } as TFile;
        expect(assetManager['isImageFile'](file)).toBe(true);
      });
    });

    it('should reject non-image files', () => {
      const file = { extension: 'pdf' } as TFile;
      expect(assetManager['isImageFile'](file)).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(assetManager['formatBytes'](0)).toBe('0 Bytes');
      expect(assetManager['formatBytes'](1024)).toBe('1 KB');
      expect(assetManager['formatBytes'](1048576)).toBe('1 MB');
      expect(assetManager['formatBytes'](1073741824)).toBe('1 GB');
      expect(assetManager['formatBytes'](1536)).toBe('1.5 KB');
    });
  });
});