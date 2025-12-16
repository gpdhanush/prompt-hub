import { apiClient } from '@/lib/axios';

const cleanParams = (params: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      cleaned[key] = params[key];
    }
  });
  return cleaned;
};

export const leavesApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; pagination: any }>('/leaves', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/leaves/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<{ data: any }>('/leaves', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/leaves/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/leaves/${id}`);
    return response.data;
  },
};

