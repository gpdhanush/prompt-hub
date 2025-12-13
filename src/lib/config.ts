/**
 * Centralized Configuration
 * All environment variables and configuration values are accessed through this file
 * This ensures a single source of truth for all configuration
 * 
 * IMPORTANT: All values must be set in .env file. No hardcoded defaults.
 */

import { logger } from './logger';

/**
 * API Configuration
 * VITE_API_URL must be set in .env file
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL,
  // Remove /api suffix to get base server URL
  SERVER_URL: import.meta.env.VITE_API_URL?.replace('/api', '').replace(/\/$/, '') || '',
} as const;

/**
 * Static Assets Configuration
 * VITE_STATIC_URL can be set in .env file, otherwise uses SERVER_URL
 */
export const STATIC_CONFIG = {
  BASE_URL: import.meta.env.VITE_STATIC_URL || API_CONFIG.SERVER_URL,
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
} as const;

/**
 * Validate required environment variables
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
        logger.warn(`⚠️  ${key} not set in .env file`);
      } else {
        missing.push(key);
      }
    }
  });

  if (missing.length > 0 && ENV_CONFIG.IS_PROD) {
    logger.error('❌ Missing required environment variables:', missing.join(', '));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

// Validate on import (only in production)
if (ENV_CONFIG.IS_PROD) {
  validateConfig();
}
