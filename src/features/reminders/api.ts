import { apiClient } from '@/lib/axios';

const cleanParams = (params: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleaned[key] = params[key];
    }
  });
  return cleaned;
};

export const remindersApi = {
  getAll: async (params?: { date?: string; start_date?: string; end_date?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[] }>('/reminders', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/reminders/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description?: string;
    reminder_date: string;
    reminder_time: string;
    reminder_type?: string;
  }) => {
    const response = await apiClient.post<{ data: any }>('/reminders', data);
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<{
      title: string;
      description: string;
      reminder_date: string;
      reminder_time: string;
      reminder_type: string;
      is_completed: boolean;
    }>
  ) => {
    const response = await apiClient.put<{ data: any }>(`/reminders/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/reminders/${id}`);
    return response.data;
  },
};

