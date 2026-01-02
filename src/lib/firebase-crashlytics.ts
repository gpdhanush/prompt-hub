// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Type declarations for dynamically loaded Firebase
declare global {
  interface Window {
    firebase: any;
  }
}

// Check if Firebase config is available
const hasFirebaseConfig = !!(
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_API_KEY
);

// Firebase services (lazy-loaded)
// Note: Crashlytics is not available via CDN, only through npm packages
let firebaseServices: {
  crashlytics: any; // Always null - not available via CDN
  analytics: any;
  isInitialized: boolean;
} = {
  crashlytics: null,
  analytics: null,
  isInitialized: false,
};

// Initialize Firebase services asynchronously
const initializeFirebase = async () => {
  if (!hasFirebaseConfig) {
    console.log('ℹ️ Firebase config not provided, Crashlytics disabled');
    return;
  }

  if (firebaseServices.isInitialized) {
    return; // Already initialized
  }

  try {
    // Load Firebase from CDN with correct URLs
    const loadFirebase = async () => {
      // Load Firebase App first
      await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');

    // Load Firebase Analytics (Crashlytics not available via CDN)
    await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics-compat.js').catch(() => {
      console.warn('⚠️ Firebase Analytics not available');
    });

      try {
        // @ts-ignore - Firebase loaded dynamically
        const firebase = window.firebase;

        if (firebase && !firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }

        // Try to get services (may not be available)
        // Crashlytics not available via CDN, only Analytics
        firebaseServices.crashlytics = null;
        firebaseServices.analytics = firebase?.analytics?.() || firebase?.analytics;
        firebaseServices.isInitialized = true;

        console.log('✅ Firebase Analytics loaded successfully (Crashlytics not available via CDN)');
      } catch (initError) {
        console.warn('⚠️ Firebase initialization failed:', initError.message);
      }
    };

    // Helper function to load scripts
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    loadFirebase();
  } catch (error) {
    console.warn('⚠️ Firebase loading failed:', error.message);
  }
};

// Start initialization when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
  } else {
    initializeFirebase();
  }
}

// Firebase configuration (should match your existing config)
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
//   measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
// };

// Crashlytics utility functions with graceful fallbacks
export const crashlyticsUtils = {
  // Set user identification for crash reports
  setUser: (userId: string, userProperties?: Record<string, any>) => {
    if (!firebaseServices.isInitialized || !firebaseServices.crashlytics) {
      console.log('ℹ️ Crashlytics not available, skipping user set');
      return;
    }

    try {
      firebaseServices.crashlytics.setUserId(userId);

      if (userProperties) {
        firebaseServices.crashlytics.setUserProperties(userProperties);
      }

      console.log('✅ Crashlytics user set:', userId);
    } catch (error) {
      console.error('❌ Failed to set Crashlytics user:', error);
    }
  },

  // Log custom events
  logEvent: (eventName: string, parameters?: Record<string, any>) => {
    if (!firebaseServices.isInitialized || !firebaseServices.analytics) {
      console.log('ℹ️ Analytics not available, skipping event log');
      return;
    }

    try {
      firebaseServices.analytics.logEvent(eventName, parameters);
      console.log('📊 Event logged:', eventName, parameters);
    } catch (error) {
      console.error('❌ Failed to log event:', error);
    }
  },

  // Record custom errors
  recordError: (error: Error, context?: Record<string, any>) => {
    if (!firebaseServices.isInitialized || !firebaseServices.crashlytics) {
      console.log('ℹ️ Crashlytics not available, skipping error record');
      return;
    }

    try {
      firebaseServices.crashlytics.recordError(error, context);
      console.log('🚨 Error recorded:', error.message, context);
    } catch (err) {
      console.error('❌ Failed to record error:', err);
    }
  },

  // Log performance metrics
  logPerformance: (metricName: string, value: number, unit?: string) => {
    crashlyticsUtils.logEvent('performance_metric', {
      metric_name: metricName,
      value,
      unit: unit || 'ms',
      timestamp: Date.now(),
    });
  },

  // Log navigation events
  logNavigation: (from: string, to: string) => {
    crashlyticsUtils.logEvent('navigation', { from, to });
  },

  // Log API errors
  logApiError: (endpoint: string, method: string, statusCode: number, error?: any) => {
    crashlyticsUtils.logEvent('api_error', {
      endpoint,
      method,
      status_code: statusCode,
      error_message: error?.message || 'Unknown error',
      timestamp: Date.now(),
    });
  },

  // Log user actions
  logUserAction: (action: string, details?: Record<string, any>) => {
    crashlyticsUtils.logEvent('user_action', {
      action,
      ...details,
      timestamp: Date.now(),
    });
  },
};

export default crashlyticsUtils;
