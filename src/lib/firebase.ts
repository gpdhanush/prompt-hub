// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';
import { getAnalytics, Analytics, logEvent, setUserProperties } from 'firebase/analytics';
import { FIREBASE_CONFIG, ENV_CONFIG } from './config';
import { logger } from './logger';

// Firebase configuration
const firebaseConfig = {
  apiKey: FIREBASE_CONFIG.API_KEY,
  authDomain: FIREBASE_CONFIG.AUTH_DOMAIN,
  projectId: FIREBASE_CONFIG.PROJECT_ID,
  storageBucket: FIREBASE_CONFIG.STORAGE_BUCKET,
  messagingSenderId: FIREBASE_CONFIG.MESSAGING_SENDER_ID,
  appId: FIREBASE_CONFIG.APP_ID,
  measurementId: FIREBASE_CONFIG.MEASUREMENT_ID,
};

// VAPID key for web push (get from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates)
const vapidKey = FIREBASE_CONFIG.VAPID_KEY;

// Warn if VAPID key is not set
if (!vapidKey && ENV_CONFIG.IS_DEV) {
  logger.warn('⚠️  VAPID key not set! Push notifications will not work. Set VITE_FIREBASE_VAPID_KEY in .env file');
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

// Initialize Firebase
export function initializeFirebase(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    
    // Initialize Analytics (only in browser environment)
    if (typeof window !== 'undefined' && FIREBASE_CONFIG.MEASUREMENT_ID) {
      try {
        analytics = getAnalytics(app);
        logger.info('✅ Firebase Analytics initialized');
      } catch (error) {
        logger.error('Failed to initialize Firebase Analytics:', error);
      }
    }
  } else {
    app = getApps()[0];
  }
  return app;
}

/**
 * Log event to Firebase Analytics
 */
export function logAnalyticsEvent(eventName: string, params?: Record<string, any>): void {
  if (analytics && !ENV_CONFIG.IS_DEV) {
    try {
      logEvent(analytics, eventName, params);
    } catch (error) {
      logger.error('Failed to log analytics event:', error);
    }
  } else if (ENV_CONFIG.IS_DEV) {
    logger.debug('Analytics event (dev only):', eventName, params);
  }
}

/**
 * Set user properties for Firebase Analytics
 */
export function setAnalyticsUserProperties(properties: Record<string, any>): void {
  if (analytics && !ENV_CONFIG.IS_DEV) {
    try {
      setUserProperties(analytics, properties);
    } catch (error) {
      logger.error('Failed to set analytics user properties:', error);
    }
  } else if (ENV_CONFIG.IS_DEV) {
    logger.debug('Analytics user properties (dev only):', properties);
  }
}

/**
 * Log error to Firebase Analytics (for crash analytics)
 * Enhanced with better error details for production crash reporting
 */
export function logError(error: Error | string, context?: Record<string, any>): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorName = error instanceof Error ? error.name : 'Error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Log to console in development
  logger.error(`[Error] ${errorName}: ${errorMessage}`, context);
  
  // Log to Firebase Analytics in production
  if (!ENV_CONFIG.IS_DEV && analytics) {
    try {
      // Determine if error is fatal (unhandled promise rejection, uncaught exception)
      const isFatal = context?.fatal !== undefined ? context.fatal : false;
      
      // Prepare error details for analytics
      const errorDetails: Record<string, any> = {
        description: errorMessage,
        fatal: isFatal,
        error_name: errorName,
        ...context,
      };
      
      // Add stack trace if available (truncated to avoid payload limits)
      if (errorStack) {
        errorDetails.error_stack = errorStack.substring(0, 1000); // Limit stack trace length
      }
      
      // Add user agent and URL for context
      if (typeof window !== 'undefined') {
        errorDetails.user_agent = navigator.userAgent;
        errorDetails.url = window.location.href;
        errorDetails.path = window.location.pathname;
      }
      
      logEvent(analytics, 'exception', errorDetails);
    } catch (analyticsError) {
      // Silently fail analytics logging to prevent error loops
      logger.error('Failed to log error to analytics:', analyticsError);
    }
  }
}

// Get Firebase Messaging instance
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!app) {
    app = initializeFirebase();
  }

  // Check if messaging is supported
  const supported = await isSupported();
  if (!supported) {
    logger.warn('Firebase Messaging is not supported in this browser');
    return null;
  }

  if (!messaging) {
    messaging = getMessaging(app);
  }

  return messaging;
}

// Request notification permission and get FCM token
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      logger.debug('Service Worker ready:', registration.scope);
    }

    const permission = await Notification.requestPermission();
    logger.debug('Notification permission:', permission);
    
    if (permission === 'granted') {
      const messagingInstance = await getFirebaseMessaging();
      if (!messagingInstance) {
        logger.warn('Firebase Messaging not available');
        return null;
      }

      // Wait a bit for service worker to be ready
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }

      const token = await getToken(messagingInstance, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: 'serviceWorker' in navigator 
          ? await navigator.serviceWorker.ready 
          : undefined,
      });

      if (token) {
        logger.info('✅ FCM Token obtained');
        logAnalyticsEvent('fcm_token_obtained');
        return token;
      } else {
        logger.warn('⚠️  No registration token available. Make sure VAPID key is set.');
        return null;
      }
    } else {
      logger.warn('Notification permission denied or default');
      return null;
    }
  } catch (error) {
    logError(error as Error, { source: 'requestNotificationPermission' });
    return null;
  }
}

// Listen for foreground messages
export async function onMessageListener(): Promise<{
  payload: any;
}> {
  return new Promise((resolve) => {
    getFirebaseMessaging().then((messagingInstance) => {
      if (messagingInstance) {
        onMessage(messagingInstance, (payload) => {
          logger.debug('Message received in foreground:', payload);
          logAnalyticsEvent('fcm_message_received', { 
            hasNotification: !!payload.notification,
            hasData: !!payload.data 
          });
          resolve({ payload });
        });
      }
    });
  });
}

// Get current FCM token
export async function getCurrentFCMToken(): Promise<string | null> {
  try {
    if (!vapidKey) {
      logger.error('❌ VAPID key is not set! Cannot get FCM token.');
      logger.error('Please set VITE_FIREBASE_VAPID_KEY in your .env file');
      logger.error('Get it from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates');
      logError(new Error('VAPID key not set'), { source: 'getCurrentFCMToken' });
      return null;
    }

    // Validate VAPID key format (should be a base64 string, typically starts with B)
    if (vapidKey.length < 50) {
      logger.error('❌ VAPID key appears to be invalid (too short). Expected a long base64 string.');
      logger.error('Please verify your VAPID key from Firebase Console.');
      logError(new Error('Invalid VAPID key format'), { source: 'getCurrentFCMToken', keyLength: vapidKey.length });
      return null;
    }

    // Debug: Log VAPID key info (first 10 chars + length for debugging, not the full key)
    logger.debug('🔍 VAPID Key Debug Info:');
    logger.debug(`   Length: ${vapidKey.length} characters`);
    logger.debug(`   Starts with: ${vapidKey.substring(0, 10)}...`);
    logger.debug(`   Ends with: ...${vapidKey.substring(vapidKey.length - 10)}`);
    logger.debug(`   Contains spaces: ${vapidKey.includes(' ') ? 'YES ❌' : 'NO ✅'}`);
    logger.debug(`   Contains newlines: ${vapidKey.includes('\n') || vapidKey.includes('\r') ? 'YES ❌' : 'NO ✅'}`);
    
    // Check if it looks like a valid base64 VAPID key (should start with B and be ~87 chars)
    const isValidFormat = /^B[A-Za-z0-9_-]+$/.test(vapidKey);
    if (!isValidFormat) {
      logger.warn('⚠️  VAPID key format may be invalid. Expected base64 string starting with "B"');
    }

    // Wait for service worker to be ready
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        logger.debug('✅ Service Worker ready for FCM:', registration.scope);
      } catch (error) {
        logger.warn('⚠️ Service worker not ready yet, continuing...');
      }
    }

    const messagingInstance = await getFirebaseMessaging();
    if (!messagingInstance) {
      logger.error('❌ Firebase Messaging instance not available');
      logError(new Error('Firebase Messaging instance not available'), { source: 'getCurrentFCMToken' });
      return null;
    }

    // Get service worker registration
    let serviceWorkerRegistration = undefined;
    if ('serviceWorker' in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.ready;
      } catch (error) {
        logger.warn('⚠️ Could not get service worker registration');
      }
    }

    logger.debug('🔑 Attempting to get FCM token with VAPID key...');
    const token = await getToken(messagingInstance, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: serviceWorkerRegistration,
    });

    if (token) {
      logger.info('✅ FCM token obtained successfully');
      logAnalyticsEvent('fcm_token_obtained');
      return token;
    } else {
      logger.warn('⚠️  No FCM token returned. Check VAPID key and service worker.');
      return null;
    }
  } catch (error: any) {
    logError(error, { source: 'getCurrentFCMToken', errorCode: error.code, errorName: error.name });
    
    // Provide specific error messages
    if (error.code === 'messaging/failed-service-worker-registration') {
      logger.error('❌ Service worker registration failed. Make sure firebase-messaging-sw.js is accessible.');
    } else if (error.message?.includes('push service error') || error.name === 'AbortError') {
      // Check if using Brave browser
      const checkBrave = async () => {
        try {
          if ((navigator as any).brave) {
            const isBrave = await (navigator as any).brave.isBrave();
            return isBrave;
          }
        } catch (e) {
          // Brave detection failed, continue with normal error
        }
        return false;
      };
      
      checkBrave().then((isBrave) => {
        if (isBrave) {
          logger.error('');
          logger.error('🦁 Brave Browser Detected!');
          logger.error('   ⚠️  IMPORTANT: Brave blocks Google services for push messaging by default!');
          logger.error('');
          logger.error('   🔧 REQUIRED FIX:');
          logger.error('   1. Open: brave://settings/privacy');
          logger.error('   2. Enable: "Use Google services for push messaging" ✅');
          logger.error('   3. Click Brave Shields icon → Set to "Down" for localhost');
          logger.error('   4. Reload this page');
          logger.error('');
          logger.error('   This is the #1 cause of FCM errors in Brave browser!');
        }
      }).catch(() => {
        // Ignore Brave detection errors
      });
      logger.error('❌ Push service error - This usually means:');
      logger.error('   1. VAPID key is invalid or incorrect');
      logger.error('   2. VAPID key doesn\'t match the Firebase project');
      logger.error('   3. Service worker is not properly configured');
      
      // Check if using Brave browser
      try {
        const isBrave = (navigator as any).brave;
        if (isBrave) {
          logger.error('');
          logger.error('🦁 Brave Browser Detected!');
          logger.error('   Brave has additional privacy features that can block push notifications.');
          logger.error('   Try these steps:');
          logger.error('   1. Click the Brave Shields icon (lion) in address bar');
          logger.error('   2. Set Shields to "Down" for localhost');
          logger.error('   3. Go to Settings → Privacy → Site settings → Notifications');
          logger.error('   4. Allow notifications for localhost:8080');
          logger.error('   5. Clear browser cache and reload');
        }
      } catch (e) {
        // Ignore Brave detection errors
      }
      
      logger.error('');
      logger.error('💡 General Solutions:');
      logger.error('   - Verify VAPID key in Firebase Console → Project Settings → Cloud Messaging');
      logger.error('   - Make sure VAPID key in .env matches the one in Firebase Console');
      logger.error('   - Verify VAPID key is from project: naethra-project-mgmt');
      logger.error('   - Restart dev server after updating .env file');
      logger.error('   - Clear browser cache and reload');
    } else {
      logger.error('❌ Unexpected error:', error.message || error);
    }
    return null;
  }
}
