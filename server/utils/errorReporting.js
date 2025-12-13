/**
 * Error Reporting Utility (Backend)
 * Reports errors to Firebase Error Reporting service for production crash analytics
 */

import admin from 'firebase-admin';
import { logger } from './logger.js';
import { SERVER_CONFIG } from '../config/config.js';

let errorReportingInitialized = false;

/**
 * Initialize Firebase Error Reporting
 * This uses the Firebase Admin SDK which is already initialized in fcmService.js
 */
function initializeErrorReporting() {
  if (errorReportingInitialized) {
    return;
  }

  try {
    // Check if Firebase Admin is initialized
    if (admin.apps.length === 0) {
      logger.warn('⚠️  Firebase Admin SDK not initialized. Error reporting will be disabled.');
      return;
    }

    errorReportingInitialized = true;
    logger.info('✅ Error Reporting initialized');
  } catch (error) {
    logger.error('❌ Error initializing Error Reporting:', error);
  }
}

/**
 * Report error to Firebase Error Reporting
 * @param {Error|string} error - Error object or error message
 * @param {Object} context - Additional context information
 * @param {boolean} fatal - Whether the error is fatal
 */
export function reportError(error, context = {}, fatal = false) {
  // Only report in production
  if (SERVER_CONFIG.NODE_ENV !== 'production') {
    logger.error('Error (dev mode, not reported):', error, context);
    return;
  }

  // Initialize if not already done
  if (!errorReportingInitialized) {
    initializeErrorReporting();
  }

  // If Firebase Admin is not initialized, just log
  if (admin.apps.length === 0) {
    logger.error('Error (Firebase not initialized):', error, context);
    return;
  }

  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Prepare error report
    const errorReport = {
      message: errorMessage,
      serviceContext: {
        service: 'project-mgmt-api',
        version: process.env.npm_package_version || '1.0.0',
      },
      context: {
        httpRequest: context.httpRequest || {},
        user: context.user || 'unknown',
        reportLocation: {
          filePath: context.filePath || 'unknown',
          lineNumber: context.lineNumber || 0,
          functionName: context.functionName || 'unknown',
        },
        ...context,
      },
    };

    // Use Firebase Admin SDK to report error
    // Note: Firebase Admin SDK doesn't have a direct error reporting method
    // We'll use the logging API which integrates with Error Reporting
    const errorLog = {
      severity: fatal ? 'ERROR' : 'WARNING',
      message: `[${errorName}] ${errorMessage}`,
      ...(errorStack && { stack: errorStack }),
      ...errorReport.context,
    };

    // Log using console.error which Firebase Error Reporting will pick up
    // when deployed to Google Cloud Platform
    if (fatal) {
      console.error(JSON.stringify({
        severity: 'ERROR',
        message: errorMessage,
        error: {
          name: errorName,
          message: errorMessage,
          stack: errorStack,
        },
        context: errorReport.context,
      }));
    } else {
      console.warn(JSON.stringify({
        severity: 'WARNING',
        message: errorMessage,
        error: {
          name: errorName,
          message: errorMessage,
          stack: errorStack,
        },
        context: errorReport.context,
      }));
    }

    logger.debug('Error reported to Firebase Error Reporting');
  } catch (reportingError) {
    // Don't let error reporting errors break the app
    logger.error('Failed to report error:', reportingError);
    // Fallback to regular logging
    logger.error('Original error:', error, context);
  }
}

/**
 * Report fatal error (crashes)
 */
export function reportFatalError(error, context = {}) {
  reportError(error, context, true);
}

/**
 * Report non-fatal error (warnings)
 */
export function reportWarning(error, context = {}) {
  reportError(error, context, false);
}

/**
 * Create error context from Express request
 */
export function createErrorContext(req) {
  return {
    httpRequest: {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      referrer: req.get('referrer'),
      remoteIp: req.ip || req.connection?.remoteAddress,
    },
    user: req.user?.id || req.headers['user-id'] || 'anonymous',
    route: req.route?.path || req.path,
  };
}

// Initialize on module load
initializeErrorReporting();
