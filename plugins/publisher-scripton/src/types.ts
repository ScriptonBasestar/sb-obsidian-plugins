export interface PublishOptions {
  draft?: boolean;
  tags?: string[];
  category?: string;
  series?: string;
  overwrite?: boolean;
}

export interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
  details?: {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface ScriptonApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ScriptonPost {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  category?: string;
  series?: string;
  draft: boolean;
  author?: string;
  attachments?: string[];
}

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface PublisherScriptonSettings {
  // API settings
  apiKey: string;
  apiEndpoint: string;

  // Publishing settings
  enablePublishing: boolean;
  defaultVisibility: 'public' | 'private' | 'unlisted';
  includeAttachments: boolean;
  preserveLinks: boolean;

  // Content processing
  stripFrontmatter: boolean;
  convertWikiLinks: boolean;
  customCssStyles: string;

  // Auto-publishing
  enableAutoPublish: boolean;
  autoPublishFolders: string[];
  autoPublishTags: string[];

  // Retry settings
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;

  // Log settings
  enableDetailedLogs: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

// Type guards
export function isScriptonApiResponse(value: unknown): value is ScriptonApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as any).success === 'boolean'
  );
}

export function isScriptonPost(value: unknown): value is ScriptonPost {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'content' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).title === 'string' &&
    typeof (value as any).content === 'string'
  );
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'Unknown error occurred';
}