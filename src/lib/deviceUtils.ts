/**
 * Device Utilities
 * Functions to generate and manage device IDs for tracking
 */

import { logger } from './logger';

const DEVICE_ID_KEY = 'device_id';

/**
 * Generate a unique device ID
 * Uses a combination of browser fingerprinting and random UUID
 */
function generateDeviceId(): string {
  // Try to get existing device ID from localStorage
  const existingId = localStorage.getItem(DEVICE_ID_KEY);
  if (existingId) {
    return existingId;
  }

  // Generate a new device ID
  // Combine browser info with a random UUID
  const browserInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  // Create a hash-like string from browser info
  const browserHash = btoa(JSON.stringify(browserInfo))
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 16);

  // Generate UUID v4
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  // Combine browser hash with UUID (first 8 chars of UUID)
  const deviceId = `web-${browserHash}-${uuid.substring(0, 8)}`;

  // Store in localStorage
  localStorage.setItem(DEVICE_ID_KEY, deviceId);

  return deviceId;
}

/**
 * Get or create device ID
 * Returns the device ID, creating one if it doesn't exist
 */
export function getDeviceId(): string {
  try {
    return generateDeviceId();
  } catch (error) {
    logger.error('Error getting device ID:', error);
    // Fallback: generate a simple ID
    const fallbackId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    try {
      localStorage.setItem(DEVICE_ID_KEY, fallbackId);
    } catch (e) {
      // If localStorage is not available, return the fallback ID anyway
    }
    return fallbackId;
  }
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  deviceId: string;
  deviceType: string;
  browser: string;
  platform: string;
  userAgent: string;
} {
  const deviceId = getDeviceId();
  
  // Detect browser
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    browser = 'Chrome';
  } else if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browser = 'Safari';
  } else if (userAgent.indexOf('Edg') > -1) {
    browser = 'Edge';
  } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
    browser = 'Opera';
  }

  // Detect platform
  const platform = navigator.platform || 'Unknown';

  return {
    deviceId,
    deviceType: 'web',
    browser,
    platform,
    userAgent,
  };
}

/**
 * Clear device ID (useful for testing or logout)
 */
export function clearDeviceId(): void {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (error) {
    logger.error('Error clearing device ID:', error);
  }
}
