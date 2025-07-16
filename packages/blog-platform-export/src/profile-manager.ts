import { App } from 'obsidian';
import { BlogPlatformExportSettings, ExportProfile, DEFAULT_SETTINGS } from './types';

export class ProfileManager {
  private app: App;
  private settings: BlogPlatformExportSettings;

  constructor(app: App, settings: BlogPlatformExportSettings) {
    this.app = app;
    this.settings = settings;
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): ExportProfile[] {
    return this.settings.profiles;
  }

  /**
   * Get profile by ID
   */
  getProfile(id: string): ExportProfile | undefined {
    return this.settings.profiles.find(p => p.id === id);
  }

  /**
   * Get default profile
   */
  getDefaultProfile(): ExportProfile | undefined {
    const defaultPlatform = this.settings.defaultPlatform;
    return this.settings.profiles.find(p => p.platform === defaultPlatform) || 
           this.settings.profiles[0];
  }

  /**
   * Create new profile
   */
  createProfile(profile: Omit<ExportProfile, 'id'>): ExportProfile {
    const newProfile: ExportProfile = {
      ...profile,
      id: this.generateProfileId()
    };
    
    this.settings.profiles.push(newProfile);
    return newProfile;
  }

  /**
   * Update existing profile
   */
  updateProfile(id: string, updates: Partial<ExportProfile>): boolean {
    const index = this.settings.profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      this.settings.profiles[index] = { ...this.settings.profiles[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * Delete profile
   */
  deleteProfile(id: string): boolean {
    const index = this.settings.profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      this.settings.profiles.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get output path
   */
  getOutputPath(): string {
    return this.settings.outputPath;
  }

  /**
   * Set output path
   */
  setOutputPath(path: string): void {
    this.settings.outputPath = path;
  }

  /**
   * Generate unique profile ID
   */
  private generateProfileId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create default profiles
   */
  createDefaultProfiles(): ExportProfile[] {
    const defaults: Omit<ExportProfile, 'id'>[] = [
      {
        name: 'Hugo Blog',
        platform: 'hugo',
        settings: {
          hugo: {
            contentDir: 'content',
            staticDir: 'static',
            frontmatterFormat: 'yaml',
            sectionMapping: {},
            shortcodeMapping: {},
            taxonomies: {
              tags: { enabled: true, fieldName: 'tags' },
              categories: { enabled: true, fieldName: 'categories' },
              series: { enabled: false, fieldName: 'series' }
            },
            archetypes: {
              default: 'default',
              posts: 'posts', 
              pages: 'pages',
              custom: {}
            }
          }
        },
        pathMappings: [],
        filters: {
          includeFolders: [],
          excludeFolders: ['.obsidian', '.trash'],
          includeFiles: [],
          excludeFiles: [],
          includeTags: [],
          excludeTags: []
        },
        templates: {
          frontmatterTemplate: '',
          contentTemplate: '',
          filenameTemplate: '',
          customTemplates: {}
        }
      },
      {
        name: 'Jekyll Blog',
        platform: 'jekyll',
        settings: {
          jekyll: {
            postsDir: '_posts',
            draftsDir: '_drafts',
            collectionsDir: '_collections',
            includesDir: '_includes',
            dataDir: '_data',
            filenameFormat: 'YYYY-MM-DD-title.md',
            categoryMapping: {},
            layoutMapping: {},
            permalinkStructure: '/:categories/:year/:month/:day/:title/'
          }
        },
        pathMappings: [],
        filters: {
          includeFolders: [],
          excludeFolders: ['.obsidian', '.trash'],
          includeFiles: [],
          excludeFiles: [],
          includeTags: [],
          excludeTags: []
        },
        templates: {
          frontmatterTemplate: '',
          contentTemplate: '',
          filenameTemplate: '',
          customTemplates: {}
        }
      }
    ];

    return defaults.map(profile => this.createProfile(profile));
  }
}