# Crash Reporting Setup

This document describes the crash reporting and error tracking implementation for both frontend and backend.

## Overview

The application uses Firebase Analytics (frontend) and Firebase Error Reporting (backend) for production crash analytics. Errors are automatically captured and reported in production, while being logged to console in development.

## Frontend Crash Reporting

### Implementation

1. **React Error Boundary**: Catches component errors and displays a user-friendly error screen
2. **Global Error Handlers**: Catches unhandled errors and unhandled promise rejections
3. **Firebase Analytics Exception Logging**: Sends error events to Firebase Analytics in production
4. **Automatic Error Reporting**: Logger automatically sends errors to crash analytics

### Features

- **Error Boundary Component** (`src/components/ErrorBoundary.tsx`):
  - Catches React component errors
  - Displays user-friendly error UI
  - Reports errors to Firebase Analytics in production
  - Shows detailed error info in development mode

- **Global Error Handlers** (`src/App.tsx`):
  - `window.addEventListener('error')`: Catches unhandled JavaScript errors
  - `window.addEventListener('unhandledrejection')`: Catches unhandled promise rejections
  - Both handlers report fatal errors to Firebase Analytics in production

- **Enhanced Logger** (`src/lib/logger.ts`):
  - Automatically sends Error objects to crash analytics in production
  - Maintains console logging for development

- **Firebase Analytics Integration** (`src/lib/firebase.ts`):
  - `logError()` function sends exception events to Firebase Analytics
  - Includes error details, stack traces, user context, and URL information
  - Only active in production (not in development)

### Usage

Errors are automatically captured. You can also manually report errors:

```typescript
import { logError } from '@/lib/firebase';

try {
  // Some code that might throw
} catch (error) {
  logError(error, {
    source: 'my_component',
    additionalContext: 'any additional info',
  });
}
```

### Viewing Errors

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Analytics** → **Events**
4. Look for `exception` events
5. Filter by error details to find specific issues

## Backend Crash Reporting

### Implementation

1. **Error Reporting Utility** (`server/utils/errorReporting.js`):
   - Reports errors to Firebase Error Reporting service
   - Integrates with Firebase Admin SDK
   - Formats errors for Google Cloud Error Reporting

2. **Global Error Handlers** (`server/index.js`):
   - `process.on('uncaughtException')`: Catches uncaught exceptions
   - `process.on('unhandledRejection')`: Catches unhandled promise rejections
   - Express error middleware: Catches route errors

3. **Enhanced Logger** (`server/utils/logger.js`):
   - Automatically sends Error objects to error reporting in production
   - Maintains console logging for development

### Features

- **Error Reporting Service**:
  - Uses Firebase Admin SDK (already initialized for FCM)
  - Formats errors as structured JSON logs
  - Integrates with Google Cloud Error Reporting when deployed

- **Error Context**:
  - HTTP request details (method, URL, user agent, IP)
  - User information
  - Route/path information
  - Stack traces

### Usage

Errors are automatically captured. You can also manually report errors:

```javascript
import { reportError, reportFatalError, createErrorContext } from '../utils/errorReporting.js';

// Report a non-fatal error
try {
  // Some code
} catch (error) {
  reportError(error, {
    source: 'my_function',
    additionalContext: 'any info',
  });
}

// Report a fatal error
reportFatalError(error, {
  source: 'critical_operation',
});

// In Express routes, use createErrorContext
app.get('/api/endpoint', async (req, res) => {
  try {
    // Some code
  } catch (error) {
    const context = createErrorContext(req);
    reportError(error, context);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Viewing Errors

When deployed to Google Cloud Platform:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Error Reporting**
3. View errors grouped by similarity
4. See error frequency, affected users, and stack traces

For local development:
- Errors are logged to console with structured JSON format
- Firebase Error Reporting requires deployment to GCP

## Environment Configuration

### Frontend

No additional configuration needed. Firebase Analytics is already configured via:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_MEASUREMENT_ID`
- Other Firebase config variables

### Backend

No additional configuration needed. Firebase Admin SDK is already configured via:
- `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH`

## Production vs Development

### Development Mode

- **Frontend**: Errors logged to console, not sent to Firebase Analytics
- **Backend**: Errors logged to console, not sent to Error Reporting
- **Error Boundary**: Shows detailed error information for debugging

### Production Mode

- **Frontend**: Errors automatically sent to Firebase Analytics
- **Backend**: Errors automatically sent to Firebase Error Reporting
- **Error Boundary**: Shows user-friendly error message, errors reported silently

## Error Types Captured

### Frontend

- React component errors (via Error Boundary)
- Unhandled JavaScript errors
- Unhandled promise rejections
- Manual error reports via `logError()`
- Errors logged via `logger.error()` with Error objects

### Backend

- Uncaught exceptions
- Unhandled promise rejections
- Express route errors (via error middleware)
- Manual error reports via `reportError()`
- Errors logged via `logger.error()` with Error objects

## Best Practices

1. **Always use Error objects**: Pass Error objects to logger, not strings
   ```typescript
   // Good
   logger.error(new Error('Something went wrong'), { context });
   
   // Also works, but less detailed
   logger.error('Something went wrong');
   ```

2. **Add context**: Include relevant context when reporting errors
   ```typescript
   logError(error, {
     source: 'component_name',
     userId: user.id,
     action: 'what_user_was_doing',
   });
   ```

3. **Don't report expected errors**: Only report unexpected/unhandled errors
   ```typescript
   // Don't report validation errors
   if (!isValid) {
     return res.status(400).json({ error: 'Invalid input' });
   }
   
   // Do report unexpected errors
   try {
     await processData();
   } catch (error) {
     reportError(error, { source: 'processData' });
   }
   ```

4. **Use appropriate severity**: Use `reportFatalError()` for crashes, `reportError()` for warnings

## Troubleshooting

### Frontend errors not appearing in Firebase Analytics

1. Check that `NODE_ENV` is set to `production` (or `VITE_IS_DEV=false`)
2. Verify Firebase Analytics is initialized (check console for initialization message)
3. Check browser console for any Firebase errors
4. Verify `VITE_FIREBASE_MEASUREMENT_ID` is set correctly

### Backend errors not appearing in Error Reporting

1. Check that `NODE_ENV=production`
2. Verify Firebase Admin SDK is initialized (check server logs)
3. For local development, errors are only logged to console
4. Error Reporting requires deployment to Google Cloud Platform

### Too many errors being reported

- Review error handlers to ensure expected errors aren't being reported
- Add filters in error handlers to exclude known issues
- Use error context to categorize errors

## Security Considerations

- Error reports may contain sensitive information (user IDs, URLs, etc.)
- Review error context before including sensitive data
- Stack traces are included but truncated to prevent payload limits
- Error reporting is disabled in development to prevent exposing dev info

## Related Files

- `src/components/ErrorBoundary.tsx` - React Error Boundary
- `src/App.tsx` - Global error handlers
- `src/lib/firebase.ts` - Firebase Analytics integration
- `src/lib/logger.ts` - Enhanced logger with error reporting
- `server/utils/errorReporting.js` - Backend error reporting utility
- `server/utils/logger.js` - Enhanced logger with error reporting
- `server/index.js` - Global error handlers
