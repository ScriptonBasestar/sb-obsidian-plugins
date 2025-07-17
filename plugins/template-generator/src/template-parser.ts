export interface TemplateMetadata {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  variables?: string[];
  author?: string;
  version?: string;
  created?: string;
  modified?: string;
}

export interface ParsedTemplate {
  name: string;
  content: string;
  body: string;
  path: string;
  metadata: TemplateMetadata;
  variables: string[];
  isValid: boolean;
  errors: string[];
}

export class TemplateParser {
  private static readonly FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  private static readonly VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

  static parseTemplate(name: string, content: string, path: string): ParsedTemplate {
    const result: ParsedTemplate = {
      name,
      content,
      body: content,
      path,
      metadata: {},
      variables: [],
      isValid: true,
      errors: [],
    };

    try {
      // Parse frontmatter if exists
      const frontmatterMatch = content.match(this.FRONTMATTER_REGEX);
      if (frontmatterMatch) {
        const [, frontmatterContent, bodyContent] = frontmatterMatch;
        result.body = bodyContent.trim();
        result.metadata = this.parseFrontmatter(frontmatterContent);
      }

      // Extract template variables
      result.variables = this.extractVariables(result.body);

      // Validate template
      const validation = this.validateTemplate(result);
      result.isValid = validation.isValid;
      result.errors = validation.errors;

      return result;
    } catch (error) {
      result.isValid = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to parse template: ${errorMessage}`);
      return result;
    }
  }

  private static parseFrontmatter(frontmatterContent: string): TemplateMetadata {
    const metadata: TemplateMetadata = {};
    const lines = frontmatterContent.trim().split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        const trimmedValue = value.trim();

        switch (key.toLowerCase()) {
          case 'title':
            metadata.title = trimmedValue.replace(/['"]/g, '');
            break;
          case 'description':
            metadata.description = trimmedValue.replace(/['"]/g, '');
            break;
          case 'category':
            metadata.category = trimmedValue.replace(/['"]/g, '');
            break;
          case 'tags':
            metadata.tags = this.parseArrayValue(trimmedValue);
            break;
          case 'variables':
            metadata.variables = this.parseArrayValue(trimmedValue);
            break;
          case 'author':
            metadata.author = trimmedValue.replace(/['"]/g, '');
            break;
          case 'version':
            metadata.version = trimmedValue.replace(/['"]/g, '');
            break;
          case 'created':
            metadata.created = trimmedValue.replace(/['"]/g, '');
            break;
          case 'modified':
            metadata.modified = trimmedValue.replace(/['"]/g, '');
            break;
        }
      }
    }

    return metadata;
  }

  private static parseArrayValue(value: string): string[] {
    // Handle array syntax: [item1, item2] or ["item1", "item2"]
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      return arrayContent
        .split(',')
        .map((item) => item.trim().replace(/['"]/g, ''))
        .filter((item) => item.length > 0);
    }

    // Handle comma-separated values
    return value
      .split(',')
      .map((item) => item.trim().replace(/['"]/g, ''))
      .filter((item) => item.length > 0);
  }

  private static extractVariables(content: string): string[] {
    const variables = new Set<string>();
    let match;

    // Reset regex lastIndex
    this.VARIABLE_REGEX.lastIndex = 0;

    while ((match = this.VARIABLE_REGEX.exec(content)) !== null) {
      const variable = match[1].trim();
      if (variable) {
        variables.add(variable);
      }
    }

    return Array.from(variables).sort();
  }

  private static validateTemplate(template: ParsedTemplate): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for empty content
    if (!template.body || template.body.trim().length === 0) {
      errors.push('Template body is empty');
    }

    // Check for malformed variables
    const malformedVariables = this.findMalformedVariables(template.body);
    if (malformedVariables.length > 0) {
      errors.push(`Malformed variables found: ${malformedVariables.join(', ')}`);
    }

    // Check for undefined variables in frontmatter
    if (template.metadata.variables) {
      const undefinedVars = template.metadata.variables.filter(
        (v) => !template.variables.includes(v)
      );
      if (undefinedVars.length > 0) {
        errors.push(`Variables declared in frontmatter but not used: ${undefinedVars.join(', ')}`);
      }
    }

    // Check for very long variable names (potential issues)
    const longVariables = template.variables.filter((v) => v.length > 50);
    if (longVariables.length > 0) {
      errors.push(`Unusually long variable names found: ${longVariables.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static findMalformedVariables(content: string): string[] {
    const malformed: string[] = [];

    // Find unclosed variables like {{variable or variable}}
    const unclosedStart = content.match(/\{\{[^}]*$/gm);
    const unclosedEnd = content.match(/^[^{]*\}\}/gm);

    if (unclosedStart) {
      malformed.push(...unclosedStart);
    }

    if (unclosedEnd) {
      malformed.push(...unclosedEnd);
    }

    // Find empty variables {{}}
    const emptyVariables = content.match(/\{\{\s*\}\}/g);
    if (emptyVariables) {
      malformed.push(...emptyVariables);
    }

    return malformed;
  }

  static getTemplatePreview(template: ParsedTemplate): string {
    const maxLength = 150;
    let preview = template.body;

    // Remove frontmatter if present
    preview = preview.replace(/^---[\s\S]*?---\n/, '');

    // Replace variables with placeholder text
    preview = preview.replace(this.VARIABLE_REGEX, (match, variable) => {
      switch (variable.toLowerCase()) {
        case 'date':
        case 'today':
          return new Date().toLocaleDateString();
        case 'time':
          return new Date().toLocaleTimeString();
        case 'title':
          return '[Title]';
        case 'author':
          return '[Author]';
        default:
          return `[${variable}]`;
      }
    });

    // Truncate and clean up
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength) + '...';
    }

    return preview.trim();
  }
}
