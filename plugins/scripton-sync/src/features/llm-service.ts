export interface LLMSettings {
  provider: 'openai' | 'anthropic' | 'none';
  apiKey: string;
  commitPrompt: string;
  enabled: boolean;
  useTemplateEngine: boolean;
  selectedTemplate: string;
}

export interface CommitContext {
  files: string[];
  stats: {
    additions: number;
    deletions: number;
    files: number;
  };
  diffs?: string;
  branch?: string;
  recentCommits?: string[];
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
  async generateCommitMessage(context: CommitContext): Promise<string | null> {
    if (!this.settings.enabled || this.settings.provider === 'none') {
      console.log('LLM service is disabled');
      return null;
    }

    if (!this.settings.apiKey) {
      console.error('API key is not configured');
      return null;
    }

    try {
      const response = await this.callLLM(context);
      if (response.success && response.message) {
        return response.message;
      }
      return null;
    } catch (error) {
      console.error('LLM commit message generation failed:', error);
      return null;
    }
  }

  /**
   * Call the appropriate LLM provider
   */
  private async callLLM(context: CommitContext): Promise<LLMResponse> {
    switch (this.settings.provider) {
      case 'openai':
        return await this.generateWithOpenAI(context);
      case 'anthropic':
        return await this.generateWithAnthropic(context);
      default:
        return {
          success: false,
          error: `Unsupported provider: ${this.settings.provider}`,
        };
    }
  }

  /**
   * Generate commit message using OpenAI GPT
   */
  private async generateWithOpenAI(context: CommitContext): Promise<LLMResponse> {
    const prompt = this.buildPrompt(context);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.settings.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that generates concise, conventional commit messages based on git changes. Follow conventional commits format (type(scope): description). Keep it under 50 characters for the subject line.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `OpenAI API error: ${response.status} - ${error}`,
        };
      }

      const data = await response.json();
      const message = data.choices[0]?.message?.content?.trim();

      if (!message) {
        return {
          success: false,
          error: 'No message generated',
        };
      }

      return {
        success: true,
        message,
      };
    } catch (error) {
      return {
        success: false,
        error: `OpenAI request failed: ${error.message}`,
      };
    }
  }

  /**
   * Generate commit message using Anthropic Claude
   */
  private async generateWithAnthropic(context: CommitContext): Promise<LLMResponse> {
    const prompt = this.buildPrompt(context);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.settings.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 100,
          temperature: 0.3,
          system:
            'You are a helpful assistant that generates concise, conventional commit messages based on git changes. Follow conventional commits format (type(scope): description). Keep it under 50 characters for the subject line.',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Anthropic API error: ${response.status} - ${error}`,
        };
      }

      const data = await response.json();
      const message = data.content[0]?.text?.trim();

      if (!message) {
        return {
          success: false,
          error: 'No message generated',
        };
      }

      return {
        success: true,
        message,
      };
    } catch (error) {
      return {
        success: false,
        error: `Anthropic request failed: ${error.message}`,
      };
    }
  }

  /**
   * Build prompt from context
   */
  private buildPrompt(context: CommitContext): string {
    let prompt =
      this.settings.commitPrompt || 'Generate a commit message for the following changes:\n\n';

    // Add file information
    prompt += `Files changed (${context.stats.files}):\n`;
    context.files.slice(0, 20).forEach((file) => {
      prompt += `- ${file}\n`;
    });
    if (context.files.length > 20) {
      prompt += `... and ${context.files.length - 20} more files\n`;
    }

    // Add statistics
    prompt += `\nStatistics:\n`;
    prompt += `- Additions: ${context.stats.additions}\n`;
    prompt += `- Deletions: ${context.stats.deletions}\n`;
    prompt += `- Total files: ${context.stats.files}\n`;

    // Add branch info if available
    if (context.branch) {
      prompt += `\nCurrent branch: ${context.branch}\n`;
    }

    // Add template-specific instructions if enabled
    if (this.settings.useTemplateEngine) {
      prompt += `\n${this.getTemplateInstructions()}`;
    }

    return prompt;
  }

  /**
   * Get template-specific instructions
   */
  private getTemplateInstructions(): string {
    const templates: Record<string, string> = {
      conventional: 'Use conventional commits format: type(scope): description',
      semantic: 'Use semantic commit format with clear action verbs',
      detailed: 'Include a brief description of what changed and why',
      simple: 'Keep it simple and concise, maximum 50 characters',
    };

    return templates[this.settings.selectedTemplate] || templates.conventional;
  }

  /**
   * Validate API key format
   */
  validateApiKey(): boolean {
    if (!this.settings.apiKey) {
      return false;
    }

    switch (this.settings.provider) {
      case 'openai':
        return this.settings.apiKey.startsWith('sk-');
      case 'anthropic':
        return this.settings.apiKey.length > 20;
      default:
        return false;
    }
  }

  /**
   * Test LLM connection
   */
  async testConnection(): Promise<LLMResponse> {
    const testContext: CommitContext = {
      files: ['test.md'],
      stats: {
        additions: 1,
        deletions: 0,
        files: 1,
      },
    };

    return this.callLLM(testContext);
  }
}
