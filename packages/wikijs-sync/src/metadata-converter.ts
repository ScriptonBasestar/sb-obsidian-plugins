import { TFile, FrontMatterCache, parseYaml, stringifyYaml } from 'obsidian';
import { MetadataMapping, WikiPage, CustomFieldMapping } from './types';

export class MetadataConverter {
  private mapping: MetadataMapping;

  constructor(mapping: MetadataMapping) {
    this.mapping = mapping;
  }

  /**
   * Convert Obsidian frontmatter to WikiJS metadata
   */
  obsidianToWiki(frontmatter: FrontMatterCache | undefined): {
    tags: string[];
    description?: string;
    customData: Record<string, any>;
  } {
    const result: {
      tags: string[];
      description?: string;
      customData: Record<string, any>;
    } = {
      tags: [],
      customData: {}
    };

    if (!frontmatter) {
      return result;
    }

    // Convert tags
    if (this.mapping.tags.enabled) {
      result.tags = this.extractTags(frontmatter);
    }

    // Convert description
    if (frontmatter.description) {
      result.description = String(frontmatter.description);
    } else if (frontmatter.summary) {
      result.description = String(frontmatter.summary);
    }

    // Convert custom fields
    for (const fieldMap of this.mapping.customFields) {
      const value = this.getNestedValue(frontmatter, fieldMap.obsidianField);
      if (value !== undefined) {
        const convertedValue = this.convertValue(value, fieldMap.type);
        this.setNestedValue(result.customData, fieldMap.wikiField, convertedValue);
      }
    }

    return result;
  }

  /**
   * Convert WikiJS metadata to Obsidian frontmatter
   */
  wikiToObsidian(wikiPage: WikiPage): Record<string, any> {
    const frontmatter: Record<string, any> = {};

    // Convert basic metadata
    frontmatter.title = wikiPage.title;
    frontmatter.created = this.formatDate(wikiPage.createdAt);
    frontmatter.updated = this.formatDate(wikiPage.updatedAt);

    // Convert tags
    if (this.mapping.tags.enabled && wikiPage.tags.length > 0) {
      const prefix = this.mapping.tags.prefix;
      frontmatter.tags = prefix 
        ? wikiPage.tags.map(tag => tag.startsWith(prefix) ? tag.slice(prefix.length) : tag)
        : wikiPage.tags;
    }

    // Convert description
    if (wikiPage.description) {
      frontmatter.description = wikiPage.description;
    }

    // Convert categories if enabled
    if (this.mapping.categories.enabled && wikiPage.tags.length > 0) {
      const categories = this.extractCategories(wikiPage.tags);
      if (categories.length > 0) {
        frontmatter[this.mapping.categories.fieldName] = categories;
      }
    }

    // Convert custom fields
    // Note: This would require additional data from WikiJS custom fields
    // which might need to be implemented in the API

    return frontmatter;
  }

  /**
   * Extract tags from Obsidian frontmatter
   */
  private extractTags(frontmatter: FrontMatterCache): string[] {
    const tags: string[] = [];

    // Get tags from 'tags' field
    if (frontmatter.tags) {
      if (Array.isArray(frontmatter.tags)) {
        tags.push(...frontmatter.tags.map(String));
      } else if (typeof frontmatter.tags === 'string') {
        tags.push(...frontmatter.tags.split(',').map(t => t.trim()));
      }
    }

    // Get tags from 'tag' field (singular)
    if (frontmatter.tag) {
      if (Array.isArray(frontmatter.tag)) {
        tags.push(...frontmatter.tag.map(String));
      } else {
        tags.push(String(frontmatter.tag));
      }
    }

    // Apply prefix if configured
    const prefix = this.mapping.tags.prefix;
    return prefix ? tags.map(tag => prefix + tag) : tags;
  }

  /**
   * Extract categories from WikiJS tags
   */
  private extractCategories(tags: string[]): string[] {
    // Assuming categories are tags with a specific prefix like 'category:'
    return tags
      .filter(tag => tag.startsWith('category:'))
      .map(tag => tag.replace('category:', ''));
  }

  /**
   * Convert value based on type
   */
  private convertValue(value: any, type: string): any {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
      case 'array':
        return Array.isArray(value) ? value : [value];
      default:
        return value;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Format date for frontmatter
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Merge frontmatter with existing content
   */
  mergeFrontmatter(content: string, frontmatter: Record<string, any>): string {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    let existingFrontmatter = {};
    let bodyContent = content;

    if (match) {
      // Parse existing frontmatter
      try {
        existingFrontmatter = parseYaml(match[1]) || {};
      } catch (e) {
        console.error('Failed to parse existing frontmatter:', e);
      }
      bodyContent = content.slice(match[0].length);
    }

    // Merge with new frontmatter
    const mergedFrontmatter = { ...existingFrontmatter, ...frontmatter };

    // Stringify and combine
    const yamlContent = stringifyYaml(mergedFrontmatter);
    return `---\n${yamlContent}---${bodyContent}`;
  }

  /**
   * Extract frontmatter from content
   */
  extractFrontmatter(content: string): { frontmatter: any; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (match) {
      try {
        const frontmatter = parseYaml(match[1]) || {};
        const body = content.slice(match[0].length).trim();
        return { frontmatter, body };
      } catch (e) {
        console.error('Failed to parse frontmatter:', e);
      }
    }

    return { frontmatter: {}, body: content };
  }

  /**
   * Update metadata mapping
   */
  updateMapping(mapping: MetadataMapping): void {
    this.mapping = mapping;
  }

  /**
   * Validate custom field mapping
   */
  validateFieldMapping(mapping: CustomFieldMapping): boolean {
    // Check if field paths are valid
    if (!mapping.obsidianField || !mapping.wikiField) {
      return false;
    }

    // Check if type is valid
    const validTypes = ['string', 'number', 'boolean', 'date', 'array'];
    if (!validTypes.includes(mapping.type)) {
      return false;
    }

    return true;
  }

  /**
   * Get timezone offset string
   */
  private getTimezoneOffset(): string {
    const offset = new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset <= 0 ? '+' : '-';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Handle date with timezone
   */
  handleDateWithTimezone(dateString: string): string {
    const date = new Date(dateString);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString();
  }
}