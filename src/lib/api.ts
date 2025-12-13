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

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Start loading
  setGlobalLoading(true);
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
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
    
    // Add user ID header for authentication middleware
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.id) {
          config.headers = {
            ...config.headers,
            'user-id': user.id.toString(),
          };
        }
      } catch (e) {
        logger.error('Error parsing user from secure storage:', e);
      }
    }
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      
      // Handle 401 errors - clear cache, logout, and navigate to login
      if (response.status === 401) {
        const errorMessage = error.error || error.message || '';
        
        // Check if it's an authentication error that requires logout
        if (errorMessage.includes('Invalid token') || 
            errorMessage.includes('User not found') ||
            errorMessage.includes('expired') || 
            errorMessage.includes('Authentication required') ||
            errorMessage.includes('Please login')) {
          // This is a real auth error - logout the user
          logger.warn('Authentication error detected, logging out user:', errorMessage);
          // Force logout will clear cache and navigate to login
          // Page will reload, so we don't need to throw error
          await forceLogout(errorMessage);
          // Return a rejected promise - navigation will happen via window.location
          return Promise.reject(new ApiError(401, 'Session expired. Please login again.'));
        }
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

// Users API
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    request<{ data: any[]; pagination: any }>(
      `/users?${new URLSearchParams(params as any).toString()}`
    ),
  getAssignable: () =>
    request<{ data: any[] }>('/users/assignable'),
  getById: (id: number) =>
    request<{ data: any }>(`/users/${id}`),
  create: (data: any) => {
    logger.debug('API: Creating user with data:', data);
    return request<{ data: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: number, data: any) =>
    request<{ data: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// Employees API
export const employeesApi = {
  getAvailablePositions: () =>
    request<{ data: any[] }>('/employees/available-positions'),
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    request<{ data: any[]; pagination: any }>(
      `/employees?${new URLSearchParams(params as any).toString()}`
    ),
  getById: (id: number) =>
    request<{ data: any }>(`/employees/${id}`),
  getByUserId: (userId: number) =>
    request<{ data: any }>(`/employees/by-user/${userId}`),
  create: (data: any) =>
    request<{ data: any }>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/employees/${id}`, {
      method: 'DELETE',
    }),
  // Documents
  getDocuments: (id: number) =>
    request<{ data: any[] }>(`/employees/${id}/documents`),
  uploadDocument: async (id: number, formData: FormData) => {
    const API_BASE_URL = API_CONFIG.BASE_URL;
    setGlobalLoading(true);
    
    try {
      let token = getItemSync('auth_token');
      let userStr = getItemSync('user');
      
      if (!token) {
        token = await secureStorageWithCache.getItem('auth_token');
      }
      if (!userStr) {
        userStr = await secureStorageWithCache.getItem('user');
      }
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.id) {
              headers['user-id'] = user.id.toString();
            }
          } catch (e) {
            logger.error('Error parsing user from secure storage:', e);
          }
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/employees/${id}/documents`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        
        // Handle 401 errors - clear cache, logout, and navigate to login
        if (response.status === 401) {
          const errorMessage = errorData.error || errorData.message || '';
          
          // Check if it's an authentication error that requires logout
          if (errorMessage.includes('Invalid token') || 
              errorMessage.includes('User not found') ||
              errorMessage.includes('expired') || 
              errorMessage.includes('Authentication required') ||
              errorMessage.includes('Please login')) {
            // This is a real auth error - logout the user
            logger.warn('Authentication error detected, logging out user:', errorMessage);
            // Force logout will clear cache and navigate to login
            await forceLogout(errorMessage);
            // Return a rejected promise - navigation will happen via window.location
            return Promise.reject(new ApiError(401, 'Session expired. Please login again.'));
          }
        }
        
        throw new ApiError(response.status, errorData.error || 'Request failed');
      }
      
      return await response.json();
    } finally {
      setGlobalLoading(false);
    }
  },
  deleteDocument: (id: number, docId: number) =>
    request<{ message: string }>(`/employees/${id}/documents/${docId}`, {
      method: 'DELETE',
    }),
};

// Projects API
export const projectsApi = {
  getAll: (params?: { page?: number; limit?: number; my_projects?: number }) => {
    // Filter out undefined values to avoid sending "undefined" as string
    const cleanParams: any = {};
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== undefined) {
          cleanParams[key] = params[key as keyof typeof params];
        }
      });
    }
    return request<{ data: any[]; pagination: any }>(
      `/projects?${new URLSearchParams(cleanParams as any).toString()}`
    );
  },
  getById: (id: number) =>
    request<{ data: any }>(`/projects/${id}`),
  create: (data: any) =>
    request<{ data: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
  // Files
  uploadFile: async (id: number, formData: FormData) => {
    const API_BASE_URL = API_CONFIG.BASE_URL;
    setGlobalLoading(true);
    
    try {
      let token = getItemSync('auth_token');
      let userStr = getItemSync('user');
      
      // If not in cache, try async retrieval
      if (!token) {
        token = await secureStorageWithCache.getItem('auth_token');
      }
      if (!userStr) {
        userStr = await secureStorageWithCache.getItem('user');
      }
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.id) {
              headers['user-id'] = user.id.toString();
            }
          } catch (e) {
            logger.error('Error parsing user from secure storage:', e);
          }
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/projects/${id}/files`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        
        // Handle 401 errors - clear cache, logout, and navigate to login
        if (response.status === 401) {
          const errorMessage = errorData.error || errorData.message || '';
          
          // Check if it's an authentication error that requires logout
          if (errorMessage.includes('Invalid token') || 
              errorMessage.includes('User not found') ||
              errorMessage.includes('expired') || 
              errorMessage.includes('Authentication required') ||
              errorMessage.includes('Please login')) {
            // This is a real auth error - logout the user
            logger.warn('Authentication error detected, logging out user:', errorMessage);
            // Force logout will clear cache and navigate to login
            await forceLogout(errorMessage);
            // Return a rejected promise - navigation will happen via window.location
            return Promise.reject(new ApiError(401, 'Session expired. Please login again.'));
          }
        }
        
        throw new ApiError(response.status, errorData.error || 'Request failed');
      }
      
      return await response.json();
    } finally {
      setGlobalLoading(false);
    }
  },
  getFiles: (id: number) =>
    request<{ data: any[] }>(`/projects/${id}/files`),
  deleteFile: (id: number, fileId: number) =>
    request<{ message: string }>(`/projects/${id}/files/${fileId}`, {
      method: 'DELETE',
    }),
  // Change Requests
  createChangeRequest: (id: number, data: any) =>
    request<{ data: any }>(`/projects/${id}/change-requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getChangeRequests: (id: number) =>
    request<{ data: any[] }>(`/projects/${id}/change-requests`),
  updateChangeRequest: (id: number, requestId: number, data: any) =>
    request<{ data: any }>(`/projects/${id}/change-requests/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  // Client Call Notes
  createCallNote: (id: number, data: any) =>
    request<{ data: any }>(`/projects/${id}/call-notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCallNotes: (id: number) =>
    request<{ data: any[] }>(`/projects/${id}/call-notes`),
  // Credentials
  createCredential: (id: number, data: any) =>
    request<{ data: any }>(`/projects/${id}/credentials`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCredentials: (id: number) =>
    request<{ data: any[] }>(`/projects/${id}/credentials`),
  updateCredential: (id: number, credId: number, data: any) =>
    request<{ data: any }>(`/projects/${id}/credentials/${credId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  // Daily Status
  createDailyStatus: (id: number, data: any) =>
    request<{ data: any }>(`/projects/${id}/daily-status`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDailyStatus: (id: number, params?: { user_id?: number; start_date?: string; end_date?: string }) => {
    const queryParams = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return request<{ data: any[] }>(`/projects/${id}/daily-status${queryParams}`);
  },
  getTotalWorkedTime: (id: number) =>
    request<{ data: any }>(`/projects/${id}/total-worked-time`),
  // Comments
  createComment: (id: number, data: any) =>
    request<{ data: any }>(`/projects/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getComments: (id: number, params?: { comment_type?: string }) => {
    const queryParams = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return request<{ data: any[] }>(`/projects/${id}/comments${queryParams}`);
  },
  // Technologies
  updateTechnologies: (id: number, technologies: string[]) =>
    request<{ data: any }>(`/projects/${id}/technologies`, {
      method: 'PUT',
      body: JSON.stringify({ technologies_used: technologies }),
    }),
};

// Tasks API
export const tasksApi = {
  getAll: (params?: { page?: number; limit?: number; project_id?: number; my_tasks?: number }) => {
    // Filter out undefined values to avoid sending them in query string
    const cleanParams: any = {};
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] !== undefined) {
          cleanParams[key] = params[key as keyof typeof params];
        }
      });
    }
    return request<{ data: any[]; pagination: any }>(
      `/tasks?${new URLSearchParams(cleanParams).toString()}`
    );
  },
  getById: (id: number) =>
    request<{ data: any }>(`/tasks/${id}`),
  create: (data: any) =>
    request<{ data: any }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};

// Bugs API
export const bugsApi = {
  getAll: (params?: { page?: number; limit?: number; my_bugs?: number }) => {
    // Filter out undefined values to avoid sending "undefined" as string
    const cleanParams: any = {};
    if (params) {
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.limit !== undefined) cleanParams.limit = params.limit;
      if (params.my_bugs !== undefined) cleanParams.my_bugs = params.my_bugs;
    }
    return request<{ data: any[]; pagination: any }>(
      `/bugs?${new URLSearchParams(cleanParams).toString()}`
    );
  },
  getById: (id: number) =>
    request<{ data: any }>(`/bugs/${id}`),
  create: async (formData: FormData) => {
    const API_BASE_URL = API_CONFIG.BASE_URL;
    setGlobalLoading(true);
    
    try {
      let token = getItemSync('auth_token');
      let userStr = getItemSync('user');
      
      // If not in cache, try async retrieval
      if (!token) {
        token = await secureStorageWithCache.getItem('auth_token');
      }
      if (!userStr) {
        userStr = await secureStorageWithCache.getItem('user');
      }
      
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.id) {
              headers['user-id'] = user.id.toString();
            }
          } catch (e) {
            logger.error('Error parsing user from secure storage:', e);
          }
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/bugs`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: response.statusText };
        }
        
        // Handle 401 errors - clear cache, logout, and navigate to login
        if (response.status === 401) {
          const errorMessage = errorData.error || errorData.message || '';
          
          // Check if it's an authentication error that requires logout
          if (errorMessage.includes('Invalid token') || 
              errorMessage.includes('User not found') ||
              errorMessage.includes('expired') || 
              errorMessage.includes('Authentication required') ||
              errorMessage.includes('Please login')) {
            // This is a real auth error - logout the user
            logger.warn('Authentication error detected, logging out user:', errorMessage);
            // Force logout will clear cache and navigate to login
            await forceLogout(errorMessage);
            // Return a rejected promise - navigation will happen via window.location
            return Promise.reject(new ApiError(401, 'Session expired. Please login again.'));
          }
        }
        
        logger.error('Bug creation error:', errorData);
        throw new ApiError(response.status, errorData.error || errorData.message || 'Request failed');
      }
      
      return await response.json();
    } finally {
      setGlobalLoading(false);
    }
  },
  update: (id: number, data: any) =>
    request<{ data: any }>(`/bugs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/bugs/${id}`, {
      method: 'DELETE',
    }),
  getComments: (id: number) =>
    request<{ data: any[] }>(`/bugs/${id}/comments`),
  createComment: (id: number, data: { comment_text: string; parent_id?: number }) =>
    request<{ data: any }>(`/bugs/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};


// Leaves API
export const leavesApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    request<{ data: any[]; pagination: any }>(
      `/leaves?${new URLSearchParams(params as any).toString()}`
    ),
  getById: (id: number) =>
    request<{ data: any }>(`/leaves/${id}`),
  create: (data: any) =>
    request<{ data: any }>('/leaves', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/leaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/leaves/${id}`, {
      method: 'DELETE',
    }),
};

// Reimbursements API
export const reimbursementsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    request<{ data: any[]; pagination: any }>(
      `/reimbursements?${new URLSearchParams(params as any).toString()}`
    ),
  create: (data: any) =>
    request<{ data: any }>('/reimbursements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/reimbursements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any; requiresMfa?: boolean; userId?: number; sessionToken?: string; requiresMfaSetup?: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () =>
    request<{ data: any }>('/auth/me'),
  getPermissions: () =>
    request<{ data: string[] }>('/auth/me/permissions'),
  updateProfile: (data: { name?: string; email?: string; mobile?: string; password?: string; oldPassword?: string; session_timeout?: number }) =>
    request<{ data: any }>('/auth/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// MFA API
export const mfaApi = {
  setup: () =>
    request<{ secret: string; qrCode: string; backupCodes: string[]; manualEntryKey: string }>('/mfa/setup', {
      method: 'POST',
    }),
  verifySetup: (code: string, backupCode?: string) =>
    request<{ success: boolean; message: string }>('/mfa/verify-setup', {
      method: 'POST',
      body: JSON.stringify({ code, backupCode }),
    }),
  verify: (userId: number, code: string, backupCode?: string, sessionToken?: string) =>
    request<{ success: boolean; token: string; user: any }>('/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ userId, code, backupCode, sessionToken }),
    }),
  disable: (password?: string) =>
    request<{ success: boolean; message: string }>('/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  getStatus: () =>
    request<{ mfaEnabled: boolean; mfaRequired: boolean; enforcedByAdmin: boolean; mfaVerifiedAt: string | null; role: string }>('/mfa/status'),
  regenerateBackupCodes: () =>
    request<{ backupCodes: string[] }>('/mfa/regenerate-backup-codes', {
      method: 'POST',
    }),
  getEnforcement: () =>
    request<{ data: any[] }>('/mfa/enforcement'),
  updateEnforcement: (roleId: number, mfaRequired: boolean, enforcedByAdmin: boolean) =>
    request<{ success: boolean; message: string }>(`/mfa/enforcement/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ mfa_required: mfaRequired, enforced_by_admin: enforcedByAdmin }),
    }),
};

// Reports API
export const reportsApi = {
  getDashboard: () =>
    request<{ data: any }>('/reports/dashboard'),
  getTaskMetrics: (params?: { period?: string }) =>
    request<{ data: any }>(`/reports/tasks?${new URLSearchParams(params as any).toString()}`),
  getBugMetrics: (params?: { period?: string }) =>
    request<{ data: any }>(`/reports/bugs?${new URLSearchParams(params as any).toString()}`),
  getLeaderboard: (params?: { period?: string; limit?: number }) =>
    request<{ data: any[] }>(`/reports/leaderboard?${new URLSearchParams(params as any).toString()}`),
  getProjectStats: () =>
    request<{ data: any[] }>('/reports/projects'),
  getTopPerformer: (params?: { period?: string }) =>
    request<{ data: any }>(`/reports/top-performer?${new URLSearchParams(params as any).toString()}`),
  getLeaveReport: (params?: { month?: number; year?: number; search?: string; status?: string; page?: number; limit?: number }) => {
    const cleanParams: any = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value;
        }
      });
    }
    return request<{ data: any[]; summary: any; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/reports/leaves?${new URLSearchParams(cleanParams as any).toString()}`);
  },
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: { is_read?: boolean }) =>
    request<{ data: any[] }>(
      `/notifications?${new URLSearchParams(params as any).toString()}`
    ),
  markAsRead: (id: number) =>
    request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllAsRead: () =>
    request<{ message: string }>('/notifications/read-all', {
      method: 'PATCH',
    }),
  getUnreadCount: () =>
    request<{ count: number }>('/notifications/unread-count'),
};

// Prompts API
export const promptsApi = {
  getAll: () =>
    request<{ data: any[] }>('/prompts'),
  create: (data: any) =>
    request<{ data: any }>('/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/prompts/${id}`, {
      method: 'DELETE',
    }),
};

// Audit Logs API
export const auditLogsApi = {
  getAll: (params?: { 
    page?: number; 
    limit?: number;
    search?: string;
    action?: string;
    module?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    // Filter out undefined, null, and empty string values
    const cleanParams: any = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value;
        }
      });
    }
    const queryString = new URLSearchParams(cleanParams).toString();
    return request<{ data: any[]; pagination: any; stats: any }>(
      `/audit-logs${queryString ? `?${queryString}` : ''}`
    );
  },
  getById: (id: number) =>
    request<{ data: any }>(`/audit-logs/${id}`),
  getFilterOptions: () =>
    request<{ actions: string[]; modules: string[]; users: any[] }>('/audit-logs/filters/options'),
  restore: (id: number) =>
    request<{ message: string; restoredData: any }>(`/audit-logs/${id}/restore`, {
      method: 'POST',
    }),
  exportCSV: (params?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    module?: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    return fetch(`${API_CONFIG.BASE_URL}/audit-logs/export/csv${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
  },
};

// Settings API
export const settingsApi = {
  get: () =>
    request<{ data: any }>('/settings'),
  update: (data: any) =>
    request<{ data: any }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

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
