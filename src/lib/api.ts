import { secureStorageWithCache, getItemSync } from './secureStorage';
import { API_CONFIG } from './config';
import { logger } from './logger';
import { forceLogout } from './auth';

const API_BASE_URL = API_CONFIG.BASE_URL;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Global loading state management
let loadingCallbacks: Set<(loading: boolean) => void> = new Set();

export function registerLoadingCallback(callback: (loading: boolean) => void) {
  loadingCallbacks.add(callback);
  return () => {
    loadingCallbacks.delete(callback);
  };
}

function setGlobalLoading(loading: boolean) {
  loadingCallbacks.forEach(callback => callback(loading));
}

/**
 * Get CSRF token from meta tag if available
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag ? metaTag.getAttribute('content') : null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Start loading
  setGlobalLoading(true);
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get CSRF token if available
  const csrfToken = getCsrfToken();
  
  const config: RequestInit = {
    credentials: 'include', // Include cookies for HttpOnly cookie support
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available (from secure storage)
  // Try sync first for performance, fallback to async if needed
  let token = getItemSync('auth_token');
  let userStr = getItemSync('user');
  
  // If not in cache, try async retrieval
  if (!token) {
    token = await secureStorageWithCache.getItem('auth_token');
  }
  if (!userStr) {
    userStr = await secureStorageWithCache.getItem('user');
  }
  
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
    // Note: user-id header removed - user ID is now in JWT token payload
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      
      // Handle 401 errors - try to refresh token first, then logout if that fails
      if (response.status === 401) {
        const errorMessage = error.error || error.message || '';
        const errorCode = error.code || '';
        
        // If access token expired, try to refresh it
        if (errorCode === 'TOKEN_EXPIRED' || errorMessage.includes('Access token expired') || errorMessage.includes('expired')) {
          try {
            const refreshToken = await secureStorageWithCache.getItem('refresh_token');
            if (refreshToken) {
              logger.info('Access token expired, attempting to refresh...');
              const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                const newAccessToken = refreshData.accessToken || refreshData.token;
                
                if (newAccessToken) {
                  // Store new access token
                  await secureStorageWithCache.setItem('auth_token', newAccessToken);
                  
                  // Also update refresh token if provided
                  if (refreshData.refreshToken) {
                    await secureStorageWithCache.setItem('refresh_token', refreshData.refreshToken);
                  }
                  
                  logger.info('Token refreshed successfully, retrying original request...');
                  
                  // Retry original request with new token
                  const retryConfig: RequestInit = {
                    ...config,
                    headers: {
                      ...config.headers,
                      Authorization: `Bearer ${newAccessToken}`,
                    },
                  };
                  
                  const retryResponse = await fetch(url, retryConfig);
                  if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    return retryData;
                  }
                  
                  // If retry also fails with 401, fall through to logout
                  if (retryResponse.status === 401) {
                    logger.warn('Retry after token refresh also returned 401, logging out');
                  }
                }
              } else {
                logger.warn('Token refresh failed with status:', refreshResponse.status);
              }
            } else {
              logger.warn('No refresh token available');
            }
          } catch (refreshError) {
            logger.warn('Token refresh failed:', refreshError);
            // Fall through to logout
          }
        }
        
        // All 401 errors should trigger logout (after refresh attempt if applicable)
        // Show alert and logout
        logger.warn('401 Unauthorized - logging out user:', errorMessage);
        
        // Determine error message based on error code
        let toastTitle = "Unauthorized";
        let toastDescription = "Your session has expired. Please login again.";
        
        if (errorCode === 'SESSION_INVALIDATED') {
          toastTitle = "Session Invalidated";
          toastDescription = "You have logged in from another device. Please login again.";
        } else if (errorCode === 'TOKEN_REVOKED' || errorMessage.includes('revoked')) {
          toastTitle = "Session Revoked";
          toastDescription = "Your session has been revoked. Please login again.";
        }
        
        // Show alert using toast (dynamically import to avoid circular dependencies)
        try {
          const { toast } = await import('@/hooks/use-toast');
          toast({
            title: toastTitle,
            description: toastDescription,
            variant: "destructive",
          });
        } catch (toastError) {
          // If toast import fails, use alert as fallback
          alert(`${toastTitle}: ${toastDescription}`);
        }
        
        // Force logout will clear cache and navigate to login
        await forceLogout(errorMessage);
        
        // Return a rejected promise - navigation will happen via window.location
        return Promise.reject(new ApiError(401, 'Unauthorized. Please login again.'));
      }
      
      throw new ApiError(response.status, error.error || 'Request failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Network error');
  } finally {
    // Stop loading
    setGlobalLoading(false);
  }
}

// Users API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/users/api' directly
export { usersApi } from '@/features/users/api';

// Employees API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/employees/api' directly
export { employeesApi } from '@/features/employees/api';

// Projects API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/projects/api' directly
export { projectsApi } from '@/features/projects/api';

// Tasks API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/tasks/api' directly
export { tasksApi } from '@/features/tasks/api';

// Bugs API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/bugs/api' directly
export { bugsApi } from '@/features/bugs/api';


// Leaves API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/leaves/api' directly
export { leavesApi } from '@/features/leaves/api';

// Reimbursements API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/reimbursements/api' directly
export { reimbursementsApi } from '@/features/reimbursements/api';

// Auth API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/auth/api' directly
export { authApi, mfaApi } from '@/features/auth/api';

// Reports API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/reports/api' directly
export { reportsApi } from '@/features/reports/api';

// Notifications API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/notifications/api' directly
export { notificationsApi } from '@/features/notifications/api';

// Prompts API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/prompts/api' directly
export { promptsApi } from '@/features/prompts/api';

// Audit Logs API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/audit-logs/api' directly
export { auditLogsApi } from '@/features/audit-logs/api';

// Settings API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/settings/api' directly
export { settingsApi } from '@/features/settings/api';

// Search API
export const searchApi = {
  global: (query: string, limit?: number) =>
    request<{ data: { groups: Array<{ type: string; label: string; count: number; items: any[] }>; query: string } }>(
      `/search?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`
    ),
};

// Reminders API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/reminders/api' directly
export { remindersApi } from '@/features/reminders/api';

// Roles API
export const rolesApi = {
  getAll: () =>
    request<{ data: any[] }>('/roles'),
  getById: (id: number) =>
    request<{ data: any }>(`/roles/${id}`),
  getPermissions: (id: number) =>
    request<{ data: any[] }>(`/roles/${id}/permissions`),
  updatePermissions: (id: number, permissions: Array<{ permission_id: number; allowed: boolean }>) =>
    request<{ data: any[] }>(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
  create: (data: any) =>
    request<{ data: any }>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/roles/${id}`, {
      method: 'DELETE',
    }),
};

// Positions API
export const positionsApi = {
  getAll: () =>
    request<{ data: any[] }>('/positions'),
  getById: (id: number) =>
    request<{ data: any }>(`/positions/${id}`),
  getAvailable: () =>
    request<{ data: any[] }>('/positions/available'),
  getHierarchy: () =>
    request<{ data: any[] }>('/positions/hierarchy'),
  create: (data: any) =>
    request<{ data: any }>('/positions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/positions/${id}`, {
      method: 'DELETE',
    }),
};

// Role-Position Mappings API
export const rolePositionsApi = {
  getByRole: (roleId: number) =>
    request<{ data: any[] }>(`/role-positions/role/${roleId}`),
  getByPosition: (positionId: number) =>
    request<{ data: any[] }>(`/role-positions/position/${positionId}`),
  updateRoleMappings: (roleId: number, positionIds: number[]) =>
    request<{ data: any[] }>(`/role-positions/role/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ position_ids: positionIds }),
    }),
  updatePositionMappings: (positionId: number, roleIds: number[]) =>
    request<{ data: any[] }>(`/role-positions/position/${positionId}`, {
      method: 'PUT',
      body: JSON.stringify({ role_ids: roleIds }),
    }),
  getAll: () =>
    request<{ data: any[] }>('/role-positions'),
};

// Permissions API
export const fcmApi = {
  register: async (token: string, deviceInfo?: { deviceId?: string; deviceType?: string; browser?: string; platform?: string }) => {
    return request<{ success: boolean; message: string }>('/fcm/register', {
      method: 'POST',
      body: JSON.stringify({ token, ...deviceInfo }),
    });
  },
  unregister: async (token: string) => {
    return request<{ success: boolean; message: string }>('/fcm/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  getTokens: async () => {
    return request<{ data: any[] }>('/fcm/tokens');
  },
  sendTest: async (title?: string, body?: string) => {
    return request<{ success: boolean; message: string }>('/fcm/test', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    });
  },
};

export const permissionsApi = {
  getAll: () =>
    request<{ data: any[] }>('/permissions'),
  getById: (id: number) =>
    request<{ data: any }>(`/permissions/${id}`),
  create: (data: any) =>
    request<{ data: any }>('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/permissions/${id}`, {
      method: 'DELETE',
    }),
};

// Assets API - Re-exported from feature-based API for backward compatibility
// TODO: Update all imports to use '@/features/assets/api' directly
export { assetsApi } from '@/features/assets/api';

// Document Requests API
export const documentRequestsApi = {
  getAll: (params?: { employee_id?: number; request_type?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id.toString());
    if (params?.request_type) queryParams.append('request_type', params.request_type);
    if (params?.status) queryParams.append('status', params.status);
    const query = queryParams.toString();
    return request<{ data: any[] }>(`/document-requests${query ? `?${query}` : ''}`);
  },
  getById: (id: number) =>
    request<{ data: any }>(`/document-requests/${id}`),
  create: (data: { request_type: string; employee_id: number; document_name: string; description?: string; due_date?: string }) =>
    request<{ data: any; message: string }>('/document-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  submit: async (id: number, formData: FormData) => {
    const API_BASE_URL = API_CONFIG.BASE_URL;
    setGlobalLoading(true);
    
    try {
      let token = getItemSync('auth_token');
      if (!token) {
        token = await secureStorageWithCache.getItem('auth_token');
      }
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/document-requests/${id}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new ApiError(response.status, errorData.error || 'Request failed');
      }
      
      return await response.json();
    } finally {
      setGlobalLoading(false);
    }
  },
  provide: async (id: number, formData: FormData) => {
    const API_BASE_URL = API_CONFIG.BASE_URL;
    setGlobalLoading(true);
    
    try {
      let token = getItemSync('auth_token');
      if (!token) {
        token = await secureStorageWithCache.getItem('auth_token');
      }
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/document-requests/${id}/provide`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new ApiError(response.status, errorData.error || 'Request failed');
      }
      
      return await response.json();
    } finally {
      setGlobalLoading(false);
    }
  },
  review: (id: number, data: { status: 'approved' | 'rejected'; review_notes?: string }) =>
    request<{ message: string }>(`/document-requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
