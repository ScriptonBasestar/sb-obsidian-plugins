import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { TFile } from 'obsidian';
import { ScriptonPost, getErrorMessage } from './types';

export interface PublishNoteOptions {
  title: string;
  content: string;
  visibility: 'public' | 'private' | 'unlisted';
  tags: string[];
  includeAttachments: boolean;
  preserveLinks: boolean;
}

export interface PublishResult {
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ApiTestResult {
  success: boolean;
  user?: any;
  error?: string;
}

export interface LogEntry {
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  error?: string;
  context?: any;
}

export class ScriptonApiService {
  private api: AxiosInstance;
  private logs: LogEntry[] = [];
  private settings: any;

  constructor(settings: any) {
    this.settings = settings;
    this.initializeApi();
  }

  private initializeApi() {
    this.api = axios.create({
      baseURL: this.settings.apiEndpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.settings.apiKey}`,
        'User-Agent': 'obsidian-publisher-scripton/1.0.0',
      },
    });

    // Request interceptor for logging
    this.api.interceptors.request.use((config) => {
      if (this.settings.enableDetailedLogs && this.shouldLog('debug')) {
        this.log('debug', `API Request: ${config.method?.toUpperCase()} ${config.url}`, { config });
      }
      return config;
    });

    // Response interceptor for logging
    this.api.interceptors.response.use(
      (response) => {
        if (this.settings.enableDetailedLogs && this.shouldLog('debug')) {
          this.log('debug', `API Response: ${response.status} ${response.config.url}`, {
            response: response.data,
          });
        }
        return response;
      },
      (error) => {
        this.log('error', `API Error: ${error.message}`, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  updateSettings(settings: any) {
    this.settings = settings;
    this.initializeApi();
  }

  async testConnection(): Promise<ApiTestResult> {
    try {
      this.log('info', 'Testing API connection...');

      const response: AxiosResponse = await this.api.get('/auth/test');

      this.log('info', 'API connection test successful');
      return {
        success: true,
        user: response.data.user,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.log('error', 'API connection test failed', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async publishNote(options: PublishNoteOptions): Promise<PublishResult> {
    try {
      this.log('info', `Publishing note: ${options.title}`);

      const payload = {
        title: options.title,
        content: options.content,
        visibility: options.visibility,
        tags: options.tags,
        format: 'markdown',
        metadata: {
          source: 'obsidian',
          includeAttachments: options.includeAttachments,
          preserveLinks: options.preserveLinks,
          publishedAt: new Date().toISOString(),
        },
      };

      const response: AxiosResponse = await this.api.post('/notes', payload);

      this.log('info', `Note published successfully: ${response.data.url}`);
      return {
        success: true,
        url: response.data.url,
        id: response.data.id,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.log('error', `Failed to publish note: ${options.title}`, errorMessage);

      // Retry logic
      if (this.settings.enableRetry && this.shouldRetry(error)) {
        return this.retryPublishNote(options);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async retryPublishNote(
    options: PublishNoteOptions,
    attempt: number = 1
  ): Promise<PublishResult> {
    if (attempt > this.settings.maxRetries) {
      this.log('error', `Max retries exceeded for note: ${options.title}`);
      return {
        success: false,
        error: 'Max retries exceeded',
      };
    }

    this.log('warn', `Retrying publish attempt ${attempt} for note: ${options.title}`);

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, this.settings.retryDelay * attempt));

    try {
      const result = await this.publishNote(options);
      if (result.success) {
        this.log('info', `Retry successful for note: ${options.title}`);
        return result;
      } else {
        return this.retryPublishNote(options, attempt + 1);
      }
    } catch (error) {
      return this.retryPublishNote(options, attempt + 1);
    }
  }

  async uploadAttachment(file: TFile): Promise<UploadResult> {
    try {
      this.log('info', `Uploading attachment: ${file.name}`);

      // Read file as array buffer
      const arrayBuffer = await this.app.vault.readBinary(file);
      const blob = new Blob([arrayBuffer]);

      const formData = new FormData();
      formData.append('file', blob, file.name);
      formData.append('type', 'attachment');

      const response: AxiosResponse = await this.api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      this.log('info', `Attachment uploaded successfully: ${response.data.url}`);
      return {
        success: true,
        url: response.data.url,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.log('error', `Failed to upload attachment: ${file.name}`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async updateNote(id: string, options: Partial<PublishNoteOptions>): Promise<PublishResult> {
    try {
      this.log('info', `Updating note: ${id}`);

      const response: AxiosResponse = await this.api.put(`/notes/${id}`, options);

      this.log('info', `Note updated successfully: ${response.data.url}`);
      return {
        success: true,
        url: response.data.url,
        id: response.data.id,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.log('error', `Failed to update note: ${id}`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async deleteNote(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.log('info', `Deleting note: ${id}`);

      await this.api.delete(`/notes/${id}`);

      this.log('info', `Note deleted successfully: ${id}`);
      return { success: true };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.log('error', `Failed to delete note: ${id}`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getUserInfo(): Promise<{ success: boolean; user?: Record<string, unknown>; error?: string }> {
    try {
      const response: AxiosResponse = await this.api.get('/user');

      return {
        success: true,
        user: response.data,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getPublishedNotes(): Promise<{ success: boolean; notes?: ScriptonPost[]; error?: string }> {
    try {
      const response: AxiosResponse = await this.api.get('/notes');

      return {
        success: true,
        notes: response.data.notes,
      };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs].reverse(); // Return newest first
  }

  clearLogs(): void {
    this.logs = [];
    this.log('info', 'Logs cleared');
  }

  private log(level: 'error' | 'warn' | 'info' | 'debug', message: string, error?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      error: error ? (typeof error === 'string' ? error : JSON.stringify(error)) : undefined,
    };

    this.logs.push(logEntry);

    // Keep only last 1000 log entries
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Also log to console if detailed logging is enabled
    if (this.settings.enableDetailedLogs) {
      console[level === 'debug' ? 'log' : level](`[Scripton] ${message}`, error || '');
    }
  }

  private shouldLog(level: 'error' | 'warn' | 'info' | 'debug'): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.settings.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= currentLevelIndex;
  }

  private shouldRetry(error: unknown): boolean {
    // Retry on network errors or 5xx server errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; code?: string };
      const status = axiosError.response?.status;
      return !status || status >= 500 || axiosError.code === 'NETWORK_ERROR';
    }
    return false;
  }

  private extractErrorMessage(error: unknown): string {
    // Type guard for axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
      if (axiosError.response?.data?.message) {
        return axiosError.response.data.message;
      }
      if (axiosError.response?.data?.error) {
        return axiosError.response.data.error;
      }
    }

    return getErrorMessage(error);
  }
}
