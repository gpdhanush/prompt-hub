import { apiClient } from '@/lib/axios';
import { logger } from '@/lib/logger';

const cleanParams = (params: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      cleaned[key] = params[key];
    }
  });
  return cleaned;
};

export const usersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; pagination: any }>('/users', {
      params: queryParams,
    });
    return response.data;
  },

  getForDropdown: async (params?: { search?: string; limit?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[] }>('/users/for-dropdown', {
      params: queryParams,
    });
    return response.data;
  },

  getAssignable: async () => {
    const response = await apiClient.get<{ data: any[] }>('/users/assignable');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/users/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    logger.debug('API: Creating user with data:', data);
    const response = await apiClient.post<{ data: any }>('/users', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/users/${id}`);
    return response.data;
  },
};

