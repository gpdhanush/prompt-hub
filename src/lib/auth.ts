/**
 * Authentication Helper Utilities
 * Provides convenient access to authenticated user data from secure storage
 */

import { getItemSync, secureStorageWithCache } from './secureStorage';
import { logger } from './logger';

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
    logger.error('Error parsing user data:', error);
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
    logger.error('Error parsing user data:', error);
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

/**
 * Global logout function that can be called from anywhere (including non-React contexts)
 * Clears cache, auth data, and navigates to login page
 */
export async function forceLogout(reason?: string): Promise<void> {
  try {
    logger.warn('Force logout triggered', reason ? `Reason: ${reason}` : '');
    
    // Try to call backend logout API to revoke refresh token
    try {
      const { authApi } = await import('@/features/auth/api');
      const { secureStorageWithCache } = await import('./secureStorage');
      const refreshToken = await secureStorageWithCache.getItem('refresh_token');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (apiError) {
      // Log but don't throw - we still want to clear frontend state
      logger.warn('Logout API call failed during force logout (continuing):', apiError);
    }
    
    // Clear authentication data from secure storage
    await clearAuth();
    
    // Clear auth-related items from localStorage (fallback for non-encrypted storage)
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('remember_me');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear React Query cache if available (via window object)
    // This will be handled by components that use QueryClient
    if (typeof window !== 'undefined' && (window as any).__REACT_QUERY_CLIENT__) {
      (window as any).__REACT_QUERY_CLIENT__.clear();
    }
    
    // Navigate to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  } catch (error) {
    logger.error('Error during force logout:', error);
    // Still navigate to login even if there's an error
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
