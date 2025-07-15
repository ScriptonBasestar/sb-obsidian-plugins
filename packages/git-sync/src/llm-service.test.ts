import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService, LLMSettings, CommitContext } from './llm-service';

// Mock fetch globally
global.fetch = vi.fn();

describe('LLMService', () => {
  let llmService: LLMService;
  let mockSettings: LLMSettings;

  beforeEach(() => {
    mockSettings = {
      provider: 'openai',
      apiKey: 'test-api-key',
      commitPrompt: 'Generate a commit message:',
      enabled: true,
      useTemplateEngine: false,
      selectedTemplate: 'conventional',
    };
    llmService = new LLMService(mockSettings);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided settings', () => {
      expect(llmService).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    it('should update settings correctly', () => {
      const newSettings: LLMSettings = {
        provider: 'anthropic',
        apiKey: 'new-key',
        commitPrompt: 'New prompt',
        enabled: false,
        useTemplateEngine: true,
        selectedTemplate: 'korean',
      };

      llmService.updateSettings(newSettings);
      // Settings are private, so we test through behavior
      expect(llmService).toBeDefined();
    });
  });

  describe('generateCommitMessage', () => {
    const mockContext: CommitContext = {
      files: {
        staged: ['file1.ts', 'file2.md'],
        unstaged: ['file3.js'],
        untracked: ['file4.json'],
      },
      branch: 'feature/test',
      recentCommits: ['feat: previous commit'],
    };

    beforeEach(() => {
      // Spy on console.error to suppress error logs during tests
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should return error when LLM is disabled', async () => {
      llmService.updateSettings({ ...mockSettings, enabled: false });

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('LLM service is disabled');
    });

    it('should return error when provider is none', async () => {
      llmService.updateSettings({ ...mockSettings, provider: 'none' });

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('LLM service is disabled');
    });

    it('should return error when API key is missing', async () => {
      llmService.updateSettings({ ...mockSettings, apiKey: '' });

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key is not configured');
    });

    it('should successfully generate commit message with OpenAI', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: 'feat: add new features',
                },
              },
            ],
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('feat: add new features');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should successfully generate commit message with Anthropic', async () => {
      llmService.updateSettings({ ...mockSettings, provider: 'anthropic' });

      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: [
              {
                text: 'fix: resolve bug issues',
              },
            ],
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('fix: resolve bug issues');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
          }),
        })
      );
    });

    it('should handle OpenAI API error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () =>
          Promise.resolve({
            error: { message: 'Invalid API key' },
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('OpenAI API error: 401 Invalid API key');
    });

    it('should handle Anthropic API error', async () => {
      llmService.updateSettings({ ...mockSettings, provider: 'anthropic' });

      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () =>
          Promise.resolve({
            error: { message: 'Access denied' },
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Anthropic API error: 403 Access denied');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle empty response from OpenAI', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [],
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No message generated from OpenAI API');
    });

    it('should handle empty response from Anthropic', async () => {
      llmService.updateSettings({ ...mockSettings, provider: 'anthropic' });

      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: [],
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await llmService.generateCommitMessage(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No message generated from Anthropic API');
    });
  });

  describe('testConnection', () => {
    it('should return error when API key is missing', async () => {
      llmService.updateSettings({ ...mockSettings, apiKey: '' });

      const result = await llmService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key is not configured');
    });

    it('should successfully test connection', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: 'test: connection successful',
                },
              },
            ],
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await llmService.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('API connection successful');
    });

    it('should handle connection test failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await llmService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });
  });

  describe('getAvailableModels', () => {
    it('should return OpenAI models when provider is openai', () => {
      llmService.updateSettings({ ...mockSettings, provider: 'openai' });

      const models = llmService.getAvailableModels();

      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview']);
    });

    it('should return Anthropic models when provider is anthropic', () => {
      llmService.updateSettings({ ...mockSettings, provider: 'anthropic' });

      const models = llmService.getAvailableModels();

      expect(models).toEqual([
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229',
      ]);
    });

    it('should return empty array for none provider', () => {
      llmService.updateSettings({ ...mockSettings, provider: 'none' });

      const models = llmService.getAvailableModels();

      expect(models).toEqual([]);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens based on prompt length', () => {
      const context: CommitContext = {
        files: {
          staged: ['file1.ts'],
          unstaged: [],
          untracked: [],
        },
        branch: 'main',
      };

      const tokens = llmService.estimateTokens(context);

      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });
  });

  describe('template engine features', () => {
    it('should get available templates', () => {
      const templates = llmService.getAvailableTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
    });

    it('should preview prompt', () => {
      const context: CommitContext = {
        files: {
          staged: ['test.ts'],
          unstaged: [],
          untracked: [],
        },
        branch: 'main',
      };

      const preview = llmService.previewPrompt(context);

      expect(preview).toBeDefined();
      expect(typeof preview).toBe('string');
      expect(preview.length).toBeGreaterThan(0);
    });

    it('should validate template', () => {
      const validTemplate = '{{files.total}} files on {{branch}}';
      const invalidTemplate = '{{unknown.variable}}';

      const validResult = llmService.validatePromptTemplate(validTemplate);
      const invalidResult = llmService.validatePromptTemplate(invalidTemplate);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it('should provide template help', () => {
      const help = llmService.getTemplateHelp();

      expect(help).toBeDefined();
      expect(help).toContain('Available template variables');
      expect(help).toContain('{{files.staged}}');
    });

    it('should use template engine when enabled', async () => {
      // Enable template engine
      llmService.updateSettings({
        ...mockSettings,
        useTemplateEngine: true,
        selectedTemplate: 'simple',
      });

      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: 'feat: add new feature',
                },
              },
            ],
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const context: CommitContext = {
        files: {
          staged: ['test.ts'],
          unstaged: [],
          untracked: [],
        },
        branch: 'main',
      };

      const result = await llmService.generateCommitMessage(context);

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalled();

      // Verify that the request body contains processed template
      const fetchCall = (fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const prompt = requestBody.messages[1].content;

      // Should contain processed template content
      expect(prompt).toContain('1 files changed');
      expect(prompt).toContain('main');
    });

    it('should process custom template with variables', async () => {
      // Set custom template with variables
      llmService.updateSettings({
        ...mockSettings,
        commitPrompt:
          'Custom prompt for {{files.total}} files on {{branch}}:\n{{#if files.staged}}\nStaged: {{files.staged}}\n{{/if}}',
      });

      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: 'feat: custom template result',
                },
              },
            ],
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const context: CommitContext = {
        files: {
          staged: ['file1.ts', 'file2.js'],
          unstaged: [],
          untracked: [],
        },
        branch: 'feature/test',
      };

      const result = await llmService.generateCommitMessage(context);

      expect(result.success).toBe(true);

      // Verify that the request body contains processed custom template
      const fetchCall = (fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const prompt = requestBody.messages[1].content;

      expect(prompt).toContain('Custom prompt for 2 files on feature/test');
      expect(prompt).toContain('Staged: file1.ts, file2.js');
    });
  });

  describe('message cleanup', () => {
    it('should clean up and format commit messages correctly', async () => {
      const testCases = [
        {
          input: '"feat: add new feature"',
          expected: 'feat: add new feature',
        },
        {
          input: 'commit: fix bug in parser',
          expected: 'fix: fix bug in parser',
        },
        {
          input: 'Add new functionality',
          expected: 'feat: add new functionality',
        },
        {
          input: 'fix: Fix Bug In Parser',
          expected: 'fix: fix Bug In Parser',
        },
        {
          input: 'docs: Update README documentation',
          expected: 'docs: update README documentation',
        },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: {
                    content: testCase.input,
                  },
                },
              ],
            }),
        };

        (global.fetch as any).mockResolvedValueOnce(mockResponse);

        const result = await llmService.generateCommitMessage({
          files: { staged: ['test.ts'], unstaged: [], untracked: [] },
          branch: 'main',
        });

        expect(result.success).toBe(true);
        expect(result.message).toBe(testCase.expected);
      }
    });

    it('should truncate long commit messages', async () => {
      const longMessage =
        'feat: this is a very long commit message that exceeds the recommended character limit for commit subjects';

      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: longMessage,
                },
              },
            ],
          }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await llmService.generateCommitMessage({
        files: { staged: ['test.ts'], unstaged: [], untracked: [] },
        branch: 'main',
      });

      expect(result.success).toBe(true);
      expect(result.message!.length).toBeLessThanOrEqual(50);
      expect(result.message).toContain('...');
    });
  });
});
