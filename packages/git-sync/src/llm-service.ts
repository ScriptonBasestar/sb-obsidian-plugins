export interface LLMSettings {
  provider: 'openai' | 'anthropic' | 'none';
  apiKey: string;
  commitPrompt: string;
  enabled: boolean;
}

export interface CommitContext {
  files: {
    staged: string[];
    unstaged: string[];
    untracked: string[];
  };
  diff?: string;
  recentCommits?: string[];
  branch: string;
}

export interface LLMResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class LLMService {
  private settings: LLMSettings;

  constructor(settings: LLMSettings) {
    this.settings = settings;
  }

  updateSettings(settings: LLMSettings): void {
    this.settings = settings;
  }

  /**
   * Generate commit message using LLM
   */
  async generateCommitMessage(context: CommitContext): Promise<LLMResponse> {
    if (!this.settings.enabled || this.settings.provider === 'none') {
      return {
        success: false,
        error: 'LLM service is disabled'
      };
    }

    if (!this.settings.apiKey) {
      return {
        success: false,
        error: 'API key is not configured'
      };
    }

    try {
      switch (this.settings.provider) {
        case 'openai':
          return await this.generateWithOpenAI(context);
        case 'anthropic':
          return await this.generateWithAnthropic(context);
        default:
          return {
            success: false,
            error: `Unsupported provider: ${this.settings.provider}`
          };
      }
    } catch (error) {
      console.error('LLM commit message generation failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate commit message using OpenAI GPT
   */
  private async generateWithOpenAI(context: CommitContext): Promise<LLMResponse> {
    const prompt = this.buildPrompt(context);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates concise, conventional commit messages based on git changes. Follow conventional commits format (type(scope): description). Keep it under 50 characters for the subject line.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();

    if (!message) {
      throw new Error('No message generated from OpenAI API');
    }

    return {
      success: true,
      message: this.cleanupMessage(message)
    };
  }

  /**
   * Generate commit message using Anthropic Claude
   */
  private async generateWithAnthropic(context: CommitContext): Promise<LLMResponse> {
    const prompt = this.buildPrompt(context);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `You are a helpful assistant that generates concise, conventional commit messages based on git changes. Follow conventional commits format (type(scope): description). Keep it under 50 characters for the subject line.\n\n${prompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const message = data.content?.[0]?.text?.trim();

    if (!message) {
      throw new Error('No message generated from Anthropic API');
    }

    return {
      success: true,
      message: this.cleanupMessage(message)
    };
  }

  /**
   * Build prompt for LLM based on git context
   */
  private buildPrompt(context: CommitContext): string {
    const { files, diff, recentCommits, branch } = context;
    
    let prompt = this.settings.commitPrompt || 'Generate a concise commit message for these changes:';
    prompt += '\n\n';

    // Add file changes summary
    const totalFiles = files.staged.length + files.unstaged.length + files.untracked.length;
    prompt += `Files changed (${totalFiles} total):\n`;
    
    if (files.staged.length > 0) {
      prompt += `Staged: ${files.staged.slice(0, 5).join(', ')}${files.staged.length > 5 ? ` and ${files.staged.length - 5} more` : ''}\n`;
    }
    
    if (files.unstaged.length > 0) {
      prompt += `Modified: ${files.unstaged.slice(0, 5).join(', ')}${files.unstaged.length > 5 ? ` and ${files.unstaged.length - 5} more` : ''}\n`;
    }
    
    if (files.untracked.length > 0) {
      prompt += `New: ${files.untracked.slice(0, 5).join(', ')}${files.untracked.length > 5 ? ` and ${files.untracked.length - 5} more` : ''}\n`;
    }

    prompt += `\nBranch: ${branch}\n`;

    // Add diff if available (truncated)
    if (diff && diff.length > 0) {
      const truncatedDiff = diff.length > 1000 ? diff.substring(0, 1000) + '...' : diff;
      prompt += `\nChanges:\n${truncatedDiff}\n`;
    }

    // Add recent commits for context
    if (recentCommits && recentCommits.length > 0) {
      prompt += `\nRecent commits for context:\n${recentCommits.slice(0, 3).join('\n')}\n`;
    }

    prompt += '\nGenerate a conventional commit message (type(scope): description) that is concise and descriptive.';

    return prompt;
  }

  /**
   * Clean up and validate generated commit message
   */
  private cleanupMessage(message: string): string {
    // Remove quotes if present
    let cleaned = message.replace(/^["']|["']$/g, '');
    
    // Remove any markdown formatting
    cleaned = cleaned.replace(/`/g, '');
    
    // Ensure it doesn't start with commit: or similar
    cleaned = cleaned.replace(/^(commit:?\s*|message:?\s*)/i, '');
    
    // Trim and ensure single line for subject
    const lines = cleaned.split('\n');
    let subject = lines[0].trim();
    
    // Ensure conventional commit format
    if (!subject.match(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?: .+/)) {
      // Try to infer type based on content
      if (subject.includes('test') || subject.includes('spec')) {
        subject = `test: ${subject}`;
      } else if (subject.includes('doc') || subject.includes('readme')) {
        subject = `docs: ${subject}`;
      } else if (subject.includes('fix') || subject.includes('bug')) {
        subject = `fix: ${subject}`;
      } else if (subject.includes('add') || subject.includes('new')) {
        subject = `feat: ${subject}`;
      } else {
        subject = `chore: ${subject}`;
      }
    }

    // Ensure first letter after colon is lowercase (conventional commits)
    subject = subject.replace(/^(\w+(?:\(.+\))?):\s*([A-Z])/, (match, prefix, firstChar) => {
      return `${prefix}: ${firstChar.toLowerCase()}`;
    });

    // Truncate if too long
    if (subject.length > 50) {
      subject = subject.substring(0, 47) + '...';
    }

    // Add body if present
    if (lines.length > 1) {
      const body = lines.slice(1).join('\n').trim();
      if (body) {
        return `${subject}\n\n${body}`;
      }
    }

    return subject;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<LLMResponse> {
    if (!this.settings.apiKey) {
      return {
        success: false,
        error: 'API key is not configured'
      };
    }

    const testContext: CommitContext = {
      files: {
        staged: ['test.md'],
        unstaged: [],
        untracked: []
      },
      branch: 'test'
    };

    try {
      const result = await this.generateCommitMessage(testContext);
      if (result.success) {
        return {
          success: true,
          message: 'API connection successful'
        };
      } else {
        return result;
      }
    } catch (error) {
      return {
        success: false,
        error: `Connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Get available models for the current provider
   */
  getAvailableModels(): string[] {
    switch (this.settings.provider) {
      case 'openai':
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'];
      case 'anthropic':
        return ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'];
      default:
        return [];
    }
  }

  /**
   * Estimate token usage for a prompt
   */
  estimateTokens(context: CommitContext): number {
    const prompt = this.buildPrompt(context);
    // Rough estimation: ~4 characters per token
    return Math.ceil(prompt.length / 4);
  }
}