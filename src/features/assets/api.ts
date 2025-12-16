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

export const assetsApi = {
  // Categories
  getCategories: async () => {
    const response = await apiClient.get<{ data: any[] }>('/assets/categories');
    return response.data;
  },

  createCategory: async (data: any) => {
    const response = await apiClient.post<{ data: any; message: string }>('/assets/categories', data);
    return response.data;
  },

  // Assets
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category_id?: number;
    search?: string;
    assigned_only?: string;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; total: number; page: number; limit: number }>('/assets', {
      params: queryParams,
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/assets/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post<{ data: any; message: string }>('/assets', data);
    return response.data;
  },

  createEmployeeAsset: async (data: any) => {
    const response = await apiClient.post<{ data: any; message: string }>('/assets/employee/create', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await apiClient.put<{ message: string }>(`/assets/${id}`, data);
    return response.data;
  },

  deleteAsset: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/assets/${id}`);
    return response.data;
  },

  // Assignments
  getAssignments: async (params?: { page?: number; limit?: number; status?: string; employee_id?: number }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; total: number; page: number; limit: number }>(
      '/assets/assignments/list',
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  assignAsset: async (data: any) => {
    const response = await apiClient.post<{ data: any; message: string }>('/assets/assign', data);
    return response.data;
  },

  returnAsset: async (id: number, data: any) => {
    const response = await apiClient.post<{ message: string }>(`/assets/assignments/${id}/return`, data);
    return response.data;
  },

  getAssignmentHistory: async (assetId: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/assets/assignments/history/${assetId}`);
    return response.data;
  },

  bulkReturnAssignments: async (data: {
    assignment_ids: number[];
    returned_date?: string;
    condition_on_return?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post<{ message: string; results: any[]; errors: any[] }>(
      '/assets/assignments/bulk-return',
      data
    );
    return response.data;
  },

  getAssignmentAnalytics: async (params?: { date_from?: string; date_to?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any }>('/assets/assignments/analytics', {
      params: queryParams,
    });
    return response.data;
  },

  // Tickets
  getTickets: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    ticket_type?: string;
    my_tickets?: string;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; total: number; page: number; limit: number }>(
      '/assets/tickets/list',
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  createTicket: async (data: any) => {
    const response = await apiClient.post<{ data: any; message: string }>('/assets/tickets', data);
    return response.data;
  },

  getTicketById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/assets/tickets/${id}`);
    return response.data;
  },

  updateTicket: async (id: number, data: any) => {
    const response = await apiClient.put<{ message: string }>(`/assets/tickets/${id}`, data);
    return response.data;
  },

  reopenTicket: async (id: number) => {
    const response = await apiClient.put<{ message: string }>(`/assets/tickets/${id}/reopen`);
    return response.data;
  },

  getTicketComments: async (ticketId: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/assets/tickets/${ticketId}/comments`);
    return response.data;
  },

  addTicketComment: async (ticketId: number, data: { comment: string; is_internal?: boolean }) => {
    const response = await apiClient.post<{ data: any; message: string }>(`/assets/tickets/${ticketId}/comments`, data);
    return response.data;
  },

  uploadTicketAttachment: async (ticketId: number, file: File, comment?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (comment) formData.append('comment', comment);
    // Use apiClient for FormData uploads - axios handles Content-Type automatically
    // The interceptor will handle 401 errors
    const response = await apiClient.post<{ data: any; message: string }>(
      `/assets/tickets/${ticketId}/attachments`,
      formData,
      {
        headers: {}, // Let axios set Content-Type with boundary for FormData
      }
    );
    return response.data;
  },

  getTicketAttachments: async (ticketId: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/assets/tickets/${ticketId}/attachments`);
    return response.data;
  },

  deleteTicketAttachment: async (ticketId: number, attachmentId: number) => {
    const response = await apiClient.delete<{ message: string }>(
      `/assets/tickets/${ticketId}/attachments/${attachmentId}`
    );
    return response.data;
  },

  // Inventory
  getInventory: async (params?: {
    page?: number;
    limit?: number;
    category_id?: number;
    search?: string;
    low_stock?: boolean;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; total: number; page: number; limit: number }>(
      '/assets/inventory',
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  getInventoryItem: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/assets/inventory/${id}`);
    return response.data;
  },

  createInventoryItem: async (data: any) => {
    const response = await apiClient.post<{ data: any; message: string }>('/assets/inventory', data);
    return response.data;
  },

  updateInventoryItem: async (id: number, data: any) => {
    const response = await apiClient.put<{ data: any; message: string }>(`/assets/inventory/${id}`, data);
    return response.data;
  },

  deleteInventoryItem: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/assets/inventory/${id}`);
    return response.data;
  },

  adjustStock: async (id: number, data: { quantity: number; reason: string; notes?: string }) => {
    const response = await apiClient.post<{ data: any; message: string }>(`/assets/inventory/${id}/adjust`, data);
    return response.data;
  },

  getInventoryHistory: async (params?: {
    page?: number;
    limit?: number;
    asset_id?: number;
    type?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; total: number; page: number; limit: number }>(
      '/assets/inventory/history',
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  getLowStockAlerts: async () => {
    const response = await apiClient.get<{ data: any[] }>('/assets/inventory/low-stock');
    return response.data;
  },

  getInventoryStats: async () => {
    const response = await apiClient.get<{ data: any }>('/assets/inventory/stats');
    return response.data;
  },

  getInventoryReports: async (params?: {
    report_type: string;
    date_from?: string;
    date_to?: string;
    category_id?: number;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any }>('/assets/inventory/reports', {
      params: queryParams,
    });
    return response.data;
  },

  // Dashboard
  getDashboardStats: async () => {
    const response = await apiClient.get<{ data: any }>('/assets/dashboard/stats');
    return response.data;
  },

  // Maintenance
  getMaintenance: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    asset_id?: number;
    maintenance_type?: string;
  }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; total: number; page: number; limit: number }>(
      '/assets/maintenance',
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  getMaintenanceById: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/assets/maintenance/${id}`);
    return response.data;
  },

  createMaintenance: async (data: any) => {
    const response = await apiClient.post<{ data: any; message: string }>('/assets/maintenance', data);
    return response.data;
  },

  updateMaintenance: async (id: number, data: any) => {
    const response = await apiClient.put<{ message: string }>(`/assets/maintenance/${id}`, data);
    return response.data;
  },

  deleteMaintenance: async (id: number) => {
    const response = await apiClient.delete<{ message: string }>(`/assets/maintenance/${id}`);
    return response.data;
  },

  // Approvals
  getApprovals: async (params?: { page?: number; limit?: number; status?: string; request_type?: string }) => {
    const queryParams = params ? cleanParams(params) : {};
    const response = await apiClient.get<{ data: any[]; total: number; page: number; limit: number }>(
      '/assets/approvals',
      {
        params: queryParams,
      }
    );
    return response.data;
  },

  createApproval: async (data: any) => {
    const response = await apiClient.post<{ data: any; message: string }>('/assets/approvals', data);
    return response.data;
  },

  updateApproval: async (id: number, data: { status: string; comments?: string; rejection_reason?: string }) => {
    const response = await apiClient.put<{ message: string }>(`/assets/approvals/${id}`, data);
    return response.data;
  },

  // Reports
  getReports: async (params: { report_type: string; date_from?: string; date_to?: string; category_id?: number }) => {
    const queryParams = cleanParams(params);
    const response = await apiClient.get<{ data: any }>('/assets/reports', {
      params: queryParams,
    });
    return response.data;
  },

  // Settings
  getSettings: async (category?: string) => {
    const queryParams = category ? { category } : {};
    const response = await apiClient.get<{ data: any[] }>('/assets/settings', {
      params: queryParams,
    });
    return response.data;
  },

  getSetting: async (key: string) => {
    const response = await apiClient.get<{ data: any }>(`/assets/settings/${key}`);
    return response.data;
  },

  updateSetting: async (key: string, data: { setting_value: string; description?: string }) => {
    const response = await apiClient.put<{ message: string }>(`/assets/settings/${key}`, data);
    return response.data;
  },
};

