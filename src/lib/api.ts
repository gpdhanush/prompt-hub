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
  getAll: (params?: { page?: number; limit?: number; search?: string; include_all?: string }) =>
    request<{ data: any[]; pagination: any }>(
      `/employees?${new URLSearchParams(params as any).toString()}`
    ),
  getById: (id: number) =>
    request<{ data: any }>(`/employees/${id}`),
  getBasicById: (id: number) =>
    request<{ data: any }>(`/employees/${id}/basic`),
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
  updateMyProfile: (data: any) =>
    request<{ data: any }>('/employees/my-profile', {
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
      }
      
      const response = await fetch(`${API_BASE_URL}/employees/${id}/documents`, {
        method: 'POST',
        credentials: 'include',
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
  uploadMyDocument: async (formData: FormData) => {
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
      
      const response = await fetch(`${API_BASE_URL}/employees/my-documents`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        
        // Handle 401 errors
        if (response.status === 401) {
          const errorMessage = errorData.error || errorData.message || '';
          if (errorMessage.includes('Invalid token') || 
              errorMessage.includes('User not found') ||
              errorMessage.includes('expired') || 
              errorMessage.includes('Authentication required') ||
              errorMessage.includes('Please login')) {
            logger.warn('Authentication error detected, logging out user:', errorMessage);
            await forceLogout(errorMessage);
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
  verifyDocument: (id: number, docId: number) =>
    request<{ data: any; message: string }>(`/employees/${id}/documents/${docId}/verify`, {
      method: 'PUT',
    }),
  unverifyDocument: (id: number, docId: number) =>
    request<{ data: any; message: string }>(`/employees/${id}/documents/${docId}/unverify`, {
      method: 'PUT',
    }),
  getHierarchy: () =>
    request<{ data: any }>('/employees/hierarchy'),
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
        // Note: user-id header removed - user ID is now in JWT token payload
      }
      
      const response = await fetch(`${API_BASE_URL}/projects/${id}/files`, {
        method: 'POST',
        credentials: 'include',
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
  updateComment: (id: number, commentId: number, data: any) =>
    request<{ data: any }>(`/projects/${id}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteComment: (id: number, commentId: number) =>
    request<{ message: string }>(`/projects/${id}/comments/${commentId}`, {
      method: 'DELETE',
    }),
  // Activities (GitHub/Bitbucket webhooks)
  getActivities: (id: number, params?: { activity_type?: string; limit?: number }) => {
    const queryParams = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return request<{ data: any[] }>(`/projects/${id}/activities${queryParams}`);
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
  createWithFiles: (formData: FormData) =>
    request<{ data: any }>('/tasks', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
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
  // Comments
  getComments: (id: number) =>
    request<{ data: any[] }>(`/tasks/${id}/comments`),
  createComment: (id: number, data: { comment: string; parent_comment_id?: number; role?: string }) =>
    request<{ data: any }>(`/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // History
  getHistory: (id: number) =>
    request<{ data: any[] }>(`/tasks/${id}/history`),
  // Timesheets
  getTimesheets: (id: number) =>
    request<{ data: any[] }>(`/tasks/${id}/timesheets`),
  getTimesheetsByProject: (params?: { month?: number; year?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.year) queryParams.append('year', params.year.toString());
    const queryString = queryParams.toString();
    return request<{ data: any[] }>(`/tasks/timesheets/by-project${queryString ? `?${queryString}` : ''}`);
  },
  createTimesheet: (id: number, data: { date: string; hours: number; notes?: string }) =>
    request<{ data: any }>(`/tasks/${id}/timesheets`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTimesheet: (timesheetId: number, data: { date?: string; hours?: number; notes?: string }) =>
    request<{ data: any }>(`/tasks/timesheets/${timesheetId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTimesheet: (timesheetId: number) =>
    request<{ message: string }>(`/tasks/timesheets/${timesheetId}`, {
      method: 'DELETE',
    }),
  // Attachments
  uploadAttachments: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('attachments', file));
    return request<{ data: any[]; message: string }>(`/tasks/${id}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  deleteAttachment: (id: number, attachmentId: number) =>
    request<{ message: string }>(`/tasks/${id}/attachments/${attachmentId}`, {
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
        // Note: user-id header removed - user ID is now in JWT token payload
      }
      
      const response = await fetch(`${API_BASE_URL}/bugs`, {
        method: 'POST',
        credentials: 'include',
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
  uploadAttachments: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('attachments', file));
    return request<{ data: any[]; message: string }>(`/bugs/${id}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  deleteAttachment: (id: number, attachmentId: number) =>
    request<{ message: string }>(`/bugs/${id}/attachments/${attachmentId}`, {
      method: 'DELETE',
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
  getAll: (params?: { page?: number; limit?: number; status?: string; search?: string; my_claims?: string }) => {
    const cleanParams: any = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof typeof params];
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value;
        }
      });
    }
    return request<{ data: any[]; pagination: any }>(
      `/reimbursements?${new URLSearchParams(cleanParams as any).toString()}`
    );
  },
  getById: (id: number) =>
    request<{ data: any }>(`/reimbursements/${id}`),
  create: (data: FormData) =>
    request<{ data: any; message: string }>('/reimbursements', {
      method: 'POST',
      body: data,
      headers: {}, // Let browser set Content-Type for FormData
    }),
  update: (id: number, data: any) =>
    request<{ data: any; message: string }>(`/reimbursements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/reimbursements/${id}`, {
      method: 'DELETE',
    }),
  approve: (id: number, data?: { comments?: string }) =>
    request<{ data: any; message: string }>(`/reimbursements/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  reject: (id: number, data: { rejection_reason: string }) =>
    request<{ data: any; message: string }>(`/reimbursements/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadFiles: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return request<{ data: any[]; message: string }>(`/reimbursements/${id}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
  deleteAttachment: (id: number, attachmentId: number) =>
    request<{ message: string }>(`/reimbursements/${id}/attachments/${attachmentId}`, {
      method: 'DELETE',
    }),
};

// Auth API
export const authApi = {
  forgotPassword: async (email: string) => {
    return request<{ message: string; success: boolean; emailExists: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyOTP: async (email: string, otp: string) => {
    return request<{ success: boolean; resetToken: string; message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  resetPassword: async (email: string, resetToken: string, newPassword: string) => {
    return request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, resetToken, newPassword }),
    });
  },
  login: (email: string, password: string) =>
    request<{ 
      token: string; // Backward compatibility (same as accessToken)
      accessToken?: string;
      refreshToken?: string;
      user: any; 
      requiresMfa?: boolean; 
      userId?: number; 
      sessionToken?: string; 
      requiresMfaSetup?: boolean;
      expiresIn?: number;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: async (refreshToken?: string) => {
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
          
          const response = await fetch(`${API_BASE_URL}/auth/logout`, {
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
    request<{ 
      success: boolean; 
      token: string; // Backward compatibility
      accessToken?: string;
      refreshToken?: string;
      user: any;
      expiresIn?: number;
    }>('/mfa/verify', {
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
  exportCSV: async (params?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    module?: string;
  }) => {
    const queryString = new URLSearchParams(params as any).toString();
    
    // Get token from secure storage (consistent with other endpoints)
    let token = getItemSync('auth_token');
    if (!token) {
      token = await secureStorageWithCache.getItem('auth_token');
    }
    
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(`${API_CONFIG.BASE_URL}/audit-logs/export/csv${queryString ? `?${queryString}` : ''}`, {
      credentials: 'include',
      headers,
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

// Search API
export const searchApi = {
  global: (query: string, limit?: number) =>
    request<{ data: { groups: Array<{ type: string; label: string; count: number; items: any[] }>; query: string } }>(
      `/search?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`
    ),
};

// Reminders API
export const remindersApi = {
  getAll: (params?: { date?: string; start_date?: string; end_date?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    const query = queryParams.toString();
    return request<{ data: any[] }>(`/reminders${query ? `?${query}` : ''}`);
  },
  getById: (id: number) =>
    request<{ data: any }>(`/reminders/${id}`),
  create: (data: { title: string; description?: string; reminder_date: string; reminder_time: string; reminder_type?: string }) =>
    request<{ data: any }>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<{ title: string; description: string; reminder_date: string; reminder_time: string; reminder_type: string; is_completed: boolean }>) =>
    request<{ data: any }>(`/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/reminders/${id}`, {
      method: 'DELETE',
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

// IT Asset Management API
export const assetsApi = {
  // Categories
  getCategories: () =>
    request<{ data: any[] }>('/assets/categories'),
  createCategory: (data: any) =>
    request<{ data: any; message: string }>('/assets/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Assets
  getAll: (params?: { page?: number; limit?: number; status?: string; category_id?: number; search?: string; assigned_only?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.assigned_only) queryParams.append('assigned_only', params.assigned_only);
    const query = queryParams.toString();
    return request<{ data: any[]; total: number; page: number; limit: number }>(`/assets${query ? `?${query}` : ''}`);
  },
  getById: (id: number) =>
    request<{ data: any }>(`/assets/${id}`),
  create: (data: any) =>
    request<{ data: any; message: string }>('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createEmployeeAsset: (data: any) =>
    request<{ data: any; message: string }>('/assets/employee/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ message: string }>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // Assignments
  getAssignments: (params?: { page?: number; limit?: number; status?: string; employee_id?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id.toString());
    const query = queryParams.toString();
    return request<{ data: any[]; total: number; page: number; limit: number }>(`/assets/assignments/list${query ? `?${query}` : ''}`);
  },
  assignAsset: (data: any) =>
    request<{ data: any; message: string }>('/assets/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  returnAsset: (id: number, data: any) =>
    request<{ message: string }>(`/assets/assignments/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // Tickets
  getTickets: (params?: { page?: number; limit?: number; status?: string; ticket_type?: string; my_tickets?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.ticket_type) queryParams.append('ticket_type', params.ticket_type);
    if (params?.my_tickets) queryParams.append('my_tickets', params.my_tickets);
    const query = queryParams.toString();
    return request<{ data: any[]; total: number; page: number; limit: number }>(`/assets/tickets/list${query ? `?${query}` : ''}`);
  },
  createTicket: (data: any) =>
    request<{ data: any; message: string }>('/assets/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTicketById: (id: number) =>
    request<{ data: any }>(`/assets/tickets/${id}`),
  updateTicket: (id: number, data: any) =>
    request<{ message: string }>(`/assets/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getTicketComments: (ticketId: number) =>
    request<{ data: any[] }>(`/assets/tickets/${ticketId}/comments`),
  addTicketComment: (ticketId: number, data: { comment: string; is_internal?: boolean }) =>
    request<{ data: any; message: string }>(`/assets/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadTicketAttachment: (ticketId: number, file: File, comment?: string) =>
    request<{ data: any; message: string }>(`/assets/tickets/${ticketId}/attachments`, {
      method: 'POST',
      body: (() => {
        const formData = new FormData();
        formData.append('file', file);
        if (comment) formData.append('comment', comment);
        return formData;
      })(),
      headers: {}, // Let the browser set Content-Type for FormData
    }),
  getTicketAttachments: (ticketId: number) =>
    request<{ data: any[] }>(`/assets/tickets/${ticketId}/attachments`),
  deleteTicketAttachment: (ticketId: number, attachmentId: number) =>
    request<{ message: string }>(`/assets/tickets/${ticketId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    }),

  // Inventory
  getInventory: (params?: { page?: number; limit?: number; category_id?: number; search?: string; low_stock?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.low_stock) queryParams.append('low_stock', params.low_stock.toString());
    const query = queryParams.toString();
    return request<{ data: any[]; total: number; page: number; limit: number }>(`/assets/inventory${query ? `?${query}` : ''}`);
  },
  getInventoryItem: (id: number) =>
    request<{ data: any }>(`/assets/inventory/${id}`),
  createInventoryItem: (data: any) =>
    request<{ data: any; message: string }>('/assets/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateInventoryItem: (id: number, data: any) =>
    request<{ data: any; message: string }>(`/assets/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteInventoryItem: (id: number) =>
    request<{ message: string }>(`/assets/inventory/${id}`, {
      method: 'DELETE',
    }),
  adjustStock: (id: number, data: { quantity: number; reason: string; notes?: string }) =>
    request<{ data: any; message: string }>(`/assets/inventory/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getInventoryHistory: (params?: { page?: number; limit?: number; asset_id?: number; type?: string; date_from?: string; date_to?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.asset_id) queryParams.append('asset_id', params.asset_id.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    const query = queryParams.toString();
    return request<{ data: any[]; total: number; page: number; limit: number }>(`/assets/inventory/history${query ? `?${query}` : ''}`);
  },
  getLowStockAlerts: () =>
    request<{ data: any[] }>('/assets/inventory/low-stock'),
  getInventoryStats: () =>
    request<{ data: any }>('/assets/inventory/stats'),
  getInventoryReports: (params?: { report_type: string; date_from?: string; date_to?: string; category_id?: number }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('report_type', params?.report_type || 'stock_levels');
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString());
    const query = queryParams.toString();
    return request<{ data: any }>(`/assets/inventory/reports?${query}`);
  },

  // Dashboard
  getDashboardStats: () =>
    request<{ data: any }>('/assets/dashboard/stats'),

  // Maintenance
  getMaintenance: (params?: { page?: number; limit?: number; status?: string; asset_id?: number; maintenance_type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.asset_id) queryParams.append('asset_id', params.asset_id.toString());
    if (params?.maintenance_type) queryParams.append('maintenance_type', params.maintenance_type);
    const query = queryParams.toString();
    return request<{ data: any[]; total: number; page: number; limit: number }>(`/assets/maintenance${query ? `?${query}` : ''}`);
  },
  getMaintenanceById: (id: number) =>
    request<{ data: any }>(`/assets/maintenance/${id}`),
  createMaintenance: (data: any) =>
    request<{ data: any; message: string }>('/assets/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMaintenance: (id: number, data: any) =>
    request<{ message: string }>(`/assets/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMaintenance: (id: number) =>
    request<{ message: string }>(`/assets/maintenance/${id}`, {
      method: 'DELETE',
    }),

  // Approvals
  getApprovals: (params?: { page?: number; limit?: number; status?: string; request_type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.request_type) queryParams.append('request_type', params.request_type);
    const query = queryParams.toString();
    return request<{ data: any[]; total: number; page: number; limit: number }>(`/assets/approvals${query ? `?${query}` : ''}`);
  },
  createApproval: (data: any) =>
    request<{ data: any; message: string }>('/assets/approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateApproval: (id: number, data: { status: string; comments?: string; rejection_reason?: string }) =>
    request<{ message: string }>(`/assets/approvals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Reports
  getReports: (params: { report_type: string; date_from?: string; date_to?: string; category_id?: number }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('report_type', params.report_type);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.category_id) queryParams.append('category_id', params.category_id.toString());
    return request<{ data: any }>(`/assets/reports?${queryParams.toString()}`);
  },

  // Settings
  getSettings: (category?: string) => {
    const query = category ? `?category=${category}` : '';
    return request<{ data: any[] }>(`/assets/settings${query}`);
  },
  getSetting: (key: string) =>
    request<{ data: any }>(`/assets/settings/${key}`),
  updateSetting: (key: string, data: { setting_value: string; description?: string }) =>
    request<{ message: string }>(`/assets/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete asset
  deleteAsset: (id: number) =>
    request<{ message: string }>(`/assets/${id}`, {
      method: 'DELETE',
    }),

  // Bulk operations
  bulkReturnAssignments: (data: { assignment_ids: number[]; returned_date?: string; condition_on_return?: string; notes?: string }) =>
    request<{ message: string; results: any[]; errors: any[] }>('/assets/assignments/bulk-return', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAssignmentAnalytics: (params?: { date_from?: string; date_to?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    const query = queryParams.toString();
    return request<{ data: any }>(`/assets/assignments/analytics${query ? `?${query}` : ''}`);
  },
  getAssignmentHistory: (assetId: number) =>
    request<{ data: any[] }>(`/assets/assignments/history/${assetId}`),
};

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
