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

export interface AppIssue {
  id: number;
  uuid: string;
  title: string;
  description: string;
  issue_type: 'bug' | 'feedback';
  status: 'open' | 'in_review' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  is_anonymous: boolean;
  assigned_to?: number;
  assigned_to_name?: string;
  submitted_by?: string;
  created_at: string;
  updated_at: string;
  attachment_count?: number;
  reply_count?: number;
}

export interface AppIssueReply {
  id: number;
  message: string;
  user_id: number;
  user_name: string;
  created_at: string;
}

export interface AppIssueAttachment {
  id: number;
  file_url: string;
  created_at: string;
}

export interface AppIssueDetail extends AppIssue {
  attachments: AppIssueAttachment[];
  replies: AppIssueReply[];
}

export const appIssuesApi = {
  // User APIs
  create: async (formData: FormData) => {
    const response = await apiClient.post<{ data: AppIssue }>('/app-issues', formData, {
      headers: {}, // Let axios set Content-Type with boundary for FormData
    });
    return response.data;
  },

  getMyIssues: async (params?: { page?: number; limit?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{
      data: AppIssue[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>('/app-issues/my', { params: queryParams });
    return response.data;
  },

  getAllIssues: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{
      data: AppIssue[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>('/app-issues/all', { params: queryParams });
    return response.data;
  },

  getIssue: async (uuid: string) => {
    const response = await apiClient.get<{ data: AppIssueDetail }>(`/app-issues/${uuid}`);
    return response.data;
  },

  getReplies: async (uuid: string) => {
    const response = await apiClient.get<{ data: AppIssueReply[] }>(`/app-issues/${uuid}/replies`);
    return response.data;
  },

  uploadAttachments: async (uuid: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('attachments', file));
    const response = await apiClient.post<{ data: AppIssueAttachment[]; message: string }>(
      `/app-issues/${uuid}/attachments`,
      formData,
      { headers: {} }
    );
    return response.data;
  },

  // Admin APIs
  getAllAdmin: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    issue_type?: string;
    is_anonymous?: boolean;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{
      data: AppIssue[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>('/admin/app-issues', { params: queryParams });
    return response.data;
  },

  getAdminIssue: async (uuid: string) => {
    const response = await apiClient.get<{ data: AppIssueDetail }>(`/admin/app-issues/${uuid}`);
    return response.data;
  },

  addAdminReply: async (uuid: string, message: string) => {
    const response = await apiClient.post<{ data: AppIssueReply; message: string }>(
      `/admin/app-issues/${uuid}/reply`,
      { message }
    );
    return response.data;
  },

  updateStatus: async (uuid: string, status: string) => {
    const response = await apiClient.put<{ message: string }>(`/admin/app-issues/${uuid}/status`, { status });
    return response.data;
  },

  assignIssue: async (uuid: string, assigned_to?: number) => {
    const response = await apiClient.put<{ message: string }>(`/admin/app-issues/${uuid}/assign`, { assigned_to });
    return response.data;
  },

};
