export interface FrontmatterData {
  [key: string]: string | number | boolean | string[] | FrontmatterData | null | undefined;
}

export interface ParsedContent {
  frontmatter: FrontmatterData | null;
  body: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface FieldRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'date';
  pattern?: string; // regex pattern
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  values?: string[]; // allowed values
}

export interface MetadataTemplate {
  name: string;
  description?: string;
  fields: Record<string, string | number | boolean | string[] | null>;
  rules?: FieldRule[];
}

export interface MetadataManagerSettings {
  enableAutoInsert: boolean;
  enableLinting: boolean;
  requiredFields: string[];
  fieldOrder: string[];
  defaultTemplate: string;
  customTemplates: MetadataTemplate[];
  lintRules: FieldRule[];
}

// Type guards
export function isFrontmatterData(value: unknown): value is FrontmatterData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
