import { apiClient } from '@/lib/axios';

export const promptsApi = {
  getAll: async () => {
    const response = await apiClient.get<{ data: any[] }>('/prompts');
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<{ data: any }>('/prompts', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/prompts/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/prompts/${id}`);
    return response.data;
  },
};

