/**
 * Express Middleware for Firebase Crashlytics
 * Automatically captures and reports errors to Firebase Crashlytics
 */

import { reportError, reportFatalError, createRequestContext } from '../utils/crashlytics.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to log API requests for performance monitoring
 */
export function requestLogger() {
  return (req, res, next) => {
    const startTime = Date.now();

    // Log request
    logger.debug(`📨 ${req.method} ${req.url}`, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
      user: req.user?.id || 'anonymous',
    });

    // Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log slow requests (> 1000ms)
      if (duration > 1000) {
        logger.warn(`🐌 Slow request: ${req.method} ${req.url} (${duration}ms)`);
      }

      // Log error responses
      if (statusCode >= 400) {
        const context = createRequestContext(req);
        context.responseStatus = statusCode;
        context.duration = duration;

        if (statusCode >= 500) {
          reportError(`HTTP ${statusCode} - ${req.method} ${req.url}`, context, false);
        } else if (statusCode >= 400) {
          // Log client errors for monitoring
          logger.warn(`Client error: ${statusCode} - ${req.method} ${req.url}`);
        }
      }
    });

    next();
  };
}

/**
 * Middleware to catch and report unhandled promise rejections
 */
export function unhandledRejectionHandler() {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('🚨 Unhandled Promise Rejection:', reason);
    reportFatalError(reason instanceof Error ? reason : new Error(String(reason)), {
      type: 'unhandledRejection',
      promise: promise.toString(),
      timestamp: new Date().toISOString(),
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('🚨 Uncaught Exception:', error);
    reportFatalError(error, {
      type: 'uncaughtException',
      timestamp: new Date().toISOString(),
    });

    // Give some time for error reporting before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

/**
 * Middleware for API error responses
 */
export function apiErrorReporter() {
  return (error, req, res, next) => {
    if (error) {
      const context = createRequestContext(req);
      context.errorType = 'api_error';
      context.endpoint = `${req.method} ${req.url}`;

      // Determine if it's a fatal error (5xx)
      const statusCode = error.statusCode || error.status || 500;
      const isFatal = statusCode >= 500;

      if (isFatal) {
        reportFatalError(error, context);
        logger.error(`🚨 API Fatal Error (${statusCode}):`, error.message);
      } else {
        reportError(error, context, false);
        logger.warn(`⚠️  API Error (${statusCode}):`, error.message);
      }
    }

    next(error);
  };
}

/**
 * Middleware to set user context for authenticated requests
 */
export function userContextMiddleware() {
  return (req, res, next) => {
    if (req.user) {
      // Import dynamically to avoid circular imports
      import('../utils/crashlytics.js').then(({ setUserContext }) => {
        setUserContext(req.user.id, {
          email: req.user.email,
          role: req.user.role,
          department: req.user.department,
          lastActivity: new Date().toISOString(),
        });
      });
    }
    next();
  };
}

/**
 * Health check endpoint for Crashlytics monitoring
 */
export function healthCheckMiddleware() {
  return (req, res, next) => {
    if (req.url === '/health' || req.url === '/api/health') {
      // Log health check for monitoring
      logger.debug('🏥 Health check requested');
    }
    next();
  };
}
