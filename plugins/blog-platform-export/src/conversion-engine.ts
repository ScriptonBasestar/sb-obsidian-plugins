import { TFile, Vault } from 'obsidian';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import * as yaml from 'js-yaml';
import { ParsedContent, LinkInfo, ImageInfo, AttachmentInfo } from './types';

export class ConversionEngine {
  private vault: Vault;
  private processor: any;

  constructor(vault: Vault) {
    this.vault = vault;
    this.initializeProcessor();
  }

  private initializeProcessor() {
    this.processor = unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ['yaml', 'toml'])
      .use(remarkStringify, {
        bullet: '-',
        listItemIndent: 'one',
        emphasis: '*',
        strong: '*',
        rule: '-'
      });
  }

  /**
   * Parse an Obsidian file and extract all components
   */
  async parseFile(file: TFile): Promise<ParsedContent> {
    const content = await this.vault.read(file);
    const { frontmatter, body } = this.extractFrontmatter(content);
    
    return {
      frontmatter,
      content: body,
      links: this.extractLinks(body),
      images: this.extractImages(body),
      attachments: this.extractAttachments(body)
    };
  }

  /**
   * Extract YAML frontmatter from content
   */
  extractFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    try {
      const frontmatter = yaml.load(match[1]) as Record<string, any> || {};
      const body = content.slice(match[0].length);
      return { frontmatter, body };
    } catch (error) {
      console.warn('Failed to parse frontmatter:', error);
      return { frontmatter: {}, body: content };
    }
  }

  /**
   * Extract all links from content
   */
  extractLinks(content: string): LinkInfo[] {
    const links: LinkInfo[] = [];

    // Wiki links: [[link]] or [[link|alias]]
    const wikiLinkRegex = /\[\[([^\]]+?)\]\]/g;
    let match;
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const linkContent = match[1];
      const [target, alias] = linkContent.includes('|') 
        ? linkContent.split('|', 2)
        : [linkContent, undefined];

      links.push({
        type: 'wikilink',
        original: fullMatch,
        target: target.trim(),
        alias: alias?.trim(),
        position: {
          start: match.index,
          end: match.index + fullMatch.length
        }
      });
    }

    // Markdown links: [text](url)
    const mdLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = mdLinkRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const alias = match[1];
      const target = match[2];

      // Skip if it's an image (starts with !)
      if (content[match.index - 1] === '!') {
        continue;
      }

      links.push({
        type: target.startsWith('http') ? 'external' : 'markdown',
        original: fullMatch,
        target: target.trim(),
        alias: alias || undefined,
        position: {
          start: match.index,
          end: match.index + fullMatch.length
        }
      });
    }

    return links;
  }

  /**
   * Extract all images from content
   */
  extractImages(content: string): ImageInfo[] {
    const images: ImageInfo[] = [];

    // Embedded images: ![[image.png]]
    const embeddedImageRegex = /!\[\[([^\]]+?)\]\]/g;
    let match;
    while ((match = embeddedImageRegex.exec(content)) !== null) {
      images.push({
        type: 'embedded',
        path: match[1].trim(),
        position: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }

    // Markdown images: ![alt](path "title")
    const mdImageRegex = /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/g;
    while ((match = mdImageRegex.exec(content)) !== null) {
      images.push({
        type: 'linked',
        path: match[2].trim(),
        alt: match[1] || undefined,
        title: match[3] || undefined,
        position: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }

    return images;
  }

  /**
   * Extract attachments (non-image files)
   */
  extractAttachments(content: string): AttachmentInfo[] {
    const attachments: AttachmentInfo[] = [];
    
    // Embedded attachments: ![[file.pdf]]
    const attachmentRegex = /!\[\[([^\]]+?\.(pdf|doc|docx|txt|zip|rar|mp3|mp4|avi|mov))\]\]/gi;
    let match;
    while ((match = attachmentRegex.exec(content)) !== null) {
      attachments.push({
        path: match[1].trim(),
        type: match[2].toLowerCase(),
        position: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }

    return attachments;
  }

  /**
   * Convert Obsidian wikilinks to standard markdown links
   */
  convertWikiLinksToMarkdown(content: string, linkMapping: Map<string, string> = new Map()): string {
    return content.replace(/\[\[([^\]]+?)\]\]/g, (match, linkContent) => {
      const [target, alias] = linkContent.includes('|') 
        ? linkContent.split('|', 2)
        : [linkContent, linkContent];

      const cleanTarget = target.trim();
      const displayText = alias?.trim() || cleanTarget;
      
      // Use mapping if available, otherwise create a slug
      const mappedTarget = linkMapping.get(cleanTarget) || this.slugify(cleanTarget);
      
      return `[${displayText}](${mappedTarget})`;
    });
  }

  /**
   * Convert embedded images to standard markdown
   */
  convertEmbeddedImages(content: string, pathMapping: Map<string, string> = new Map()): string {
    return content.replace(/!\[\[([^\]]+?)\]\]/g, (match, imagePath) => {
      const cleanPath = imagePath.trim();
      const mappedPath = pathMapping.get(cleanPath) || cleanPath;
      
      // Extract filename for alt text
      const filename = cleanPath.split('/').pop()?.split('.')[0] || 'image';
      
      return `![${filename}](${mappedPath})`;
    });
  }

  /**
   * Process code blocks for platform compatibility
   */
  processCodeBlocks(content: string, platform: 'hugo' | 'jekyll' | 'wikijs'): string {
    // Handle math blocks
    content = content.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
      switch (platform) {
        case 'hugo':
          return `{{< math >}}\n${math.trim()}\n{{< /math >}}`;
        case 'jekyll':
          return `$$\n${math.trim()}\n$$`;
        case 'wikijs':
          return `$$\n${math.trim()}\n$$`;
        default:
          return match;
      }
    });

    // Handle inline math
    content = content.replace(/\$([^$]+)\$/g, (match, math) => {
      switch (platform) {
        case 'hugo':
          return `{{< math inline >}}${math.trim()}{{< /math >}}`;
        case 'jekyll':
          return `$${math.trim()}$`;
        case 'wikijs':
          return `$${math.trim()}$`;
        default:
          return match;
      }
    });

    return content;
  }

  /**
   * Clean content for blog platform export
   */
  cleanContent(content: string): string {
    // Remove Obsidian-specific syntax
    content = content.replace(/%%[^%]*%%/g, ''); // Comments
    content = content.replace(/\^[a-zA-Z0-9-_]+/g, ''); // Block references
    
    // Clean up multiple empty lines
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    return content.trim();
  }

  /**
   * Generate slug from text
   */
  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Validate content structure
   */
  validateContent(content: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for unresolved wikilinks
    const unresolvedLinks = content.match(/\[\[([^\]]+?)\]\]/g);
    if (unresolvedLinks) {
      warnings.push(`Found ${unresolvedLinks.length} unresolved wikilinks`);
    }

    // Check for embedded files
    const embeddedFiles = content.match(/!\[\[([^\]]+?)\]\]/g);
    if (embeddedFiles) {
      warnings.push(`Found ${embeddedFiles.length} embedded files that may need path updates`);
    }

    // Check for Obsidian-specific syntax
    if (content.includes('%%')) {
      warnings.push('Found Obsidian comments that will be removed');
    }

    if (content.match(/\^[a-zA-Z0-9-_]+/)) {
      warnings.push('Found block references that will be removed');
    }

    return {
      valid: true,
      warnings
    };
  }

  /**
   * Extract headings for navigation/TOC
   */
  extractHeadings(content: string): Array<{ level: number; text: string; anchor: string }> {
    const headings: Array<{ level: number; text: string; anchor: string }> = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const anchor = this.slugify(text);
      
      headings.push({ level, text, anchor });
    }

    return headings;
  }
}