export type Bug = {
  id: number;
  uuid?: string;
  bug_code?: string;
  title: string;
  description?: string;
  bug_type?: string;
  priority?: string;
  status?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_to_email?: string;
  task_id?: number;
  task_title?: string;
  project_id?: number;
  project_name?: string;
  project_uuid?: string;
  team_lead_id?: number;
  team_lead_name?: string;
  reported_by?: number;
  reported_by_name?: string;
  reported_by_email?: string;
  deadline?: string;
  reopened_count?: number;
  created_at?: string;
  updated_at?: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export const formatDeadline = (deadline: string): string => {
  const date = new Date(deadline);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
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

export const filterBugs = (
  bugs: Bug[],
  searchQuery: string,
  statusFilter: string
): Bug[] => {
  return bugs.filter((bug) => {
    const matchesSearch = bug.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.bug_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.id?.toString().includes(searchQuery);
    
    const matchesStatus = statusFilter === "All" || bug.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
};

