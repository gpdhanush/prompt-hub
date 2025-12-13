/**
 * Logger Utility
 * Centralized logging that only logs in development mode
 * In production, logs are suppressed to prevent exposing sensitive information
 */

import { ENV_CONFIG } from './config';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Logger class for development-only logging
 */
class Logger {
  /**
   * Check if logging is enabled (only in development)
   */
  private shouldLog(): boolean {
    return ENV_CONFIG.IS_DEV;
  }

  /**
   * Debug log (development only)
   */
  debug(...args: any[]): void {
    if (this.shouldLog()) {
      console.debug('[DEBUG]', ...args);
    }
  }

  /**
   * Info log (development only)
   */
  info(...args: any[]): void {
    if (this.shouldLog()) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * Warning log (development only)
   */
  warn(...args: any[]): void {
    if (this.shouldLog()) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Error log (always logged, but formatted differently in production)
   * In production, errors are also sent to crash analytics
   */
  error(...args: any[]): void {
    if (this.shouldLog()) {
      console.error('[ERROR]', ...args);
    } else {
      // In production, log errors and send to crash analytics
      console.error('[ERROR]', ...args); // Keep error logs even in production for debugging
      
      // Send to crash analytics if error object is provided
      if (args.length > 0 && args[0] instanceof Error) {
        try {
          // Dynamic import to avoid circular dependencies
          import('./firebase').then(({ logError }) => {
            logError(args[0], {
              source: 'logger',
              additionalArgs: args.slice(1),
            });
          }).catch(() => {
            // Silently fail if firebase module not available
          });
        } catch (e) {
          // Silently fail to prevent error loops
        }
      }
    }
  }

  /**
   * Log with custom level (development only)
   */
  log(level: LogLevel, ...args: any[]): void {
    if (!this.shouldLog()) return;

    switch (level) {
      case LogLevel.DEBUG:
        this.debug(...args);
        break;
      case LogLevel.INFO:
        this.info(...args);
        break;
      case LogLevel.WARN:
        this.warn(...args);
        break;
      case LogLevel.ERROR:
        this.error(...args);
        break;
    }
  }

  /**
   * Group logs (development only)
   */
  group(label: string): void {
    if (this.shouldLog()) {
      console.group(label);
    }
  }

  /**
   * End log group (development only)
   */
  groupEnd(): void {
    if (this.shouldLog()) {
      console.groupEnd();
    }
  }

  /**
   * Table log (development only)
   */
  table(data: any): void {
    if (this.shouldLog()) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = logger.log.bind(logger);
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
