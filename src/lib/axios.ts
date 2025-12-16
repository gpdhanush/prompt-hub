import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';
import { secureStorageWithCache, getItemSync } from './secureStorage';
import { logger } from './logger';
import { forceLogout } from './auth';
import { handleApiError } from './errorHandler';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true, // Include cookies for HttpOnly cookie support
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get CSRF token from meta tag if available
    if (typeof document !== 'undefined') {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) {
        const csrfToken = metaTag.getAttribute('content');
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }
    }

    // Add auth token
    let token = getItemSync('auth_token');
    if (!token) {
      token = await secureStorageWithCache.getItem('auth_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    logger.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const errorData = error.response.data as any;
      const errorMessage = errorData?.error || errorData?.message || '';
      const errorCode = errorData?.code || '';

      // If access token expired, try to refresh it
      if (errorCode === 'TOKEN_EXPIRED' || errorMessage.includes('Access token expired') || errorMessage.includes('expired')) {
        try {
          const refreshToken = await secureStorageWithCache.getItem('refresh_token');
          if (refreshToken) {
            logger.info('Access token expired, attempting to refresh...');
            
            const refreshResponse = await axios.post(
              `${API_CONFIG.BASE_URL}/auth/refresh`,
              { refreshToken },
              {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' },
              }
            );

            if (refreshResponse.data) {
              const newAccessToken = refreshResponse.data.accessToken || refreshResponse.data.token;

              if (newAccessToken) {
                await secureStorageWithCache.setItem('auth_token', newAccessToken);

                if (refreshResponse.data.refreshToken) {
                  await secureStorageWithCache.setItem('refresh_token', refreshResponse.data.refreshToken);
                }

                logger.info('Token refreshed successfully, retrying original request...');

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);
              }
            }
          }
        } catch (refreshError) {
          logger.warn('Token refresh failed:', refreshError);
        }
      }

      // All 401 errors should trigger logout (after refresh attempt if applicable)
      logger.warn('401 Unauthorized - logging out user:', errorMessage);

      // Determine error message based on error code
      let toastTitle = 'Unauthorized';
      let toastDescription = 'Your session has expired. Please login again.';

      if (errorCode === 'SESSION_INVALIDATED') {
        toastTitle = 'Session Invalidated';
        toastDescription = 'You have logged in from another device. Please login again.';
      } else if (errorCode === 'TOKEN_REVOKED' || errorMessage.includes('revoked')) {
        toastTitle = 'Session Revoked';
        toastDescription = 'Your session has been revoked. Please login again.';
      }

      // Show error toast
      handleApiError(error, { title: toastTitle, description: toastDescription });

      // Force logout
      await forceLogout(errorMessage);
    } else {
      // Handle other errors
      handleApiError(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

