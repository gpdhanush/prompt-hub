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

export const projectsApi = {
  getAll: async (params?: { page?: number; limit?: number; my_projects?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; pagination: any }>('/projects', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await apiClient.get<{ data: any }>(`/projects/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<{ data: any }>('/projects', data);
    return response.data;
  },

  update: async (id: number | string, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/projects/${id}`);
    return response.data;
  },

  // Files
  uploadFile: async (id: number, formData: FormData) => {
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any }>(`/projects/${id}/files`, formData, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  getFiles: async (id: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/projects/${id}/files`);
    return response.data;
  },

  deleteFile: async (id: number, fileId: number) => {
    const response = await apiClient.delete<{ message: string }>(`/projects/${id}/files/${fileId}`);
    return response.data;
  },

  // Change Requests
  createChangeRequest: async (id: number, data: any) => {
    const response = await apiClient.post<{ data: any }>(`/projects/${id}/change-requests`, data);
    return response.data;
  },

  getChangeRequests: async (id: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/projects/${id}/change-requests`);
    return response.data;
  },

  updateChangeRequest: async (id: number, requestId: number, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/projects/${id}/change-requests/${requestId}`, data);
    return response.data;
  },

  // Client Call Notes
  createCallNote: async (id: number, data: any) => {
    const response = await apiClient.post<{ data: any }>(`/projects/${id}/call-notes`, data);
    return response.data;
  },

  getCallNotes: async (id: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/projects/${id}/call-notes`);
    return response.data;
  },

  updateCallNote: async (id: number, noteId: number, data: any) => {
    const response = await apiClient.put<{ data: any[] }>(`/projects/${id}/call-notes/${noteId}`, data);
    return response.data;
  },

  deleteCallNote: async (id: number, noteId: number) => {
    const response = await apiClient.delete<{ data: any[] }>(`/projects/${id}/call-notes/${noteId}`);
    return response.data;
  },

  // Daily Status
  createDailyStatus: async (id: number, data: any) => {
    const response = await apiClient.post<{ data: any }>(`/projects/${id}/daily-status`, data);
    return response.data;
  },

  getDailyStatus: async (id: number, params?: { user_id?: number; start_date?: string; end_date?: string }) => {
    const response = await apiClient.get<{ data: any[] }>(`/projects/${id}/daily-status`, {
      params: params ? cleanParams(params) : {},
    });
    return response.data;
  },

  getTotalWorkedTime: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/projects/${id}/total-worked-time`);
    return response.data;
  },

  // Comments
  createComment: async (id: number, data: any) => {
    const response = await apiClient.post<{ data: any }>(`/projects/${id}/comments`, data);
    return response.data;
  },

  getComments: async (id: number, params?: { comment_type?: string }) => {
    const response = await apiClient.get<{ data: any[] }>(`/projects/${id}/comments`, {
      params: params ? cleanParams(params) : {},
    });
    return response.data;
  },

  updateComment: async (id: number, commentId: number, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/projects/${id}/comments/${commentId}`, data);
    return response.data;
  },

  deleteComment: async (id: number, commentId: number) => {
    const response = await apiClient.delete<{ message: string }>(`/projects/${id}/comments/${commentId}`);
    return response.data;
  },

  // Technologies
  updateTechnologies: async (id: number, technologies: string[]) => {
    const response = await apiClient.put<{ data: any }>(`/projects/${id}/technologies`, {
      technologies_used: technologies,
    });
    return response.data;
  },
};

