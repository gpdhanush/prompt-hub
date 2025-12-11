const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');
  
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
        console.error('Error parsing user from localStorage:', e);
      }
    }
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new ApiError(response.status, error.error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Network error');
  }
}

// Users API
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    request<{ data: any[]; pagination: any }>(
      `/users?${new URLSearchParams(params as any).toString()}`
    ),
  getById: (id: number) =>
    request<{ data: any }>(`/users/${id}`),
  create: (data: any) => {
    console.log('API: Creating user with data:', data);
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
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    request<{ data: any[]; pagination: any }>(
      `/employees?${new URLSearchParams(params as any).toString()}`
    ),
  getById: (id: number) =>
    request<{ data: any }>(`/employees/${id}`),
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
};

// Projects API
export const projectsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    request<{ data: any[]; pagination: any }>(
      `/projects?${new URLSearchParams(params as any).toString()}`
    ),
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
};

// Tasks API
export const tasksApi = {
  getAll: (params?: { page?: number; limit?: number; project_id?: number }) =>
    request<{ data: any[]; pagination: any }>(
      `/tasks?${new URLSearchParams(params as any).toString()}`
    ),
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
  getAll: (params?: { page?: number; limit?: number }) =>
    request<{ data: any[]; pagination: any }>(
      `/bugs?${new URLSearchParams(params as any).toString()}`
    ),
  getById: (id: number) =>
    request<{ data: any }>(`/bugs/${id}`),
  create: (formData: FormData) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    
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
          console.error('Error parsing user from localStorage:', e);
        }
      }
    }
    
    return fetch(`${API_BASE_URL}/bugs`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: response.statusText };
        }
        console.error('Bug creation error:', errorData);
        throw new ApiError(response.status, errorData.error || errorData.message || 'Request failed');
      }
      return response.json();
    });
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
};

// Attendance API
export const attendanceApi = {
  getAll: (params?: { page?: number; limit?: number; employee_id?: number; date?: string }) =>
    request<{ data: any[]; pagination: any }>(
      `/attendance?${new URLSearchParams(params as any).toString()}`
    ),
  create: (data: any) =>
    request<{ data: any }>('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Leaves API
export const leavesApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    request<{ data: any[]; pagination: any }>(
      `/leaves?${new URLSearchParams(params as any).toString()}`
    ),
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
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () =>
    request<{ data: any }>('/auth/me'),
};

// Reports API
export const reportsApi = {
  getDashboard: () =>
    request<{ data: any }>('/reports/dashboard'),
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: { user_id?: number; is_read?: boolean }) =>
    request<{ data: any[] }>(
      `/notifications?${new URLSearchParams(params as any).toString()}`
    ),
  markAsRead: (id: number) =>
    request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
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
  getAll: (params?: { page?: number; limit?: number }) =>
    request<{ data: any[]; pagination: any }>(
      `/audit-logs?${new URLSearchParams(params as any).toString()}`
    ),
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
