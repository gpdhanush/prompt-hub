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

export const bugsApi = {
  getAll: async (params?: { page?: number; limit?: number; my_bugs?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; pagination: any }>('/bugs', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/bugs/${id}`);
    return response.data;
  },

  create: async (formData: FormData) => {
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any }>('/bugs', formData, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/bugs/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/bugs/${id}`);
    return response.data;
  },

  getComments: async (id: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/bugs/${id}/comments`);
    return response.data;
  },

  createComment: async (id: number, data: { comment_text: string; parent_id?: number }) => {
    const response = await apiClient.post<{ data: any }>(`/bugs/${id}/comments`, data);
    return response.data;
  },

  uploadAttachments: async (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('attachments', file));
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any[]; message: string }>(`/bugs/${id}/attachments`, formData, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  deleteAttachment: async (id: number, attachmentId: number) => {
    const response = await apiClient.delete<{ message: string }>(`/bugs/${id}/attachments/${attachmentId}`);
    return response.data;
  },
};

