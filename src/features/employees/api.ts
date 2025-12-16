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

export const employeesApi = {
  getAvailablePositions: async () => {
    const response = await apiClient.get<{ data: any[] }>('/employees/available-positions');
    return response.data;
  },

  getAll: async (params?: { page?: number; limit?: number; search?: string; include_all?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; pagination: any }>('/employees', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/employees/${id}`);
    return response.data;
  },

  getBasicById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/employees/${id}/basic`);
    return response.data;
  },

  getByUserId: async (userId: number) => {
    const response = await apiClient.get<{ data: any }>(`/employees/by-user/${userId}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<{ data: any }>('/employees', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/employees/${id}`, data);
    return response.data;
  },

  updateMyProfile: async (data: any) => {
    const response = await apiClient.put<{ data: any }>('/employees/my-profile', data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/employees/${id}`);
    return response.data;
  },

  // Documents
  getDocuments: async (id: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/employees/${id}/documents`);
    return response.data;
  },

  uploadDocument: async (id: number, formData: FormData) => {
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any }>(`/employees/${id}/documents`, formData, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  uploadMyDocument: async (formData: FormData) => {
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any }>('/employees/my-documents', formData, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  deleteDocument: async (id: number, docId: number) => {
    const response = await apiClient.delete<{ message: string }>(`/employees/${id}/documents/${docId}`);
    return response.data;
  },

  verifyDocument: async (id: number, docId: number) => {
    const response = await apiClient.put<{ data: any; message: string }>(`/employees/${id}/documents/${docId}/verify`);
    return response.data;
  },

  unverifyDocument: async (id: number, docId: number) => {
    const response = await apiClient.put<{ data: any; message: string }>(`/employees/${id}/documents/${docId}/unverify`);
    return response.data;
  },

  getHierarchy: async () => {
    const response = await apiClient.get<{ data: any }>('/employees/hierarchy');
    return response.data;
  },
};

