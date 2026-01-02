/**
 * API Error Handler with Firebase Crashlytics Integration
 * Wraps async route handlers to provide automatic error reporting
 */

import { reportError, reportFatalError, createRequestContext } from './crashlytics.js';
import { logger } from './logger.js';

/**
 * Wraps async route handlers to catch errors and report them to Crashlytics
 * @param {Function} fn - Async route handler function
 * @param {Object} options - Options for error handling
 * @param {boolean} options.fatal - Whether to report as fatal error (default: false)
 * @param {string} options.context - Additional context for the error
 * @returns {Function} Wrapped route handler
 */
export function asyncErrorHandler(fn, options = {}) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const context = createRequestContext(req);
      context.endpoint = `${req.method} ${req.url}`;
      context.handler = fn.name || 'anonymous';
      context.options = options;

      // Determine if it's a fatal error based on status or options
      const isFatal = options.fatal ||
                     error.status >= 500 ||
                     error.name === 'DatabaseError' ||
                     error.name === 'ValidationError';

      if (isFatal) {
        reportFatalError(error, context);
        logger.error(`🚨 Fatal API Error: ${context.endpoint}`, error.message);
      } else {
        reportError(error, context, false);
        logger.warn(`⚠️  API Warning: ${context.endpoint}`, error.message);
      }

      // Don't call next(error) to prevent double error handling
      // Send response directly
      const statusCode = error.status || error.statusCode || (isFatal ? 500 : 400);

      res.status(statusCode).json({
        error: error.message || 'An error occurred',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          context
        }),
      });
    }
  };
}

/**
 * Creates a database operation wrapper with error reporting
 * @param {Function} operation - Database operation function
 * @param {string} operationName - Name of the operation for logging
 * @returns {Function} Wrapped database operation
 */
export function dbErrorHandler(operation, operationName = 'database_operation') {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      reportError(error, {
        operation: operationName,
        args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)),
        timestamp: new Date().toISOString(),
      }, true);

      logger.error(`🚨 Database Error in ${operationName}:`, error.message);
      throw error; // Re-throw to let caller handle
    }
  };
}

/**
 * Middleware for handling validation errors with Crashlytics reporting
 */
export function validationErrorHandler() {
  return (error, req, res, next) => {
    if (error.name === 'ValidationError') {
      const context = createRequestContext(req);
      context.validationErrors = error.errors || error.details;
      context.endpoint = `${req.method} ${req.url}`;

      reportError(error, context, false);
      logger.warn(`⚠️  Validation Error: ${context.endpoint}`, error.message);

      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors || error.details,
        ...(process.env.NODE_ENV === 'development' && { context }),
      });
    }

    next(error);
  };
}

/**
 * Wraps Socket.IO event handlers with error reporting
 * @param {Function} handler - Socket event handler
 * @param {string} eventName - Name of the socket event
 * @returns {Function} Wrapped socket handler
 */
export function socketErrorHandler(handler, eventName) {
  return async (...args) => {
    try {
      await handler(...args);
    } catch (error) {
      const context = {
        event: eventName,
        socketId: args[0]?.id || 'unknown',
        args: args.slice(1).map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)),
        timestamp: new Date().toISOString(),
      };

      reportError(error, context, false);
      logger.error(`🚨 Socket Error in ${eventName}:`, error.message);

      // Emit error back to client if possible
      const socket = args[0];
      if (socket && typeof socket.emit === 'function') {
        socket.emit('error', {
          event: eventName,
          message: 'An error occurred while processing your request',
        });
      }
    }
  };
}

/**
 * Performance monitoring wrapper for slow operations
 * @param {Function} operation - Operation to monitor
 * @param {string} operationName - Name for the operation
 * @param {number} thresholdMs - Threshold in milliseconds for slow operations
 * @returns {Function} Monitored operation
 */
export function performanceMonitor(operation, operationName, thresholdMs = 1000) {
  return async (...args) => {
    const startTime = Date.now();

    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;

      // Log slow operations
      if (duration > thresholdMs) {
        reportError(new Error(`Slow operation: ${operationName}`), {
          operation: operationName,
          duration,
          threshold: thresholdMs,
          timestamp: new Date().toISOString(),
        }, false);

        logger.warn(`🐌 Slow operation: ${operationName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      reportError(error, {
        operation: operationName,
        duration,
        failed: true,
        timestamp: new Date().toISOString(),
      }, true);

      throw error;
    }
  };
}
