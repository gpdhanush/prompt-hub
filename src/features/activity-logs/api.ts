import { apiClient } from '@/lib/axios';

export const activityLogsApi = {
  getActivityLogs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get<{
      data: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>('/audit-logs/activity', { params });
    return response.data;
  },
};

