/**
 * Base error classes for YGGDRASIL
 */

export interface ErrorDetails {
  [key: string]: unknown;
}

export abstract class YggdrasilError extends Error {
  public readonly code: string;
  public readonly details: ErrorDetails | undefined;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, details?: ErrorDetails, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details ?? undefined;
    this.timestamp = new Date();
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    const isProduction = process.env['NODE_ENV'] === 'production';

    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      // Security: Never expose stack traces in production
      ...(isProduction ? {} : { stack: this.stack }),
    };
  }
}

export class InternalError extends YggdrasilError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'INTERNAL_ERROR', details, false);
  }
}

export class ConfigurationError extends YggdrasilError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'CONFIGURATION_ERROR', details, false);
  }
}

export class TimeoutError extends YggdrasilError {
  constructor(operation: string, timeoutMs: number, details?: ErrorDetails) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`, 'TIMEOUT_ERROR', {
      operation,
      timeoutMs,
      ...details,
    });
  }
}

export class NotFoundError extends YggdrasilError {
  constructor(resource: string, identifier: string, details?: ErrorDetails) {
    super(`${resource} not found: ${identifier}`, 'NOT_FOUND', {
      resource,
      identifier,
      ...details,
    });
  }
}

export class ConflictError extends YggdrasilError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'CONFLICT', details);
  }
}
