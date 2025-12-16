import { apiClient } from '@/lib/axios';
import { API_CONFIG } from '@/lib/config';
import { secureStorageWithCache, getItemSync } from '@/lib/secureStorage';

const cleanParams = (params: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

export const auditLogsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    module?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; pagination: any; stats: any }>('/audit-logs', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/audit-logs/${id}`);
    return response.data;
  },

  getFilterOptions: async () => {
    const response = await apiClient.get<{ actions: string[]; modules: string[]; users: any[] }>(
      '/audit-logs/filters/options'
    );
    return response.data;
  },

  restore: async (id: number) => {
    const response = await apiClient.post<{ message: string; restoredData: any }>(`/audit-logs/${id}/restore`);
    return response.data;
  },

  exportCSV: async (params?: { startDate?: string; endDate?: string; action?: string; module?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    // For CSV export, we need to use fetch directly to get the blob response
    // Get token from secure storage
    let token = getItemSync('auth_token');
    if (!token) {
      token = await secureStorageWithCache.getItem('auth_token');
    }

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const queryString = new URLSearchParams(queryParams as any).toString();
    return fetch(`${API_CONFIG.BASE_URL}/audit-logs/export/csv${queryString ? `?${queryString}` : ''}`, {
      credentials: 'include',
      headers,
    });
  },
};

