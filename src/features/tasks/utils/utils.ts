export type Task = {
  id: number;
  uuid?: string;
  task_code?: string;
  project_id?: number;
  project_name?: string;
  title: string;
  description?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_to_email?: string;
  developer_id?: number;
  developer_name?: string;
  designer_id?: number;
  designer_name?: string;
  tester_id?: number;
  tester_name?: string;
  priority?: string;
  stage?: string;
  status?: string;
  deadline?: string;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  created_by_email?: string;
  updated_by_name?: string;
  updated_by_email?: string;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export const formatFullDate = (dateString?: string): string => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", { 
    year: "numeric",
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const getPriorityLabel = (priority?: string): string => {
  if (priority === 'Med') return 'Medium';
  return priority || 'Medium';
};

export const filterTasks = (
  tasks: Task[],
  searchQuery: string,
  statusFilter: string
): Task[] => {
  return tasks.filter((task) => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.task_code?.includes(searchQuery) ||
      task.id?.toString().includes(searchQuery);
    const matchesStatus = statusFilter === "All" || task.stage === statusFilter;
    return matchesSearch && matchesStatus;
  });
};

