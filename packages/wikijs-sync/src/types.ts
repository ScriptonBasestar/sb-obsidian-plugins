export interface WikiJSSyncSettings {
  wikiUrl: string;
  apiKey: string;
  syncInterval: number;
  autoSync: boolean;
  syncDirection: 'bidirectional' | 'obsidian-to-wiki' | 'wiki-to-obsidian';
  conflictResolution?: 'local' | 'remote' | 'manual';
  pathMapping: PathMapping[];
  metadataMapping: MetadataMapping;
  excludedFolders: string[];
  excludedFiles: string[];
  lastSync: string;
}

export interface PathMapping {
  obsidianPath: string;
  wikiPath: string;
  enabled: boolean;
}

export interface MetadataMapping {
  tags: {
    enabled: boolean;
    prefix: string;
  };
  categories: {
    enabled: boolean;
    fieldName: string;
  };
  customFields: CustomFieldMapping[];
}

export interface CustomFieldMapping {
  obsidianField: string;
  wikiField: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface WikiPage {
  id: string;
  path: string;
  title: string;
  content: string;
  description?: string;
  tags: string[];
  isPublished: boolean;
  isPrivate: boolean;
  locale: string;
  createdAt: string;
  updatedAt: string;
  editor: string;
}

export interface WikiPageInput {
  path: string;
  title: string;
  content: string;
  description?: string;
  tags?: string[];
  isPublished?: boolean;
  isPrivate?: boolean;
  locale?: string;
  editor?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  synced: number;
  failed: number;
  conflicts: ConflictItem[];
  errors: string[];
}

export interface ConflictItem {
  path: string;
  type: 'content' | 'metadata' | 'both';
  localModified: string;
  remoteModified: string;
  resolution?: 'local' | 'remote' | 'manual';
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: any;
  }>;
}

export interface PageCreateResponse {
  pages: {
    create: {
      responseResult: ResponseResult;
      page?: WikiPage;
    };
  };
}

export interface PageUpdateResponse {
  pages: {
    update: {
      responseResult: ResponseResult;
      page?: WikiPage;
    };
  };
}

export interface PageQueryResponse {
  pages: {
    single?: WikiPage;
    list?: WikiPage[];
  };
}

export interface ResponseResult {
  succeeded: boolean;
  errorCode?: string;
  slug?: string;
  message?: string;
}

export const DEFAULT_SETTINGS: WikiJSSyncSettings = {
  wikiUrl: '',
  apiKey: '',
  syncInterval: 30,
  autoSync: false,
  syncDirection: 'bidirectional',
  pathMapping: [],
  metadataMapping: {
    tags: {
      enabled: true,
      prefix: ''
    },
    categories: {
      enabled: true,
      fieldName: 'categories'
    },
    customFields: []
  },
  excludedFolders: [
    '.obsidian',
    '.trash',
    'templates'
  ],
  excludedFiles: [],
  lastSync: ''
};