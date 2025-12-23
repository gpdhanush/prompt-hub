/**
 * Centralized Configuration
 * All environment variables and configuration values are accessed through this file
 * This ensures a single source of truth for all configuration
 * 
 * IMPORTANT: All values must be set in .env file. No hardcoded defaults.
 */

import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Database Configuration
 * All values must be set in .env file
 */
export const DB_CONFIG = {
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  DATABASE: process.env.DB_NAME,
  PORT: parseInt(process.env.DB_PORT || '3306', 10),
  CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
};

/**
 * Server Configuration
 * All values must be set in .env file
 */
export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL,
};
logger.debug('SEVER CONNCTED WITH PORT', SERVER_CONFIG.PORT);
logger.debug('SEVER CONNCTED WITH NODE_ENV', SERVER_CONFIG.NODE_ENV);
logger.debug('SEVER CONNCTED WITH API_BASE_URL', SERVER_CONFIG.API_BASE_URL);

/**
 * JWT Configuration
 * All values must be set in .env file
 */
export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET,
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};

/**
 * Firebase Configuration (Backend)
 * All values must be set in .env file
 */
export const FIREBASE_CONFIG = {
  SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT || '',
  SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
};

/**
 * Encryption Configuration
 * ENCRYPTION_KEY must be set in .env file (64 character hex string)
 */
export const ENCRYPTION_CONFIG = {
  KEY: process.env.ENCRYPTION_KEY,
};

/**
 * File Upload Configuration
 * All values must be set in .env file
 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
};

/**
 * CORS Configuration
 * All values must be set in .env file
 */
export const CORS_CONFIG = {
  ORIGIN: process.env.CORS_ORIGIN || '*',
  CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
};

/**
 * Validate required environment variables
 */
export function validateConfig() {
  const required = [
    { key: 'DB_HOST', value: DB_CONFIG.HOST },
    { key: 'DB_USER', value: DB_CONFIG.USER },
    { key: 'DB_PASSWORD', value: DB_CONFIG.PASSWORD },
    { key: 'DB_NAME', value: DB_CONFIG.DATABASE },
    { key: 'JWT_SECRET', value: JWT_CONFIG.SECRET },
    { key: 'API_BASE_URL', value: SERVER_CONFIG.API_BASE_URL },
  ];

  const missing = [];
  
  required.forEach(({ key, value }) => {
    if (!value || value === '') {
      if (SERVER_CONFIG.NODE_ENV === 'development') {
        logger.warn(`⚠️  ${key} not set in .env file`);
      } else {
        missing.push(key);
      }
    }
  });

  // Warn about encryption key
  if (!ENCRYPTION_CONFIG.KEY) {
    logger.warn('⚠️  ENCRYPTION_KEY not set in .env file. Encryption will use a random key (data will not be recoverable after restart)');
  }

  if (missing.length > 0 && SERVER_CONFIG.NODE_ENV === 'production') {
    logger.error('❌ Missing required environment variables:', missing.join(', '));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

// Validate on import
validateConfig();
