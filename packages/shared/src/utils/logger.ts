/**
 * Logger utility for YGGDRASIL
 *
 * Structured JSON logging for complete traceability.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  component?: string;
  requestId?: string;
  userId?: string;
  data?: Record<string, unknown> | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  component: string;
  pretty?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: number;
  private component: string;
  private pretty: boolean;

  constructor(config: LoggerConfig) {
    this.level = LOG_LEVELS[config.level];
    this.component = config.component;
    this.pretty = config.pretty ?? process.env['NODE_ENV'] === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.level;
  }

  private formatEntry(entry: LogEntry): string {
    if (this.pretty) {
      const { level, message, timestamp, component, ...rest } = entry;
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${component}]`;
      const extras = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
      return `${prefix} ${message}${extras}`;
    }
    return JSON.stringify(entry);
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      component: this.component,
      data,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const output = this.formatEntry(entry);

    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, data, error);
  }

  child(additionalComponent: string): Logger {
    return new Logger({
      level: Object.entries(LOG_LEVELS).find(([, v]) => v === this.level)?.[0] as LogLevel ?? 'info',
      component: `${this.component}:${additionalComponent}`,
      pretty: this.pretty,
    });
  }
}

export function createLogger(component: string, level: LogLevel = 'info'): Logger {
  return new Logger({ level, component });
}
