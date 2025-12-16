import { apiClient } from '@/lib/axios';

export const settingsApi = {
  get: async () => {
    const response = await apiClient.get<{ data: any }>('/settings');
    return response.data;
  },

  update: async (data: any) => {
    const response = await apiClient.patch<{ data: any }>('/settings', data);
    return response.data;
  },
};

