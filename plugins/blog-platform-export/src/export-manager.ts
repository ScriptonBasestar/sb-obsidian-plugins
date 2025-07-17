import { App, TFile } from 'obsidian';

import { HugoExporter } from './platforms/hugo-exporter';
import { JekyllExporter } from './platforms/jekyll-exporter';
import { WikiJSExporter } from './platforms/wikijs-exporter';
import { ProfileManager } from './profile-manager';
import { ExportProfile, ConversionResult, ExportJob, ParsedContent } from './types';

// Type definition for WikiJS conversion result
interface WikiJSPageData {
  path: string;
  title: string;
  description: string;
  tags: string[];
  locale: string;
  editor: string;
  content: string;
}

// Type definitions for preview results
interface ExportPreviewResult {
  platform: string;
  preview?: string;
  contentPreview: string;
  targetPath: string;
  frontmatter?: Record<string, unknown>;
  pageData?: {
    path: string;
    title: string;
    description: string;
    tags: string[];
    locale: string;
    editor: string;
  };
}

interface HugoPreviewResult {
  platform: string;
  frontmatter: Record<string, unknown>;
  contentPreview: string;
  targetPath: string;
}

interface JekyllPreviewResult {
  platform: string;
  frontmatter: Record<string, unknown>;
  contentPreview: string;
  targetPath: string;
}

interface WikiJSPreviewResult {
  platform: string;
  pageData: {
    path: string;
    title: string;
    description: string;
    tags: string[];
    locale: string;
    editor: string;
  };
  contentPreview: string;
  targetPath: string;
}

interface ExportStatistics {
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
}


export class ExportManager {
  private app: App;
  private profileManager: ProfileManager;
  private activeJobs: Map<string, ExportJob> = new Map();

  constructor(app: App, profileManager: ProfileManager) {
    this.app = app;
    this.profileManager = profileManager;
  }

  /**
   * Export files using the specified profile
   */
  public async exportFiles(files: TFile[], profile: ExportProfile): Promise<ConversionResult> {
    const job = this.createJob(files, profile);
    this.activeJobs.set(job.id, job);

    try {
      job.status = 'running';
      job.startTime = new Date();

      const exporter = this.createExporter(profile);
      const result = await exporter.exportFiles(files, this.getOutputPath(profile));

      job.status = result.success ? 'completed' : 'failed';
      job.endTime = new Date();
      job.result = result;
      job.progress = 100;

      return result;
    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.result = {
        success: false,
        processedFiles: 0,
        skippedFiles: 0,
        errors: [
          { file: 'general', error: error instanceof Error ? error.message : String(error) },
        ],
        warnings: [],
        outputPath: this.getOutputPath(profile),
        assets: [],
      };

      throw error;
    } finally {
      // Keep job in history for a while
      setTimeout(() => {
        this.activeJobs.delete(job.id);
      }, 30000); // Remove after 30 seconds
    }
  }

  /**
   * Export files with progress tracking
   */
  public async exportFilesWithProgress(
    files: TFile[],
    profile: ExportProfile,
    onProgress?: (job: ExportJob) => void
  ): Promise<ConversionResult> {
    const job = this.createJob(files, profile);
    this.activeJobs.set(job.id, job);

    try {
      job.status = 'running';
      job.startTime = new Date();

      const exporter = this.createExporter(profile);

      // For now, we'll simulate progress
      // In a real implementation, the exporters would support progress callbacks
      const progressInterval = setInterval(() => {
        if (job.status === 'running') {
          job.progress = Math.min(job.progress + 10, 90);
          onProgress?.(job);
        }
      }, 500);

      const result = await exporter.exportFiles(files, this.getOutputPath(profile));

      clearInterval(progressInterval);

      job.status = result.success ? 'completed' : 'failed';
      job.endTime = new Date();
      job.result = result;
      job.progress = 100;

      onProgress?.(job);

      return result;
    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.result = {
        success: false,
        processedFiles: 0,
        skippedFiles: 0,
        errors: [
          { file: 'general', error: error instanceof Error ? error.message : String(error) },
        ],
        warnings: [],
        outputPath: this.getOutputPath(profile),
        assets: [],
      };

      onProgress?.(job);
      throw error;
    }
  }

  /**
   * Preview export without actually exporting
   */
  public async previewExport(files: TFile[], profile: ExportProfile): Promise<ExportPreviewResult> {
    // For preview, we'll process one file to show the transformation
    if (files.length === 0) {
      return { 
        platform: 'none', 
        preview: 'No files to preview',
        contentPreview: '',
        targetPath: ''
      };
    }

    const file = files[0];

    switch (profile.platform) {
      case 'hugo':
        return await this.previewHugoExport(file, profile);
      case 'jekyll':
        return await this.previewJekyllExport(file, profile);
      case 'wikijs':
        return await this.previewWikiJSExport(file, profile);
      default:
        throw new Error(`Unsupported platform: ${profile.platform as string}`);
    }
  }

  /**
   * Cancel an active export job
   */
  public cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'failed';
      job.endTime = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get active export jobs
   */
  public getActiveJobs(): ExportJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get job by ID
   */
  public getJob(jobId: string): ExportJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Create appropriate exporter for the platform
   */
  private createExporter(profile: ExportProfile): HugoExporter | JekyllExporter | WikiJSExporter {
    switch (profile.platform) {
      case 'hugo':
        return new HugoExporter(this.app.vault, profile);
      case 'jekyll':
        return new JekyllExporter(this.app.vault, profile);
      case 'wikijs':
        return new WikiJSExporter(this.app.vault, profile);
      default:
        throw new Error(`Unsupported platform: ${profile.platform as string}`);
    }
  }

  /**
   * Get output path for the profile
   */
  private getOutputPath(profile: ExportProfile): string {
    // For WikiJS, this isn't used as it exports directly to the API
    if (profile.platform === 'wikijs') {
      return profile.settings.wikijs?.wikiUrl ?? '';
    }

    // For file-based exports (Hugo, Jekyll), use the configured output path
    return this.profileManager.getOutputPath() ?? '';
  }

  /**
   * Create a new export job
   */
  private createJob(files: TFile[], profile: ExportProfile): ExportJob {
    return {
      id: this.generateJobId(),
      profile,
      files: files.map((f) => f.path),
      status: 'pending',
      progress: 0,
    };
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `export-${Date.now()}-${randomStr}`;
  }

  /**
   * Preview Hugo export
   */
  private async previewHugoExport(file: TFile, profile: ExportProfile): Promise<HugoPreviewResult> {
    const exporter = new HugoExporter(this.app.vault, profile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const parsed = await (exporter as any).conversionEngine.parseFile(file) as ParsedContent;

    // Get Hugo frontmatter preview
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const hugoFrontmatter = (exporter as any).convertFrontmatter(file, parsed.frontmatter) as Record<string, unknown>;

    // Get processed content preview (first 500 chars)
    let content: string = parsed.content;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    content = (exporter as any).convertWikiLinks(content) as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    content = (exporter as any).convertImages(content) as string;
    content = content.substring(0, 500) + (content.length > 500 ? '...' : '');

    return {
      platform: 'Hugo',
      frontmatter: hugoFrontmatter,
      contentPreview: content,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      targetPath: (exporter as any).getTargetPath(file, '/preview') as string,
    };
  }

  /**
   * Preview Jekyll export
   */
  private async previewJekyllExport(file: TFile, profile: ExportProfile): Promise<JekyllPreviewResult> {
    const exporter = new JekyllExporter(this.app.vault, profile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const parsed = await (exporter as any).conversionEngine.parseFile(file) as ParsedContent;

    // Get Jekyll frontmatter preview
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const jekyllFrontmatter = (exporter as any).convertFrontmatter(file, parsed.frontmatter) as Record<string, unknown>;

    // Get processed content preview
    let content: string = parsed.content;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    content = (exporter as any).convertWikiLinks(content) as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    content = (exporter as any).convertImages(content) as string;
    content = content.substring(0, 500) + (content.length > 500 ? '...' : '');

    return {
      platform: 'Jekyll',
      frontmatter: jekyllFrontmatter,
      contentPreview: content,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      targetPath: (exporter as any).getTargetPath(file, '/preview', parsed.frontmatter) as string,
    };
  }

  /**
   * Preview WikiJS export
   */
  private async previewWikiJSExport(file: TFile, profile: ExportProfile): Promise<WikiJSPreviewResult> {
    const exporter = new WikiJSExporter(this.app.vault, profile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const parsed = await (exporter as any).conversionEngine.parseFile(file) as ParsedContent;

    // Get WikiJS page data preview
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const wikiPageData = await (exporter as any).convertToWikiJS(file, parsed) as WikiJSPageData;
    
    if (wikiPageData === null || wikiPageData === undefined) {
      throw new Error('WikiJS conversion failed');
    }

    return {
      platform: 'WikiJS',
      pageData: {
        path: wikiPageData.path,
        title: wikiPageData.title,
        description: wikiPageData.description,
        tags: wikiPageData.tags,
        locale: wikiPageData.locale,
        editor: wikiPageData.editor,
      },
      contentPreview:
        wikiPageData.content.substring(0, 500) + (wikiPageData.content.length > 500 ? '...' : ''),
      targetPath: wikiPageData.path,
    };
  }

  /**
   * Validate export settings
   */
  public async validateExportSettings(
    profile: ExportProfile
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      switch (profile.platform) {
        case 'wikijs': {
          const wikiExporter = new WikiJSExporter(this.app.vault, profile);
          const connected = await wikiExporter.testConnection();
          if (!connected) {
            errors.push('Cannot connect to WikiJS instance');
          }
          break;
        }
        case 'hugo':
        case 'jekyll': {
          const outputPath = this.getOutputPath(profile);
          if (!outputPath) {
            errors.push('Output path is not configured');
          }
          break;
        }
      }
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get export statistics
   */
  public getExportStats(): ExportStatistics {
    const jobs = Array.from(this.activeJobs.values());

    return {
      totalJobs: jobs.length,
      runningJobs: jobs.filter((j) => j.status === 'running').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
    };
  }
}
