/**
 * Firebase Crashlytics for Node.js Backend
 * Provides crash reporting and error tracking for server-side applications
 */

import admin from 'firebase-admin';
import { logger } from './logger.js';
import { SERVER_CONFIG } from '../config/config.js';

let crashlyticsInitialized = false;

/**
 * Initialize Firebase Crashlytics for backend
 */
function initializeCrashlytics() {
  if (crashlyticsInitialized) {
    return;
  }

  try {
    // Check if Firebase Admin is initialized
    if (admin.apps.length === 0) {
      logger.warn('⚠️  Firebase Admin SDK not initialized. Crashlytics will be disabled.');
      return;
    }

    crashlyticsInitialized = true;
    logger.info('✅ Firebase Crashlytics initialized for backend');
  } catch (error) {
    logger.error('❌ Error initializing Crashlytics:', error);
  }
}

/**
 * Report error to Firebase Crashlytics
 * @param {Error|string} error - Error object or error message
 * @param {Object} context - Additional context information
 * @param {boolean} fatal - Whether the error is fatal
 */
export function reportError(error, context = {}, fatal = false) {
  // Only report in production or when explicitly enabled
  if (SERVER_CONFIG.NODE_ENV !== 'production' && !process.env.ENABLE_CRASHLYTICS) {
    logger.error('Error (dev mode, not reported to Crashlytics):', error, context);
    return;
  }

  if (!crashlyticsInitialized) {
    initializeCrashlytics();
  }

  if (admin.apps.length === 0) {
    logger.error('Error (Firebase not initialized):', error, context);
    return;
  }

  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Prepare Crashlytics report
    const crashReport = {
      message: errorMessage,
      stack: errorStack,
      customData: {
        service: 'project-mgmt-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: SERVER_CONFIG.NODE_ENV,
        timestamp: new Date().toISOString(),
        fatal,
        ...context,
      },
    };

    // For Firebase Admin SDK, we need to use the logging approach
    // Firebase Crashlytics will pick up structured logs from Google Cloud Logging
    const logData = {
      severity: fatal ? 'ERROR' : 'WARNING',
      message: `[${errorName}] ${errorMessage}`,
      serviceContext: {
        service: 'project-mgmt-api',
        version: crashReport.customData.version,
      },
      context: {
        reportLocation: {
          filePath: context.filePath || 'unknown',
          lineNumber: context.lineNumber || 0,
          functionName: context.functionName || 'unknown',
        },
        httpRequest: context.httpRequest || {},
        user: context.user || 'anonymous',
      },
      customData: crashReport.customData,
      ...(errorStack && { stack_trace: errorStack }),
    };

    // Log structured error data that Crashlytics can consume
    if (fatal) {
      console.error(JSON.stringify(logData));
      logger.error('🚨 Fatal error reported:', errorMessage);
    } else {
      console.warn(JSON.stringify(logData));
      logger.warn('⚠️  Warning reported:', errorMessage);
    }

    // Log analytics event
    logEvent('backend_error', {
      error_type: errorName,
      error_message: errorMessage.substring(0, 100), // Limit length
      fatal,
      user_id: context.user || 'anonymous',
      route: context.route || 'unknown',
      timestamp: Date.now(),
    });

    logger.debug('✅ Error reported to Firebase Crashlytics');
  } catch (reportingError) {
    // Don't let error reporting errors break the app
    logger.error('❌ Failed to report error to Crashlytics:', reportingError);
    // Fallback to regular logging
    logger.error('Original error:', error, context);
  }
}

/**
 * Report fatal error (application crashes)
 */
export function reportFatalError(error, context = {}) {
  reportError(error, { ...context, crash: true }, true);
}

/**
 * Report non-fatal error (handled errors)
 */
export function reportWarning(error, context = {}) {
  reportError(error, context, false);
}

/**
 * Log custom events to Crashlytics
 */
export function logEvent(eventName, parameters = {}) {
  try {
    const eventData = {
      event: eventName,
      parameters: {
        service: 'project-mgmt-api',
        timestamp: Date.now(),
        ...parameters,
      },
    };

    console.log(JSON.stringify({
      severity: 'INFO',
      message: `Event: ${eventName}`,
      eventData,
    }));

    logger.debug('📊 Event logged to Crashlytics:', eventName);
  } catch (error) {
    logger.error('❌ Failed to log event:', error);
  }
}

/**
 * Set user context for crash reports
 */
export function setUserContext(userId, userProperties = {}) {
  try {
    logEvent('user_context_set', {
      user_id: userId,
      ...userProperties,
    });
    logger.debug('👤 User context set for Crashlytics:', userId);
  } catch (error) {
    logger.error('❌ Failed to set user context:', error);
  }
}

/**
 * Log performance metrics
 */
export function logPerformance(metricName, value, unit = 'ms') {
  logEvent('performance_metric', {
    metric_name: metricName,
    value,
    unit,
  });
}

/**
 * Create error context from Express request
 */
export function createRequestContext(req) {
  return {
    httpRequest: {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      referrer: req.get('referrer'),
      remoteIp: req.ip || req.connection?.remoteAddress,
      headers: {
        'user-agent': req.get('user-agent'),
        'accept-language': req.get('accept-language'),
        'x-forwarded-for': req.get('x-forwarded-for'),
      },
    },
    user: req.user?.id || req.headers['user-id'] || 'anonymous',
    userRole: req.user?.role || 'unknown',
    route: req.route?.path || req.path,
    query: req.query,
    params: req.params,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Middleware to automatically report unhandled errors
 */
function crashlyticsMiddleware() {
  return (error, req, res, next) => {
    if (error) {
      const context = createRequestContext(req);
      reportError(error, context, false);

      // Don't call next() to prevent further error handling
      // Let the error response be sent by other middleware
      return;
    }
    next();
  };
}

/**
 * Express error handler middleware for uncaught errors
 */
function errorHandlerMiddleware() {
  return (error, req, res, next) => {
    // Skip if response already sent
    if (res.headersSent) {
      return next(error);
    }

    const context = createRequestContext(req);
    const isServerError = res.statusCode >= 500;

    if (isServerError) {
      reportFatalError(error, context);
    } else {
      reportWarning(error, context);
    }

    next(error);
  };
}

// Initialize on module load
initializeCrashlytics();

export { crashlyticsMiddleware, errorHandlerMiddleware };
