import { apiClient } from '@/lib/axios';

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

export const reportsApi = {
  getDashboard: async () => {
    const response = await apiClient.get<{ data: any }>('/reports/dashboard');
    return response.data;
  },

  getTaskMetrics: async (params?: { period?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any }>('/reports/tasks', {
      params: queryParams,
    });
    return response.data;
  },

  getBugMetrics: async (params?: { period?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any }>('/reports/bugs', {
      params: queryParams,
    });
    return response.data;
  },

  getLeaderboard: async (params?: { period?: string; limit?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[] }>('/reports/leaderboard', {
      params: queryParams,
    });
    return response.data;
  },

  getProjectStats: async () => {
    const response = await apiClient.get<{ data: any[] }>('/reports/projects');
    return response.data;
  },

  getTopPerformer: async (params?: { period?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any }>('/reports/top-performer', {
      params: queryParams,
    });
    return response.data;
  },

  getLeaveReport: async (params?: {
    month?: number;
    year?: number;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{
      data: any[];
      summary: any;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/reports/leaves', {
      params: queryParams,
    });
    return response.data;
  },
};

