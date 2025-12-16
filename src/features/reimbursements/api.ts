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

export const reimbursementsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    my_claims?: string;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; pagination: any }>('/reimbursements', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/reimbursements/${id}`);
    return response.data;
  },

  create: async (data: FormData) => {
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any; message: string }>('/reimbursements', data, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<{ data: any; message: string }>(`/reimbursements/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/reimbursements/${id}`);
    return response.data;
  },

  approve: async (id: number, data?: { comments?: string }) => {
    const response = await apiClient.post<{ data: any; message: string }>(`/reimbursements/${id}/approve`, data || {});
    return response.data;
  },

  reject: async (id: number, data: { rejection_reason: string }) => {
    const response = await apiClient.post<{ data: any; message: string }>(`/reimbursements/${id}/reject`, data);
    return response.data;
  },

  uploadFiles: async (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any[]; message: string }>(
      `/reimbursements/${id}/attachments`,
      formData,
      {
        headers: {}, // Let axios set Content-Type with boundary for FormData
      }
    );
    return response.data;
  },

  deleteAttachment: async (id: number, attachmentId: number) => {
    const response = await apiClient.delete<{ message: string }>(`/reimbursements/${id}/attachments/${attachmentId}`);
    return response.data;
  },
};

