export type Project = {
  id: number;
  project_code?: string;
  name: string;
  description?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  created_by_email?: string;
  updated_by_name?: string;
  updated_by_email?: string;
  team_lead_id?: number;
  team_lead_name?: string;
  team_lead_email?: string;
  member_count?: number;
  logo_url?: string;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const formatFullDate = (dateString?: string): string => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", { 
    year: "numeric",
    month: "long", 
    day: "numeric" 
  });
};

export const filterProjects = (
  projects: Project[],
  searchQuery: string,
  statusFilter: string | null
): Project[] => {
  return projects.filter((project) => {
    const matchesSearch = project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.id?.toString().includes(searchQuery);
    
    let matchesStatus = true;
    if (statusFilter) {
      if (statusFilter === 'In Progress') {
        // Match In Progress, Testing, Pre-Prod, or Production
        matchesStatus = project.status === 'In Progress' || 
                       project.status === 'Testing' || 
                       project.status === 'Pre-Prod' || 
                       project.status === 'Production';
      } else {
        matchesStatus = project.status === statusFilter;
      }
    }
    
    return matchesSearch && matchesStatus;
  });
};

export const calculateProjectStats = (projects: Project[]) => {
  const totalProjects = projects.length;
  const inProgressCount = projects.filter((p) => 
    p.status === 'In Progress' || p.status === 'Testing' || p.status === 'Pre-Prod' || p.status === 'Production'
  ).length;
  const completedCount = projects.filter((p) => p.status === 'Completed').length;
  const onHoldCount = projects.filter((p) => p.status === 'On Hold').length;

  return {
    totalProjects,
    inProgressCount,
    completedCount,
    onHoldCount,
  };
};

