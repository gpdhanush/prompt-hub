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

export const holidaysApi = {
  getAll: async (params?: { year?: number; is_restricted?: boolean }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[] }>('/holidays', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/holidays/${id}`);
    return response.data;
  },

  create: async (data: { holiday_name: string; date: string; is_restricted?: boolean }) => {
    const response = await apiClient.post<{ data: any }>('/holidays', data);
    return response.data;
  },

  update: async (id: number, data: { holiday_name?: string; date?: string; is_restricted?: boolean }) => {
    const response = await apiClient.put<{ data: any }>(`/holidays/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/holidays/${id}`);
    return response.data;
  },
};

