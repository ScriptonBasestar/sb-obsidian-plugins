export interface BlogPlatformExportSettings {
  defaultPlatform: 'hugo' | 'jekyll' | 'wikijs';
  outputPath: string;
  profiles: ExportProfile[];
  assetHandling: AssetHandlingOptions;
  lastExport?: string;
}

export interface ExportProfile {
  id: string;
  name: string;
  platform: 'hugo' | 'jekyll' | 'wikijs';
  settings: PlatformSettings;
  pathMappings: PathMapping[];
  filters: ExportFilter;
  templates: TemplateSettings;
}

export interface PlatformSettings {
  hugo?: HugoSettings;
  jekyll?: JekyllSettings;
  wikijs?: WikiJSSettings;
}

export interface HugoSettings {
  contentDir: string;
  staticDir: string;
  frontmatterFormat: 'yaml' | 'toml' | 'json';
  sectionMapping: Record<string, string>;
  shortcodeMapping: Record<string, string>;
  taxonomies: TaxonomyMapping;
  archetypes: ArchetypeMapping;
}

export interface JekyllSettings {
  postsDir: string;
  draftsDir: string;
  collectionsDir: string;
  includesDir: string;
  dataDir: string;
  filenameFormat: string;
  categoryMapping: Record<string, string>;
  layoutMapping: Record<string, string>;
  permalinkStructure: string;
}

export interface WikiJSSettings {
  wikiUrl: string;
  apiKey: string;
  pathPrefix: string;
  locale: string;
  defaultEditor: 'markdown' | 'code';
  publishByDefault: boolean;
  tagPrefix: string;
}

export interface PathMapping {
  obsidianPath: string;
  targetPath: string;
  enabled: boolean;
  recursive: boolean;
}

export interface ExportFilter {
  includeFolders: string[];
  excludeFolders: string[];
  includeFiles: string[];
  excludeFiles: string[];
  includeTags: string[];
  excludeTags: string[];
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export interface TemplateSettings {
  frontmatterTemplate: string;
  contentTemplate: string;
  filenameTemplate: string;
  customTemplates: Record<string, string>;
}

export interface TaxonomyMapping {
  tags: {
    enabled: boolean;
    fieldName: string;
    transform?: 'lowercase' | 'uppercase' | 'capitalize';
  };
  categories: {
    enabled: boolean;
    fieldName: string;
    transform?: 'lowercase' | 'uppercase' | 'capitalize';
  };
  series: {
    enabled: boolean;
    fieldName: string;
  };
}

export interface ArchetypeMapping {
  default: string;
  posts: string;
  pages: string;
  custom: Record<string, string>;
}

export interface AssetHandlingOptions {
  copyImages: boolean;
  copyAttachments: boolean;
  optimizeImages: boolean;
  imageFormats: string[];
  maxImageSize: number;
  preserveStructure: boolean;
  baseUrl?: string;
}

export interface ConversionResult {
  success: boolean;
  processedFiles: number;
  skippedFiles: number;
  errors: ConversionError[];
  warnings: string[];
  outputPath: string;
  assets: AssetInfo[];
}

export interface ConversionError {
  file: string;
  error: string;
  line?: number;
}

export interface AssetInfo {
  originalPath: string;
  targetPath: string;
  size: number;
  type: 'image' | 'attachment';
}

export interface ParsedContent {
  frontmatter: Record<string, any>;
  content: string;
  links: LinkInfo[];
  images: ImageInfo[];
  attachments: AttachmentInfo[];
}

export interface LinkInfo {
  type: 'wikilink' | 'markdown' | 'external';
  original: string;
  target: string;
  alias?: string;
  position: {
    start: number;
    end: number;
  };
}

export interface ImageInfo {
  type: 'embedded' | 'linked';
  path: string;
  alt?: string;
  title?: string;
  position: {
    start: number;
    end: number;
  };
}

export interface AttachmentInfo {
  path: string;
  type: string;
  position: {
    start: number;
    end: number;
  };
}

export interface ExportJob {
  id: string;
  profile: ExportProfile;
  files: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  result?: ConversionResult;
}

export const DEFAULT_SETTINGS: BlogPlatformExportSettings = {
  defaultPlatform: 'hugo',
  outputPath: '',
  profiles: [],
  assetHandling: {
    copyImages: true,
    copyAttachments: true,
    optimizeImages: false,
    imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    maxImageSize: 2048,
    preserveStructure: true,
  },
};
