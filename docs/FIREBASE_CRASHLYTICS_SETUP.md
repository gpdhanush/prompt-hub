# Firebase Crashlytics Setup Guide

This guide explains how to set up Firebase Crashlytics for both frontend and backend error monitoring and crash reporting.

## 🚀 Overview

Firebase Crashlytics provides real-time crash reporting and error monitoring for your application. This implementation includes:

- **Frontend**: React error boundaries and automatic error reporting
- **Backend**: Express middleware and API error monitoring
- **Real-time**: Live crash reports in Firebase console
- **Context**: User information, request details, and custom data

## 📋 Prerequisites

1. **Firebase Project**: Create a Firebase project at https://console.firebase.google.com
2. **Firebase CLI**: Install globally `npm install -g firebase-tools`
3. **Service Account**: Generate a service account key for backend

## 🔧 Configuration Steps

### 1. Frontend Setup (React/Vite)

The frontend Crashlytics is already configured in:
- `src/lib/firebase-crashlytics.ts` - Main Crashlytics utilities
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/hooks/useCrashlytics.ts` - Integration hook
- `src/App.tsx` - App-level integration

#### Environment Variables (.env)

Add these to your `.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2. Backend Setup (Node.js/Express)

The backend Crashlytics is configured in:
- `server/utils/crashlytics.js` - Main Crashlytics utilities
- `server/middleware/crashlytics.js` - Express middleware
- `server/utils/apiErrorHandler.js` - API error wrappers
- `server/index.js` - Server integration

#### Environment Variables (.env)

Add these to your server `.env` file:

```env
# Firebase Service Account (required for backend)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}' # JSON string
# OR
FIREBASE_SERVICE_ACCOUNT=path/to/service-account.json # File path

# Optional: Enable Crashlytics in development
ENABLE_CRASHLYTICS=true
```

### 3. Firebase Console Setup

#### Step 1: Enable Crashlytics in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Crashlytics** section
4. Click **"Get started"**
5. Follow the setup wizard

#### Step 2: Generate Service Account Key

1. Go to **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. Either:
   - Copy the JSON content to `FIREBASE_SERVICE_ACCOUNT` env var
   - Save the file and reference its path

#### Step 3: Enable Google Cloud Error Reporting API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Error Reporting API** for your project
3. This integrates with Firebase Crashlytics for backend errors

## 🔍 Features Implemented

### Frontend Features

- ✅ **React Error Boundaries**: Catches React component errors
- ✅ **User Context**: Reports user ID, role, and session data
- ✅ **Navigation Tracking**: Logs page views and route changes
- ✅ **Custom Events**: API errors, user actions, performance metrics
- ✅ **Automatic Error Reporting**: All unhandled errors reported

### Backend Features

- ✅ **Express Middleware**: Automatic request/response monitoring
- ✅ **API Error Reporting**: All API errors with request context
- ✅ **Database Error Monitoring**: Query failures and timeouts
- ✅ **Performance Monitoring**: Slow requests and operations
- ✅ **Socket.IO Error Handling**: WebSocket connection errors
- ✅ **Health Check Monitoring**: Server health status

## 📊 Monitoring Dashboard

### Firebase Crashlytics Console

1. **Real-time Crashes**: Live crash reports as they happen
2. **Error Trends**: Historical error patterns and trends
3. **User Impact**: How many users are affected
4. **Stack Traces**: Detailed error stack traces with context
5. **Custom Keys**: User properties and custom data

### Key Metrics to Monitor

- **Crash-free Users**: Percentage of users without crashes
- **Crash-free Sessions**: Percentage of sessions without crashes
- **Top Crashes**: Most frequent crash types
- **Affected Users**: Users experiencing specific crashes

## 🛠️ Usage Examples

### Frontend: Manual Error Reporting

```typescript
import { crashlyticsUtils } from '@/lib/firebase-crashlytics';

// Report custom errors
try {
  // Some risky operation
  riskyOperation();
} catch (error) {
  crashlyticsUtils.recordError(error, {
    component: 'UserProfile',
    action: 'updateProfile',
    userId: currentUser.id,
  });
}

// Log custom events
crashlyticsUtils.logEvent('user_action', {
  action: 'export_data',
  format: 'csv',
  recordCount: 1500,
});

// Log performance
crashlyticsUtils.logPerformance('api_call', 1250, 'ms');
```

### Backend: API Error Handling

```javascript
import { asyncErrorHandler } from '../utils/apiErrorHandler.js';

// Wrap route handlers for automatic error reporting
app.get('/api/users', asyncErrorHandler(async (req, res) => {
  const users = await getUsers();
  res.json(users);
}, { context: 'user_listing' }));

// Manual error reporting
import { reportError } from '../utils/crashlytics.js';

try {
  await processPayment(data);
} catch (error) {
  reportError(error, {
    operation: 'payment_processing',
    amount: data.amount,
    userId: data.userId,
  });
}
```

## 🔒 Security Considerations

- **Production Only**: Crashlytics reporting is disabled in development by default
- **Sensitive Data**: Never log passwords, tokens, or PII in custom data
- **Rate Limiting**: Firebase has built-in rate limiting for error reporting
- **Data Retention**: Crash reports are retained for 90 days by default

## 🐛 Troubleshooting

### Common Issues

#### 1. "Firebase not initialized"
- Check that `FIREBASE_SERVICE_ACCOUNT` is set correctly
- Verify the service account has proper permissions

#### 2. No crash reports appearing
- Enable Crashlytics in Firebase Console
- Check that the app is running in production mode
- Verify network connectivity to Firebase

#### 3. Missing user context
- Ensure user authentication is working
- Check that `useCrashlytics` hook is called in App component

#### 4. Frontend errors not reporting
- Verify Firebase config variables are set
- Check browser console for Firebase initialization errors
- Ensure the app is deployed (Crashlytics works best in production)

### Debug Mode

Enable debug logging:

```javascript
// Frontend
localStorage.setItem('firebase:debug', 'true');

// Backend
process.env.DEBUG = 'firebase:*';
```

## 📈 Best Practices

### Error Classification

- **Fatal**: Server errors (5xx), database failures, uncaught exceptions
- **Non-fatal**: Client errors (4xx), validation errors, handled exceptions
- **Warnings**: Performance issues, deprecated API usage

### Custom Keys and Context

- **User Information**: ID, role, subscription level
- **Request Context**: Endpoint, method, user agent
- **Business Context**: Feature being used, data size, operation type
- **Environment**: Version, environment, region

### Performance Monitoring

- **API Response Times**: >1000ms flagged as slow
- **Database Queries**: >500ms flagged as slow
- **File Uploads**: Size and duration tracking
- **Memory Usage**: High memory consumption alerts

## 🔄 Maintenance

### Regular Tasks

1. **Weekly**: Review top crashes in Firebase Console
2. **Monthly**: Analyze error trends and user impact
3. **Quarterly**: Review and optimize custom logging
4. **Annually**: Update Firebase SDK versions

### SDK Updates

```bash
# Frontend
npm update firebase

# Backend
npm update firebase-admin
```

## 📞 Support

- **Firebase Documentation**: https://firebase.google.com/docs/crashlytics
- **Firebase Console**: https://console.firebase.google.com
- **Stack Overflow**: Tag `firebase-crashlytics`

---

## ✅ Quick Setup Checklist

- [ ] Firebase project created
- [ ] Service account key generated
- [ ] Environment variables configured
- [ ] Crashlytics enabled in console
- [ ] Error Reporting API enabled
- [ ] App deployed and tested
- [ ] First crash report verified

**Setup complete! 🎉 Your app now has comprehensive error monitoring and crash reporting.**
