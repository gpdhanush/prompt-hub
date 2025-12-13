/**
 * Logger Utility (Backend)
 * Centralized logging that only logs in development mode
 * In production, logs are suppressed to prevent exposing sensitive information
 */

/**
 * Check if logging is enabled (only in development)
 * Uses process.env directly to avoid circular dependency with config.js
 */
function shouldLog() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Logger class for development-only logging
 */
class Logger {
  /**
   * Debug log (development only)
   */
  debug(...args) {
    if (shouldLog()) {
      console.debug('[DEBUG]', ...args);
    }
  }

  /**
   * Info log (development only)
   */
  info(...args) {
    if (shouldLog()) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * Warning log (development only)
   */
  warn(...args) {
    if (shouldLog()) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Error log (always logged, but formatted differently in production)
   * In production, errors are also sent to crash analytics
   */
  error(...args) {
    if (shouldLog()) {
      console.error('[ERROR]', ...args);
    } else {
      // In production, log errors and send to crash analytics
      console.error('[ERROR]', ...args); // Keep error logs even in production for debugging
      
      // Send to crash analytics if error object is provided
      if (args.length > 0 && args[0] instanceof Error) {
        try {
          // Dynamic import to avoid circular dependencies
          import('./errorReporting.js').then(({ reportError }) => {
            reportError(args[0], {
              source: 'logger',
              additionalArgs: args.slice(1),
            });
          }).catch(() => {
            // Silently fail if errorReporting module not available
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
  log(level, ...args) {
    if (!shouldLog()) return;

    switch (level) {
      case 'debug':
        this.debug(...args);
        break;
      case 'info':
        this.info(...args);
        break;
      case 'warn':
        this.warn(...args);
        break;
      case 'error':
        this.error(...args);
        break;
    }
  }

  /**
   * Group logs (development only)
   */
  group(label) {
    if (shouldLog()) {
      console.group(label);
    }
  }

  /**
   * End log group (development only)
   */
  groupEnd() {
    if (shouldLog()) {
      console.groupEnd();
    }
  }

  /**
   * Table log (development only)
   */
  table(data) {
    if (shouldLog()) {
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
