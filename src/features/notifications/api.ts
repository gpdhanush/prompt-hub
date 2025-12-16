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

export const notificationsApi = {
  getAll: async (params?: { is_read?: boolean }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[] }>('/notifications', {
      params: queryParams,
    });
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await apiClient.patch<{ message: string }>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.patch<{ message: string }>('/notifications/read-all');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data;
  },
};

