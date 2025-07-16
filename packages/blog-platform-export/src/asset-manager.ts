import { TFile, Vault } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs-extra';
import { AssetHandlingOptions, AssetInfo } from './types';

export class AssetManager {
  private vault: Vault;
  private options: AssetHandlingOptions;

  constructor(vault: Vault, options: AssetHandlingOptions) {
    this.vault = vault;
    this.options = options;
  }

  /**
   * Copy assets from vault to target directory
   */
  async copyAssets(
    sourceFiles: TFile[], 
    targetDir: string,
    subdir: string = 'assets'
  ): Promise<AssetInfo[]> {
    const copiedAssets: AssetInfo[] = [];
    const allFiles = this.vault.getFiles();
    const referencedAssets = this.findReferencedAssets(sourceFiles, allFiles);

    const assetsDir = path.join(targetDir, subdir);
    await fs.ensureDir(assetsDir);

    for (const asset of referencedAssets) {
      try {
        if (this.shouldCopyAsset(asset)) {
          const assetInfo = await this.copyAsset(asset, assetsDir);
          copiedAssets.push(assetInfo);
        }
      } catch (error) {
        console.warn(`Failed to copy asset ${asset.path}:`, error);
      }
    }

    // Remove duplicates and optimize if requested
    if (this.options.optimizeImages) {
      await this.optimizeAssets(copiedAssets);
    }

    return copiedAssets;
  }

  /**
   * Find all assets referenced by the source files
   */
  private findReferencedAssets(sourceFiles: TFile[], allFiles: TFile[]): TFile[] {
    const referencedPaths = new Set<string>();

    // Extract asset references from source files
    for (const file of sourceFiles) {
      this.extractAssetReferences(file).forEach(ref => {
        referencedPaths.add(ref);
      });
    }

    // Find corresponding files in vault
    const referencedAssets: TFile[] = [];
    for (const assetPath of referencedPaths) {
      const asset = allFiles.find(f => 
        f.path === assetPath || 
        f.name === assetPath ||
        f.path.endsWith('/' + assetPath)
      );
      
      if (asset && this.isAssetFile(asset)) {
        referencedAssets.push(asset);
      }
    }

    return referencedAssets;
  }

  /**
   * Extract asset references from a file
   */
  private async extractAssetReferences(file: TFile): Promise<string[]> {
    const content = await this.vault.read(file);
    const references: string[] = [];

    // Embedded images: ![[image.png]]
    const embeddedRegex = /!\[\[([^\]]+?)\]\]/g;
    let match;
    while ((match = embeddedRegex.exec(content)) !== null) {
      references.push(match[1]);
    }

    // Markdown images: ![alt](path)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = markdownImageRegex.exec(content)) !== null) {
      const imagePath = match[2];
      if (!imagePath.startsWith('http')) {
        references.push(imagePath);
      }
    }

    // Embedded attachments: ![[file.pdf]]
    const attachmentRegex = /!\[\[([^\]]+?\.(pdf|doc|docx|txt|zip|rar|mp3|mp4|avi|mov))\]\]/gi;
    while ((match = attachmentRegex.exec(content)) !== null) {
      references.push(match[1]);
    }

    return references;
  }

  /**
   * Copy a single asset file
   */
  private async copyAsset(asset: TFile, assetsDir: string): Promise<AssetInfo> {
    const targetPath = this.getAssetTargetPath(asset, assetsDir);
    await fs.ensureDir(path.dirname(targetPath));

    const buffer = await this.vault.readBinary(asset);
    await fs.writeFile(targetPath, buffer);

    return {
      originalPath: asset.path,
      targetPath,
      size: buffer.byteLength,
      type: this.isImageFile(asset) ? 'image' : 'attachment'
    };
  }

  /**
   * Get target path for asset
   */
  private getAssetTargetPath(asset: TFile, assetsDir: string): string {
    if (this.options.preserveStructure) {
      // Preserve directory structure
      return path.join(assetsDir, asset.path);
    } else {
      // Flatten structure, organize by type
      const subdir = this.isImageFile(asset) ? 'images' : 'files';
      return path.join(assetsDir, subdir, asset.name);
    }
  }

  /**
   * Check if asset should be copied
   */
  private shouldCopyAsset(asset: TFile): boolean {
    const isImage = this.isImageFile(asset);
    const isAttachment = !isImage && this.isAssetFile(asset);

    if (isImage && !this.options.copyImages) {
      return false;
    }

    if (isAttachment && !this.options.copyAttachments) {
      return false;
    }

    // Check file size
    if (isImage && asset.stat.size > this.options.maxImageSize * 1024) {
      return false;
    }

    // Check file format
    if (isImage && !this.options.imageFormats.includes(asset.extension.toLowerCase())) {
      return false;
    }

    return true;
  }

  /**
   * Optimize copied assets
   */
  private async optimizeAssets(assets: AssetInfo[]): Promise<void> {
    for (const asset of assets) {
      if (asset.type === 'image') {
        await this.optimizeImage(asset);
      }
    }
  }

  /**
   * Optimize a single image
   */
  private async optimizeImage(asset: AssetInfo): Promise<void> {
    // Basic optimization - remove duplicates by checking file size and name
    const dir = path.dirname(asset.targetPath);
    const files = await fs.readdir(dir);
    const basename = path.basename(asset.targetPath, path.extname(asset.targetPath));
    
    // Look for similar files
    const similar = files.filter(f => {
      const otherBasename = path.basename(f, path.extname(f));
      return otherBasename === basename && f !== path.basename(asset.targetPath);
    });

    // Remove duplicates (basic implementation)
    for (const similarFile of similar) {
      const similarPath = path.join(dir, similarFile);
      const similarStat = await fs.stat(similarPath);
      
      if (similarStat.size === asset.size) {
        // Likely duplicate, remove the similar file
        await fs.remove(similarPath);
      }
    }
  }

  /**
   * Update asset references in content
   */
  updateAssetReferences(
    content: string, 
    assetMapping: Map<string, string>,
    baseUrl?: string
  ): string {
    let updatedContent = content;

    // Update embedded images: ![[image.png]] -> ![image](path)
    updatedContent = updatedContent.replace(/!\[\[([^\]]+?)\]\]/g, (match, assetPath) => {
      const mappedPath = assetMapping.get(assetPath);
      if (mappedPath) {
        const filename = path.basename(assetPath, path.extname(assetPath));
        const finalPath = baseUrl ? baseUrl + '/' + mappedPath : mappedPath;
        return `![${filename}](${finalPath})`;
      }
      return match;
    });

    // Update markdown image paths
    updatedContent = updatedContent.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imagePath) => {
      if (!imagePath.startsWith('http')) {
        const mappedPath = assetMapping.get(imagePath);
        if (mappedPath) {
          const finalPath = baseUrl ? baseUrl + '/' + mappedPath : mappedPath;
          return `![${alt}](${finalPath})`;
        }
      }
      return match;
    });

    return updatedContent;
  }

  /**
   * Build asset mapping from original paths to target paths
   */
  buildAssetMapping(assets: AssetInfo[], baseUrl?: string): Map<string, string> {
    const mapping = new Map<string, string>();

    for (const asset of assets) {
      const originalName = path.basename(asset.originalPath);
      const relativePath = path.relative(baseUrl || '', asset.targetPath);
      
      // Map by full path
      mapping.set(asset.originalPath, relativePath);
      
      // Map by filename
      mapping.set(originalName, relativePath);
    }

    return mapping;
  }

  /**
   * Generate asset report
   */
  generateAssetReport(assets: AssetInfo[]): any {
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const images = assets.filter(a => a.type === 'image');
    const attachments = assets.filter(a => a.type === 'attachment');

    return {
      totalAssets: assets.length,
      totalSize: totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      images: {
        count: images.length,
        size: images.reduce((sum, asset) => sum + asset.size, 0)
      },
      attachments: {
        count: attachments.length,
        size: attachments.reduce((sum, asset) => sum + asset.size, 0)
      },
      assets: assets
    };
  }

  /**
   * Check if file is an asset
   */
  private isAssetFile(file: TFile): boolean {
    const assetExtensions = [
      'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'txt', 'rtf', 'csv',
      'zip', 'rar', '7z', 'tar', 'gz',
      'mp3', 'wav', 'flac', 'aac',
      'mp4', 'avi', 'mov', 'mkv', 'wmv'
    ];
    return assetExtensions.includes(file.extension.toLowerCase());
  }

  /**
   * Check if file is an image
   */
  private isImageFile(file: TFile): boolean {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
    return imageExtensions.includes(file.extension.toLowerCase());
  }

  /**
   * Format bytes as human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clean up unused assets in target directory
   */
  async cleanupUnusedAssets(targetDir: string, usedAssets: AssetInfo[]): Promise<void> {
    const assetsDir = path.join(targetDir, 'assets');
    
    if (!await fs.pathExists(assetsDir)) {
      return;
    }

    const usedPaths = new Set(usedAssets.map(a => a.targetPath));
    const allFiles = await this.getAllFiles(assetsDir);

    for (const filePath of allFiles) {
      if (!usedPaths.has(filePath)) {
        await fs.remove(filePath);
      }
    }
  }

  /**
   * Get all files in directory recursively
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}