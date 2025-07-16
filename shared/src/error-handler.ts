import { Notice } from 'obsidian';

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  API = 'API',
  FILE_SYSTEM = 'FILE_SYSTEM',
  NETWORK = 'NETWORK',
  CONFIGURATION = 'CONFIGURATION',
  UNKNOWN = 'UNKNOWN',
}

export class PluginError extends Error {
  readonly type: ErrorType;
  readonly pluginName: string;
  readonly timestamp: Date;
  readonly context?: Record<string, any>;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    pluginName = 'Unknown Plugin',
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PluginError';
    this.type = type;
    this.pluginName = pluginName;
    this.timestamp = new Date();
    this.context = context;
  }

  toString(): string {
    return `[${this.pluginName}] ${this.type}: ${this.message}`;
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      pluginName: this.pluginName,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: PluginError[] = [];
  private maxErrors = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: Error | PluginError, pluginName?: string, showNotice = true): void {
    const pluginError =
      error instanceof PluginError
        ? error
        : new PluginError(error.message, ErrorType.UNKNOWN, pluginName || 'Unknown');

    // Log error
    console.error(pluginError.toString(), pluginError);

    // Store error
    this.errors.push(pluginError);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Show notice to user
    if (showNotice) {
      this.showErrorNotice(pluginError);
    }
  }

  private showErrorNotice(error: PluginError): void {
    const message = this.getErrorMessage(error);
    new Notice(`❌ ${error.pluginName}: ${message}`, 8000);
  }

  private getErrorMessage(error: PluginError): string {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return `Validation error: ${error.message}`;
      case ErrorType.API:
        return `API error: ${error.message}`;
      case ErrorType.FILE_SYSTEM:
        return `File system error: ${error.message}`;
      case ErrorType.NETWORK:
        return `Network error: ${error.message}`;
      case ErrorType.CONFIGURATION:
        return `Configuration error: ${error.message}`;
      default:
        return error.message;
    }
  }

  getErrors(): PluginError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorsByPlugin(pluginName: string): PluginError[] {
    return this.errors.filter((error) => error.pluginName === pluginName);
  }

  getErrorsByType(type: ErrorType): PluginError[] {
    return this.errors.filter((error) => error.type === type);
  }
}

// Convenience functions
export function handleError(
  error: Error | PluginError,
  pluginName?: string,
  showNotice = true
): void {
  ErrorHandler.getInstance().handle(error, pluginName, showNotice);
}

export function createValidationError(
  message: string,
  pluginName: string,
  context?: Record<string, any>
): PluginError {
  return new PluginError(message, ErrorType.VALIDATION, pluginName, context);
}

export function createApiError(
  message: string,
  pluginName: string,
  context?: Record<string, any>
): PluginError {
  return new PluginError(message, ErrorType.API, pluginName, context);
}

export function createFileSystemError(
  message: string,
  pluginName: string,
  context?: Record<string, any>
): PluginError {
  return new PluginError(message, ErrorType.FILE_SYSTEM, pluginName, context);
}

export function createNetworkError(
  message: string,
  pluginName: string,
  context?: Record<string, any>
): PluginError {
  return new PluginError(message, ErrorType.NETWORK, pluginName, context);
}

export function createConfigurationError(
  message: string,
  pluginName: string,
  context?: Record<string, any>
): PluginError {
  return new PluginError(message, ErrorType.CONFIGURATION, pluginName, context);
}
