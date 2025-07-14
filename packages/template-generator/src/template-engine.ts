import * as Handlebars from 'handlebars';
import { ParsedTemplate } from './template-parser';

export interface TemplateVariables {
  [key: string]: any;
}

export interface TemplateContext {
  // Built-in variables
  date: string;
  time: string;
  datetime: string;
  today: string;
  tomorrow: string;
  yesterday: string;
  
  // User-provided variables
  title?: string;
  author?: string;
  
  // Custom variables
  [key: string]: any;
}

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Date formatting helpers
    this.handlebars.registerHelper('formatDate', (date: Date | string, format: string) => {
      let dateObj: Date;
      if (!date) {
        dateObj = new Date();
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        dateObj = date;
      }
      
      switch (format) {
        case 'YYYY-MM-DD':
          return dateObj.toISOString().split('T')[0];
        case 'MM/DD/YYYY':
          return dateObj.toLocaleDateString('en-US');
        case 'DD/MM/YYYY':
          return dateObj.toLocaleDateString('en-GB');
        case 'MMMM DD, YYYY':
          return dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        default:
          return dateObj.toLocaleDateString();
      }
    });

    // Time formatting helpers
    this.handlebars.registerHelper('formatTime', (date: Date | string, format: string) => {
      let dateObj: Date;
      if (!date) {
        dateObj = new Date();
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        dateObj = date;
      }
      
      switch (format) {
        case '24':
          return dateObj.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        case '12':
          return dateObj.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          });
        default:
          return dateObj.toLocaleTimeString();
      }
    });

    // String manipulation helpers
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    this.handlebars.registerHelper('capitalize', (str: string) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    });

    // Conditional helpers
    this.handlebars.registerHelper('if_eq', function(a: any, b: any, options: any) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Math helpers
    this.handlebars.registerHelper('add', (a: number, b: number) => {
      return (a || 0) + (b || 0);
    });

    this.handlebars.registerHelper('subtract', (a: number, b: number) => {
      return (a || 0) - (b || 0);
    });
  }

  private getDefaultContext(): TemplateContext {
    const now = new Date();
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      datetime: now.toISOString(),
      today: today.toISOString().split('T')[0],
      tomorrow: tomorrow.toISOString().split('T')[0],
      yesterday: yesterday.toISOString().split('T')[0],
    };
  }

  renderTemplate(template: ParsedTemplate, userVariables?: TemplateVariables): string {
    try {
      // Combine default context with user variables
      const context: TemplateContext = {
        ...this.getDefaultContext(),
        ...userVariables,
      };

      // Compile and render template
      const compiledTemplate = this.handlebars.compile(template.content);
      return compiledTemplate(context);
    } catch (error) {
      console.error('Template rendering error:', error);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  renderTemplateString(templateString: string, userVariables?: TemplateVariables): string {
    try {
      const context: TemplateContext = {
        ...this.getDefaultContext(),
        ...userVariables,
      };

      const compiledTemplate = this.handlebars.compile(templateString);
      return compiledTemplate(context);
    } catch (error) {
      console.error('Template string rendering error:', error);
      throw new Error(`Failed to render template string: ${error.message}`);
    }
  }

  previewTemplate(template: ParsedTemplate, userVariables?: TemplateVariables): string {
    try {
      // Use sample data for preview
      const previewContext: TemplateContext = {
        ...this.getDefaultContext(),
        title: '[Title]',
        author: '[Author]',
        ...userVariables,
      };

      // Render only the body part for preview
      const compiledTemplate = this.handlebars.compile(template.body);
      let preview = compiledTemplate(previewContext);

      // Truncate preview
      const maxLength = 150;
      if (preview.length > maxLength) {
        preview = preview.substring(0, maxLength) + '...';
      }

      return preview.trim();
    } catch (error) {
      console.error('Template preview error:', error);
      // Fallback to original content
      return template.body.substring(0, 150) + (template.body.length > 150 ? '...' : '');
    }
  }

  validateTemplate(templateString: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Try to compile the template
      this.handlebars.compile(templateString);
    } catch (error) {
      errors.push(`Handlebars syntax error: ${error.message}`);
    }

    // Check for common issues
    const openBraces = (templateString.match(/\{\{/g) || []).length;
    const closeBraces = (templateString.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Mismatched template braces {{ }}');
    }

    // Check for potentially problematic patterns
    const tripleBeaces = templateString.match(/\{\{\{[^}]*\}\}\}/g);
    if (tripleBeaces && tripleBeaces.length > 0) {
      errors.push('Triple braces {{{ }}} found - use with caution for unescaped HTML');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getAvailableVariables(): string[] {
    return [
      'date',
      'time', 
      'datetime',
      'today',
      'tomorrow',
      'yesterday',
      'title',
      'author',
    ];
  }

  getAvailableHelpers(): string[] {
    return [
      'formatDate',
      'formatTime',
      'uppercase',
      'lowercase', 
      'capitalize',
      'if_eq',
      'add',
      'subtract',
    ];
  }
}