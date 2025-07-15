export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables?: string[];
}

export interface PromptVariables {
  files: {
    staged: string[];
    unstaged: string[];
    untracked: string[];
    total: number;
  };
  branch: string;
  diff?: string;
  recentCommits?: string[];
  timestamp: string;
  author?: string;
}

export class PromptTemplateService {
  private static readonly DEFAULT_TEMPLATES: PromptTemplate[] = [
    {
      id: 'conventional',
      name: 'Conventional Commits',
      description: 'Standard conventional commits format with type(scope): description',
      template: `Generate a conventional commit message for these changes:

{{#if files.staged}}
Staged files ({{files.staged.length}}): {{files.staged}}
{{/if}}
{{#if files.unstaged}}
Modified files ({{files.unstaged.length}}): {{files.unstaged}}
{{/if}}
{{#if files.untracked}}
New files ({{files.untracked.length}}): {{files.untracked}}
{{/if}}

Branch: {{branch}}
{{#if recentCommits}}
Recent commits:
{{recentCommits}}
{{/if}}

Requirements:
- Use conventional commits format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Keep subject line under 50 characters
- Use lowercase after colon
- Be concise and descriptive`,
      variables: ['files', 'branch', 'recentCommits'],
    },
    {
      id: 'detailed',
      name: 'Detailed Description',
      description: 'More detailed commit messages with body text',
      template: `Generate a detailed commit message for these changes:

Files changed ({{files.total}} total):
{{#if files.staged}}
Staged: {{files.staged}}
{{/if}}
{{#if files.unstaged}}
Modified: {{files.unstaged}}
{{/if}}
{{#if files.untracked}}
New: {{files.untracked}}
{{/if}}

Branch: {{branch}}
{{#if diff}}
Code changes preview:
{{diff}}
{{/if}}

Please provide:
1. A concise subject line (under 50 chars)
2. A detailed body explaining what and why
3. Use conventional commits format
4. Include any breaking changes if applicable`,
      variables: ['files', 'branch', 'diff'],
    },
    {
      id: 'korean',
      name: '한국어 커밋 메시지',
      description: '한국어로 작성된 커밋 메시지 템플릿',
      template: `다음 변경사항에 대한 커밋 메시지를 한국어로 생성해주세요:

변경된 파일 (총 {{files.total}}개):
{{#if files.staged}}
스테이징됨: {{files.staged}}
{{/if}}
{{#if files.unstaged}}
수정됨: {{files.unstaged}}
{{/if}}
{{#if files.untracked}}
새 파일: {{files.untracked}}
{{/if}}

브랜치: {{branch}}
시간: {{timestamp}}

요구사항:
- conventional commits 형식 사용 (영어 type, 한국어 설명)
- 예: feat: 새로운 기능 추가, fix: 버그 수정, docs: 문서 업데이트
- 제목은 50자 이내로 간결하게
- 명확하고 이해하기 쉽게 작성`,
      variables: ['files', 'branch', 'timestamp'],
    },
    {
      id: 'simple',
      name: 'Simple & Clean',
      description: 'Minimalist commit messages focusing on the core change',
      template: `Create a simple, clean commit message for:

{{#if files.total}}
{{files.total}} files changed
{{/if}}
Branch: {{branch}}

Focus on the main purpose of these changes.
Use conventional commits format but keep it minimal and clear.
One line preferred, maximum 50 characters.`,
      variables: ['files', 'branch'],
    },
    {
      id: 'team',
      name: 'Team Collaboration',
      description: 'Commit messages optimized for team collaboration',
      template: `Generate a team-friendly commit message:

Changes summary:
{{#if files.staged}}
- Staged: {{files.staged}}
{{/if}}
{{#if files.unstaged}}
- Modified: {{files.unstaged}}
{{/if}}
{{#if files.untracked}}
- Added: {{files.untracked}}
{{/if}}

Branch: {{branch}}
{{#if recentCommits}}
Context from recent commits:
{{recentCommits}}
{{/if}}

Requirements:
- Clear subject line for quick scanning
- Mention any breaking changes
- Include relevant scope/module
- Use conventional commits format
- Consider impact on team members`,
      variables: ['files', 'branch', 'recentCommits'],
    },
  ];

  /**
   * Get all available prompt templates
   */
  static getDefaultTemplates(): PromptTemplate[] {
    return [...this.DEFAULT_TEMPLATES];
  }

  /**
   * Get a specific template by ID
   */
  static getTemplate(id: string): PromptTemplate | undefined {
    return this.DEFAULT_TEMPLATES.find((template) => template.id === id);
  }

  /**
   * Process template with variables
   */
  static processTemplate(template: string, variables: PromptVariables): string {
    let processed = template;

    // Replace simple variables
    processed = processed.replace(/\{\{files\.total\}\}/g, variables.files.total.toString());
    processed = processed.replace(/\{\{branch\}\}/g, variables.branch);
    processed = processed.replace(/\{\{timestamp\}\}/g, variables.timestamp);

    if (variables.author) {
      processed = processed.replace(/\{\{author\}\}/g, variables.author);
    }

    // Replace array variables
    processed = processed.replace(
      /\{\{files\.staged\}\}/g,
      variables.files.staged.length > 0
        ? variables.files.staged.slice(0, 5).join(', ') +
            (variables.files.staged.length > 5
              ? ` and ${variables.files.staged.length - 5} more`
              : '')
        : '(none)'
    );

    processed = processed.replace(
      /\{\{files\.unstaged\}\}/g,
      variables.files.unstaged.length > 0
        ? variables.files.unstaged.slice(0, 5).join(', ') +
            (variables.files.unstaged.length > 5
              ? ` and ${variables.files.unstaged.length - 5} more`
              : '')
        : '(none)'
    );

    processed = processed.replace(
      /\{\{files\.untracked\}\}/g,
      variables.files.untracked.length > 0
        ? variables.files.untracked.slice(0, 5).join(', ') +
            (variables.files.untracked.length > 5
              ? ` and ${variables.files.untracked.length - 5} more`
              : '')
        : '(none)'
    );

    // Handle conditional blocks
    processed = this.processConditionalBlocks(processed, variables);

    // Replace diff (truncated)
    if (variables.diff) {
      const truncatedDiff =
        variables.diff.length > 800 ? variables.diff.substring(0, 800) + '...' : variables.diff;
      processed = processed.replace(/\{\{diff\}\}/g, truncatedDiff);
    } else {
      processed = processed.replace(/\{\{diff\}\}/g, '(no diff available)');
    }

    // Replace recent commits
    if (variables.recentCommits && variables.recentCommits.length > 0) {
      processed = processed.replace(
        /\{\{recentCommits\}\}/g,
        variables.recentCommits.slice(0, 3).join('\n')
      );
    } else {
      processed = processed.replace(/\{\{recentCommits\}\}/g, '(no recent commits)');
    }

    // Replace author (optional)
    if (variables.author) {
      processed = processed.replace(/\{\{author\}\}/g, variables.author);
    } else {
      processed = processed.replace(/\{\{author\}\}/g, '');
    }

    return processed.trim();
  }

  /**
   * Process conditional blocks like {{#if condition}}...{{/if}}
   */
  private static processConditionalBlocks(template: string, variables: PromptVariables): string {
    let processed = template;

    // Process {{#if files.staged}}...{{/if}}
    processed = processed.replace(
      /\{\{#if files\.staged\}\}([\s\S]*?)\{\{\/if\}\}/g,
      variables.files.staged.length > 0 ? '$1' : ''
    );

    // Process {{#if files.unstaged}}...{{/if}}
    processed = processed.replace(
      /\{\{#if files\.unstaged\}\}([\s\S]*?)\{\{\/if\}\}/g,
      variables.files.unstaged.length > 0 ? '$1' : ''
    );

    // Process {{#if files.untracked}}...{{/if}}
    processed = processed.replace(
      /\{\{#if files\.untracked\}\}([\s\S]*?)\{\{\/if\}\}/g,
      variables.files.untracked.length > 0 ? '$1' : ''
    );

    // Process {{#if files.total}}...{{/if}}
    processed = processed.replace(
      /\{\{#if files\.total\}\}([\s\S]*?)\{\{\/if\}\}/g,
      variables.files.total > 0 ? '$1' : ''
    );

    // Process {{#if recentCommits}}...{{/if}}
    processed = processed.replace(
      /\{\{#if recentCommits\}\}([\s\S]*?)\{\{\/if\}\}/g,
      variables.recentCommits && variables.recentCommits.length > 0 ? '$1' : ''
    );

    // Process {{#if diff}}...{{/if}}
    processed = processed.replace(
      /\{\{#if diff\}\}([\s\S]*?)\{\{\/if\}\}/g,
      variables.diff && variables.diff.length > 0 ? '$1' : ''
    );

    return processed;
  }

  /**
   * Create variables object from commit context
   */
  static createVariables(context: any): PromptVariables {
    const files = context.files || { staged: [], unstaged: [], untracked: [] };

    return {
      files: {
        staged: files.staged || [],
        unstaged: files.unstaged || [],
        untracked: files.untracked || [],
        total:
          (files.staged?.length || 0) +
          (files.unstaged?.length || 0) +
          (files.untracked?.length || 0),
      },
      branch: context.branch || 'unknown',
      diff: context.diff,
      recentCommits: context.recentCommits,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      author: context.author,
    };
  }

  /**
   * Validate template syntax
   */
  static validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unmatched conditional blocks
    const ifBlocks = template.match(/\{\{#if\s+[\w.]+\}\}/g) || [];
    const endifBlocks = template.match(/\{\{\/if\}\}/g) || [];

    if (ifBlocks.length !== endifBlocks.length) {
      errors.push('Unmatched conditional blocks: {{#if}} and {{/if}} count mismatch');
    }

    // Check for unknown variables
    const variables = template.match(/\{\{[\w.]+\}\}/g) || [];
    const validVariables = [
      'files.staged',
      'files.unstaged',
      'files.untracked',
      'files.total',
      'branch',
      'diff',
      'recentCommits',
      'timestamp',
      'author',
    ];

    const conditionalPrefixes = ['#if ', '/if'];

    for (const variable of variables) {
      const cleanVar = variable.replace(/\{\{|\}\}/g, '');

      // Skip conditional blocks
      if (conditionalPrefixes.some((prefix) => cleanVar.startsWith(prefix))) {
        continue;
      }

      if (!validVariables.includes(cleanVar)) {
        errors.push(`Unknown variable: ${variable}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get template help text
   */
  static getTemplateHelp(): string {
    return `Available template variables:
• {{files.staged}} - List of staged files
• {{files.unstaged}} - List of modified files  
• {{files.untracked}} - List of new files
• {{files.total}} - Total number of changed files
• {{branch}} - Current git branch
• {{diff}} - Code diff (truncated)
• {{recentCommits}} - Recent commit messages
• {{timestamp}} - Current timestamp
• {{author}} - Commit author (if available)

Conditional blocks:
• {{#if files.staged}}...{{/if}} - Show only if staged files exist
• {{#if files.unstaged}}...{{/if}} - Show only if modified files exist
• {{#if files.untracked}}...{{/if}} - Show only if new files exist
• {{#if recentCommits}}...{{/if}} - Show only if recent commits exist
• {{#if diff}}...{{/if}} - Show only if diff is available

Example:
{{#if files.staged}}
Staged: {{files.staged}}
{{/if}}
Branch: {{branch}}
Total files: {{files.total}}`;
  }
}
