import { App, TFile } from 'obsidian';
import { HugoExporter } from './platforms/hugo-exporter';
import { JekyllExporter } from './platforms/jekyll-exporter';
import { WikiJSExporter } from './platforms/wikijs-exporter';
import { ProfileManager } from './profile-manager';
import { ExportProfile, ConversionResult, ExportJob } from './types';

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
  async exportFiles(files: TFile[], profile: ExportProfile): Promise<ConversionResult> {
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
  async exportFilesWithProgress(
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
  async previewExport(files: TFile[], profile: ExportProfile): Promise<any> {
    // For preview, we'll process one file to show the transformation
    if (files.length === 0) {
      return { preview: 'No files to preview' };
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
        throw new Error(`Unsupported platform: ${profile.platform}`);
    }
  }

  /**
   * Cancel an active export job
   */
  cancelJob(jobId: string): boolean {
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
  getActiveJobs(): ExportJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ExportJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Create appropriate exporter for the platform
   */
  private createExporter(profile: ExportProfile) {
    switch (profile.platform) {
      case 'hugo':
        return new HugoExporter(this.app.vault, profile);
      case 'jekyll':
        return new JekyllExporter(this.app.vault, profile);
      case 'wikijs':
        return new WikiJSExporter(this.app.vault, profile);
      default:
        throw new Error(`Unsupported platform: ${profile.platform}`);
    }
  }

  /**
   * Get output path for the profile
   */
  private getOutputPath(profile: ExportProfile): string {
    // For WikiJS, this isn't used as it exports directly to the API
    if (profile.platform === 'wikijs') {
      return profile.settings.wikijs?.wikiUrl || '';
    }

    // For file-based exports (Hugo, Jekyll), use the configured output path
    return this.profileManager.getOutputPath() || '';
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
    return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Preview Hugo export
   */
  private async previewHugoExport(file: TFile, profile: ExportProfile): Promise<any> {
    const exporter = new HugoExporter(this.app.vault, profile);
    const parsed = await exporter['conversionEngine'].parseFile(file);

    // Get Hugo frontmatter preview
    const hugoFrontmatter = exporter['convertFrontmatter'](file, parsed.frontmatter);

    // Get processed content preview (first 500 chars)
    let content = parsed.content;
    content = exporter['convertWikiLinks'](content);
    content = exporter['convertImages'](content);
    content = content.substring(0, 500) + (content.length > 500 ? '...' : '');

    return {
      platform: 'Hugo',
      frontmatter: hugoFrontmatter,
      contentPreview: content,
      targetPath: exporter['getTargetPath'](file, '/preview'),
    };
  }

  /**
   * Preview Jekyll export
   */
  private async previewJekyllExport(file: TFile, profile: ExportProfile): Promise<any> {
    const exporter = new JekyllExporter(this.app.vault, profile);
    const parsed = await exporter['conversionEngine'].parseFile(file);

    // Get Jekyll frontmatter preview
    const jekyllFrontmatter = exporter['convertFrontmatter'](file, parsed.frontmatter);

    // Get processed content preview
    let content = parsed.content;
    content = exporter['convertWikiLinks'](content);
    content = exporter['convertImages'](content);
    content = content.substring(0, 500) + (content.length > 500 ? '...' : '');

    return {
      platform: 'Jekyll',
      frontmatter: jekyllFrontmatter,
      contentPreview: content,
      targetPath: exporter['getTargetPath'](file, '/preview', parsed.frontmatter),
    };
  }

  /**
   * Preview WikiJS export
   */
  private async previewWikiJSExport(file: TFile, profile: ExportProfile): Promise<any> {
    const exporter = new WikiJSExporter(this.app.vault, profile);
    const parsed = await exporter['conversionEngine'].parseFile(file);

    // Get WikiJS page data preview
    const wikiPageData = await exporter['convertToWikiJS'](file, parsed);

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
    };
  }

  /**
   * Validate export settings
   */
  async validateExportSettings(
    profile: ExportProfile
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      switch (profile.platform) {
        case 'wikijs':
          const wikiExporter = new WikiJSExporter(this.app.vault, profile);
          const connected = await wikiExporter.testConnection();
          if (!connected) {
            errors.push('Cannot connect to WikiJS instance');
          }
          break;
        case 'hugo':
        case 'jekyll':
          const outputPath = this.getOutputPath(profile);
          if (!outputPath) {
            errors.push('Output path is not configured');
          }
          break;
      }
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get export statistics
   */
  getExportStats(): any {
    const jobs = Array.from(this.activeJobs.values());

    return {
      totalJobs: jobs.length,
      runningJobs: jobs.filter((j) => j.status === 'running').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
    };
  }
}
