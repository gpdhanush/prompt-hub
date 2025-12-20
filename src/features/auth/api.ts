import { apiClient } from '@/lib/axios';
import { secureStorageWithCache, getItemSync } from '@/lib/secureStorage';
import { API_CONFIG } from '@/lib/config';
import { logger } from '@/lib/logger';

export interface LoginResponse {
  token: string; // Backward compatibility (same as accessToken)
  accessToken?: string;
  refreshToken?: string;
  user: any;
  requiresMfa?: boolean;
  userId?: number;
  sessionToken?: string;
  requiresMfaSetup?: boolean;
  expiresIn?: number;
}

export interface ForgotPasswordResponse {
  message: string;
  success: boolean;
  emailExists: boolean;
}

export interface VerifyOTPResponse {
  success: boolean;
  resetToken: string;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// Auth API - matches original implementation exactly
export const authApi = {
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
    return response.data;
  },

  verifyOTP: async (email: string, otp: string): Promise<VerifyOTPResponse> => {
    const response = await apiClient.post<VerifyOTPResponse>('/auth/verify-otp', { email, otp });
    return response.data;
  },

  resetPassword: async (
    email: string,
    resetToken: string,
    newPassword: string
  ): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', {
      email,
      resetToken,
      newPassword,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  logout: async (refreshToken?: string): Promise<void> => {
    try {
      // Call backend logout API to revoke refresh token
      // Use direct fetch to bypass 401 handler (since token may already be expired)
      const refreshTokenToUse = refreshToken || await secureStorageWithCache.getItem('refresh_token');
      
      // Get auth token for Authorization header (required by logout API)
      let authToken = getItemSync('auth_token');
      if (!authToken) {
        authToken = await secureStorageWithCache.getItem('auth_token');
      }
      
      if (refreshTokenToUse) {
        try {
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          
          // Add Authorization header if token is available
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          
          const response = await fetch(`${API_CONFIG.BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ refreshToken: refreshTokenToUse }),
          });
          
          // Don't throw on 401 - token is already expired/invalid, which is expected during logout
          if (!response.ok && response.status !== 401) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            logger.warn('Logout API call failed:', error);
          } else if (response.status === 401) {
            // 401 is expected if token is expired - silently ignore
            logger.debug('Logout API returned 401 (token already expired, continuing with frontend logout)');
          }
        } catch (fetchError) {
          // Network errors or other issues - log but don't throw
          logger.warn('Logout API call failed (network error):', fetchError);
        }
      }
    } catch (error) {
      // Log error but don't throw - we still want to clear frontend state
      logger.warn('Logout API call failed (continuing with frontend logout):', error);
    }
  },

  getMe: async () => {
    const response = await apiClient.get<{ data: any }>('/auth/me');
    return response.data;
  },

  getPermissions: async () => {
    const response = await apiClient.get<{ data: string[] }>('/auth/me/permissions');
    return response.data;
  },

  updateProfile: async (data: {
    name?: string;
    email?: string;
    mobile?: string;
    password?: string;
    oldPassword?: string;
    session_timeout?: number;
    theme_color?: string;
    theme_mode?: 'light' | 'dark' | 'system';
  }) => {
    const response = await apiClient.put<{ data: any }>('/auth/me/profile', data);
    return response.data;
  },
};

// MFA API - included in auth feature since it's authentication-related
export const mfaApi = {
  setup: async () => {
    const response = await apiClient.post<{
      secret: string;
      qrCode: string;
      backupCodes: string[];
      manualEntryKey: string;
    }>('/mfa/setup');
    return response.data;
  },

  verifySetup: async (code: string, backupCode?: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/mfa/verify-setup', {
      code,
      backupCode,
    });
    return response.data;
  },

  verify: async (userId: number, code: string, backupCode?: string, sessionToken?: string) => {
    const response = await apiClient.post<{
      success: boolean;
      token: string; // Backward compatibility
      accessToken?: string;
      refreshToken?: string;
      user: any;
      expiresIn?: number;
    }>('/mfa/verify', {
      userId,
      code,
      backupCode,
      sessionToken,
    });
    return response.data;
  },

  disable: async (password?: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/mfa/disable', {
      password,
    });
    return response.data;
  },

  getStatus: async () => {
    const response = await apiClient.get<{
      mfaEnabled: boolean;
      mfaRequired: boolean;
      enforcedByAdmin: boolean;
      mfaVerifiedAt: string | null;
      role: string;
    }>('/mfa/status');
    return response.data;
  },

  regenerateBackupCodes: async () => {
    const response = await apiClient.post<{ backupCodes: string[] }>('/mfa/regenerate-backup-codes');
    return response.data;
  },

  getEnforcement: async () => {
    const response = await apiClient.get<{ data: any[] }>('/mfa/enforcement');
    return response.data;
  },

  updateEnforcement: async (
    roleId: number,
    mfaRequired: boolean,
    enforcedByAdmin: boolean
  ) => {
    const response = await apiClient.put<{ success: boolean; message: string }>(
      `/mfa/enforcement/${roleId}`,
      {
        mfa_required: mfaRequired,
        enforced_by_admin: enforcedByAdmin,
      }
    );
    return response.data;
  },
};

