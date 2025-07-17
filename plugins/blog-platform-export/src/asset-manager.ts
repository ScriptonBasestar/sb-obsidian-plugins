import { TFile, Vault } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs-extra';
import { AssetHandlingOptions, AssetInfo, AssetReport } from './types';

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
  public async copyAssets(
    sourceFiles: TFile[],
    targetDir: string,
    subdir: string = 'assets'
  ): Promise<AssetInfo[]> {
    const copiedAssets: AssetInfo[] = [];
    const allFiles = this.vault.getFiles();
    const referencedAssets = await this.findReferencedAssets(sourceFiles, allFiles);

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
  private async findReferencedAssets(sourceFiles: TFile[], allFiles: TFile[]): Promise<TFile[]> {
    const referencedPaths = new Set<string>();

    // Extract asset references from source files
    for (const file of sourceFiles) {
      const refs = await this.extractAssetReferences(file);
      refs.forEach((ref: string) => {
        referencedPaths.add(ref);
      });
    }

    // Find corresponding files in vault
    const referencedAssets: TFile[] = [];
    for (const assetPath of referencedPaths) {
      const asset = allFiles.find(
        (f) => f.path === assetPath || f.name === assetPath || f.path.endsWith('/' + assetPath)
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
      const capturedGroup = match[1];
      if (capturedGroup != null && capturedGroup.length > 0) {
        references.push(capturedGroup);
      }
    }

    // Markdown images: ![alt](path)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = markdownImageRegex.exec(content)) !== null) {
      const imagePath = match[2];
      if (imagePath != null && imagePath.length > 0 && !imagePath.startsWith('http')) {
        references.push(imagePath);
      }
    }

    // Embedded attachments: ![[file.pdf]]
    const attachmentRegex = /!\[\[([^\]]+?\.(pdf|doc|docx|txt|zip|rar|mp3|mp4|avi|mov))\]\]/gi;
    while ((match = attachmentRegex.exec(content)) !== null) {
      const attachmentPath = match[1];
      if (attachmentPath != null && attachmentPath.length > 0) {
        references.push(attachmentPath);
      }
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
    await fs.writeFile(targetPath, Buffer.from(buffer));

    return {
      originalPath: asset.path,
      targetPath,
      size: buffer.byteLength,
      type: this.isImageFile(asset) ? 'image' : 'attachment',
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
    const similar = files.filter((f) => {
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
  public updateAssetReferences(
    content: string,
    assetMapping: Map<string, string>,
    baseUrl?: string
  ): string {
    let updatedContent = content;

    // Update embedded images: ![[image.png]] -> ![image](path)
    updatedContent = updatedContent.replace(/!\[\[([^\]]+?)\]\]/g, (match: string, assetPath: string) => {
      const mappedPath = assetMapping.get(assetPath);
      if (mappedPath !== null && mappedPath.length > 0) {
        const filename = path.basename(assetPath, path.extname(assetPath));
        const finalPath = baseUrl !== null ? `${baseUrl}/${mappedPath}` : mappedPath;
        return `![${filename}](${finalPath})`;
      }
      return match;
    });

    // Update markdown image paths
    updatedContent = updatedContent.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (match: string, alt: string, imagePath: string) => {
        if (imagePath !== null && !imagePath.startsWith('http')) {
          const mappedPath = assetMapping.get(imagePath);
          if (mappedPath !== null && mappedPath.length > 0) {
            const finalPath = baseUrl !== null ? `${baseUrl}/${mappedPath}` : mappedPath;
            return `![${alt}](${finalPath})`;
          }
        }
        return match;
      }
    );

    return updatedContent;
  }

  /**
   * Build asset mapping from original paths to target paths
   */
  private buildAssetMapping(assets: AssetInfo[], baseUrl?: string): Map<string, string> {
    const mapping = new Map<string, string>();

    for (const asset of assets) {
      const originalName = path.basename(asset.originalPath);
      const relativePath = path.relative(baseUrl ?? '', asset.targetPath);

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
  public generateAssetReport(assets: AssetInfo[]): AssetReport {
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const images = assets.filter((a) => a.type === 'image');
    const attachments = assets.filter((a) => a.type === 'attachment');

    return {
      total: assets.length,
      processed: assets.length,
      skipped: 0,
      errors: [],
      assets: assets.map((asset) => ({
        original: asset.originalPath,
        target: asset.targetPath,
        size: asset.size,
        base: asset.targetPath.replace(this.options.baseUrl ?? '', ''),
      })),
    };
  }

  /**
   * Check if file is an asset
   */
  private isAssetFile(file: TFile): boolean {
    const assetExtensions = [
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'svg',
      'bmp',
      'tiff',
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'rtf',
      'csv',
      'zip',
      'rar',
      '7z',
      'tar',
      'gz',
      'mp3',
      'wav',
      'flac',
      'aac',
      'mp4',
      'avi',
      'mov',
      'mkv',
      'wmv',
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

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + (sizes[i] ?? 'Bytes');
  }

  /**
   * Clean up unused assets in target directory
   */
  public async cleanupUnusedAssets(targetDir: string, usedAssets: AssetInfo[]): Promise<void> {
    const assetsDir = path.join(targetDir, 'assets');

    if (!(await fs.pathExists(assetsDir))) {
      return;
    }

    const usedPaths = new Set(usedAssets.map((a) => a.targetPath));
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
