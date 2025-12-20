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

export const tasksApi = {
  getAll: async (params?: { page?: number; limit?: number; project_id?: number; my_tasks?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; pagination: any }>('/tasks', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await apiClient.get<{ data: any }>(`/tasks/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<{ data: any }>('/tasks', data);
    return response.data;
  },

  createWithFiles: async (formData: FormData) => {
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any }>('/tasks', formData, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  update: async (id: number | string, data: any) => {
    const response = await apiClient.put<{ data: any }>(`/tasks/${id}`, data);
    return response.data;
  },

  delete: async (id: number | string) => {
    const response = await apiClient.delete<{ message: string }>(`/tasks/${id}`);
    return response.data;
  },

  // Comments
  getComments: async (id: number | string) => {
    const response = await apiClient.get<{ data: any[] }>(`/tasks/${id}/comments`);
    return response.data;
  },

  createComment: async (id: number | string, data: { comment: string; parent_comment_id?: number; role?: string }) => {
    const response = await apiClient.post<{ data: any }>(`/tasks/${id}/comments`, data);
    return response.data;
  },

  // History
  getHistory: async (id: number | string) => {
    const response = await apiClient.get<{ data: any[] }>(`/tasks/${id}/history`);
    return response.data;
  },

  // Timesheets
  getTimesheets: async (id: number | string) => {
    const response = await apiClient.get<{ data: any[] }>(`/tasks/${id}/timesheets`);
    return response.data;
  },

  getTimesheetsByProject: async (params?: { month?: number; year?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[] }>('/tasks/timesheets/by-project', {
      params: queryParams,
    });
    return response.data;
  },

  getTodaySummary: async () => {
    const response = await apiClient.get<{ data: any }>('/tasks/timesheets/today-summary');
    return response.data;
  },

  createTimesheetGeneral: async (data: {
    project_id?: number;
    task_id?: number;
    bug_id?: number;
    date: string;
    hours: number;
    notes?: string;
  }) => {
    const response = await apiClient.post<{ data: any }>('/tasks/timesheets', data);
    return response.data;
  },

  createTimesheet: async (id: number | string, data: { date: string; hours: number; notes?: string }) => {
    const response = await apiClient.post<{ data: any }>(`/tasks/${id}/timesheets`, data);
    return response.data;
  },

  updateTimesheet: async (timesheetId: number, data: { date?: string; hours?: number; notes?: string }) => {
    const response = await apiClient.put<{ data: any }>(`/tasks/timesheets/${timesheetId}`, data);
    return response.data;
  },

  deleteTimesheet: async (timesheetId: number) => {
    const response = await apiClient.delete<{ message: string }>(`/tasks/timesheets/${timesheetId}`);
    return response.data;
  },

  // Attachments
  uploadAttachments: async (id: number | string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('attachments', file));
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any[]; message: string }>(`/tasks/${id}/attachments`, formData, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  deleteAttachment: async (id: number | string, attachmentId: number) => {
    const response = await apiClient.delete<{ message: string }>(`/tasks/${id}/attachments/${attachmentId}`);
    return response.data;
  },
};

