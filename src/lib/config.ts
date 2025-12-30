/**
 * Centralized Configuration
 * All environment variables and configuration values are accessed through this file
 * This ensures a single source of truth for all configuration
 * 
 * IMPORTANT: All values must be set in .env file. No hardcoded defaults.
 */

// Note: Don't import logger here to avoid circular dependency
// Logger imports ENV_CONFIG from this file, so we use console directly

/**
 * API Configuration
 * VITE_API_URL must be set in .env file (e.g., https://api.example.com/api)
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL,
  // Remove /api suffix to get base server URL for static file serving
  // Example: https://api.example.com/api -> https://api.example.com
  SERVER_URL: (() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    // Remove trailing slash
    let url = apiUrl.replace(/\/$/, '');
    // Remove /api suffix if present
    if (url.endsWith('/api')) {
      url = url.slice(0, -4);
    }
    return url;
  })(),
} as const;

/**
 * Static Assets Configuration
 * 
 * Always uses VITE_API_URL without /api suffix for displaying uploaded images.
 * 
 * Example:
 * - VITE_API_URL=https://pms-api.prasowlabs.in/api
 * - SERVER_URL=https://pms-api.prasowlabs.in (without /api)
 * - Image URL: https://pms-api.prasowlabs.in/uploads/profile-photos/file.jpg
 * 
 * Display URLs will be: STATIC_CONFIG.BASE_URL + /uploads/PATH_URL
 */
export const STATIC_CONFIG = {
  BASE_URL: API_CONFIG.SERVER_URL,
} as const;

/**
 * Firebase Configuration
 * All Firebase values must be set in .env file
 */
export const FIREBASE_CONFIG = {
  API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  VAPID_KEY: import.meta.env.VITE_FIREBASE_VAPID_KEY,
} as const;

/**
 * Environment Configuration
 */
export const ENV_CONFIG = {
  IS_DEV: import.meta.env.DEV || import.meta.env.MODE === 'development',
  IS_PROD: import.meta.env.PROD || import.meta.env.MODE === 'production',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
} as const;

/**
 * Validate required environment variables and security settings
 */
export function validateConfig() {
  const required = [
    { key: 'VITE_API_URL', value: API_CONFIG.BASE_URL },
    { key: 'VITE_FIREBASE_API_KEY', value: FIREBASE_CONFIG.API_KEY },
    { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: FIREBASE_CONFIG.AUTH_DOMAIN },
    { key: 'VITE_FIREBASE_PROJECT_ID', value: FIREBASE_CONFIG.PROJECT_ID },
    { key: 'VITE_FIREBASE_STORAGE_BUCKET', value: FIREBASE_CONFIG.STORAGE_BUCKET },
    { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', value: FIREBASE_CONFIG.MESSAGING_SENDER_ID },
    { key: 'VITE_FIREBASE_APP_ID', value: FIREBASE_CONFIG.APP_ID },
    { key: 'VITE_FIREBASE_VAPID_KEY', value: FIREBASE_CONFIG.VAPID_KEY },
  ];

  const missing: string[] = [];
  
  required.forEach(({ key, value }) => {
    if (!value || value === '') {
      if (ENV_CONFIG.IS_DEV) {
        console.warn(`⚠️  ${key} not set in .env file`);
      } else {
        missing.push(key);
      }
    }
  });

  // Security: Enforce HTTPS in production
  if (ENV_CONFIG.IS_PROD && API_CONFIG.BASE_URL && !API_CONFIG.BASE_URL.startsWith('https://')) {
    const errorMsg = 'Security Error: API URL must use HTTPS in production. Current URL: ' + API_CONFIG.BASE_URL;
    console.error('❌ ' + errorMsg);
    throw new Error(errorMsg);
  }

  if (missing.length > 0 && ENV_CONFIG.IS_PROD) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

// Validate on import (only in production)
if (ENV_CONFIG.IS_PROD) {
  validateConfig();
}
