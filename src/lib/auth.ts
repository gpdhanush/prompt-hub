/**
 * Authentication Helper Utilities
 * Provides convenient access to authenticated user data from secure storage
 */

import { getItemSync, secureStorageWithCache } from './secureStorage';

/**
 * Gets the current authenticated user from secure storage
 * Returns null if no user is logged in
 */
export function getCurrentUser(): any | null {
  const userStr = getItemSync('user');
  if (!userStr) {
    return null;
  }
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Gets the current authenticated user asynchronously
 * Use this if you need to ensure the latest data from encrypted storage
 */
export async function getCurrentUserAsync(): Promise<any | null> {
  const userStr = await secureStorageWithCache.getItem('user');
  if (!userStr) {
    return null;
  }
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Gets the auth token from secure storage
 */
export function getAuthToken(): string | null {
  return getItemSync('auth_token');
}

/**
 * Gets the auth token asynchronously
 */
export async function getAuthTokenAsync(): Promise<string | null> {
  return await secureStorageWithCache.getItem('auth_token');
}

/**
 * Checks if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  const user = getCurrentUser();
  return !!(token && user);
}

/**
 * Clears all authentication data
 */
export async function clearAuth(): Promise<void> {
  await secureStorageWithCache.removeItem('auth_token');
  await secureStorageWithCache.removeItem('user');
  await secureStorageWithCache.removeItem('remember_me');
}
