import { apiClient } from '@/lib/axios';

export const kanbanApi = {
  // Get all boards
  getBoards: async () => {
    const response = await apiClient.get<{ data: any[] }>('/kanban/boards');
    return response.data;
  },

  // Get board by ID with columns and tasks
  getBoard: async (id: number) => {
    const response = await apiClient.get<{ data: any }>(`/kanban/boards/${id}`);
    return response.data;
  },

  // Create board
  createBoard: async (data: { name: string; description?: string; project_id?: number }) => {
    const response = await apiClient.post<{ data: any }>('/kanban/boards', data);
    return response.data;
  },

  // Update board
  updateBoard: async (id: number, data: { name?: string; description?: string; project_id?: number }) => {
    const response = await apiClient.put<{ data: any }>(`/kanban/boards/${id}`, data);
    return response.data;
  },

  // Create task
  createTask: async (boardId: number, data: {
    title: string;
    description?: string;
    column_id: number;
    priority?: string;
    assigned_to?: number;
    due_date?: string;
    project_id?: number;
    estimated_time?: number;
  }) => {
    const response = await apiClient.post<{ data: any }>(`/kanban/boards/${boardId}/tasks`, data);
    return response.data;
  },

  // Move task
  moveTask: async (taskId: number, data: {
    column_id: number;
    position: number;
    old_column_id?: number;
    old_position?: number;
  }) => {
    const response = await apiClient.patch<{ data: any }>(`/kanban/tasks/${taskId}/move`, data);
    return response.data;
  },

  // Update task
  updateTask: async (taskId: number, data: {
    title?: string;
    description?: string;
    priority?: string;
    assigned_to?: number;
    due_date?: string;
    status?: string;
    estimated_time?: number;
    actual_time?: number;
  }) => {
    const response = await apiClient.put<{ data: any }>(`/kanban/tasks/${taskId}`, data);
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId: number) => {
    const response = await apiClient.delete<{ data: any }>(`/kanban/tasks/${taskId}`);
    return response.data;
  },

  // Update column
  updateColumn: async (columnId: number, data: { name?: string; position?: number }) => {
    const response = await apiClient.put<{ data: any }>(`/kanban/columns/${columnId}`, data);
    return response.data;
  },

  // Delete column
  deleteColumn: async (columnId: number) => {
    const response = await apiClient.delete<{ data: any }>(`/kanban/columns/${columnId}`);
    return response.data;
  },

  // Reorder columns
  reorderColumns: async (boardId: number, columnIds: number[]) => {
    const response = await apiClient.patch<{ data: any[] }>(`/kanban/boards/${boardId}/columns/reorder`, { columnIds });
    return response.data;
  },

  // Get GitHub integration
  getIntegration: async (boardId: number) => {
    const response = await apiClient.get<{ data: any }>(`/kanban/boards/${boardId}/integration`);
    return response.data;
  },

  // Create/Update GitHub integration
  saveIntegration: async (boardId: number, data: {
    github_repo: string;
    webhook_secret: string;
    auto_status_enabled?: boolean;
  }) => {
    const response = await apiClient.post<{ data: any }>(`/kanban/boards/${boardId}/integration`, data);
    return response.data;
  },

  // Time tracking
  startTimeTracking: async (taskId: number) => {
    const response = await apiClient.post<{ data: any }>(`/kanban/tasks/${taskId}/time/start`);
    return response.data;
  },

  stopTimeTracking: async (taskId: number) => {
    const response = await apiClient.post<{ data: any }>(`/kanban/tasks/${taskId}/time/stop`);
    return response.data;
  },

  getTimeLogs: async (taskId: number) => {
    const response = await apiClient.get<{ data: any[] }>(`/kanban/tasks/${taskId}/time`);
    return response.data;
  },

  updateActualTime: async (taskId: number, actualTime: number) => {
    const response = await apiClient.patch<{ data: any }>(`/kanban/tasks/${taskId}/time`, { actual_time: actualTime });
    return response.data;
  },
};

