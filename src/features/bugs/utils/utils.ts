export type Bug = {
  id: number;
  bug_code?: string;
  title: string;
  description?: string;
  severity?: string;
  status?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  task_id?: number;
  project_id?: number;
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

