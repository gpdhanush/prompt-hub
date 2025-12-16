export type Employee = {
  id: number;
  emp_code: string;
  name: string;
  email: string;
  mobile?: string;
  department?: string;
  role?: string;
  team_lead_name?: string;
  status?: string;
  employee_status?: string;
  date_of_joining?: string;
  date_of_birth?: string;
  gender?: string;
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  pf_uan_number?: string;
  government_id_number?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  annual_leave_count?: number;
  sick_leave_count?: number;
  casual_leave_count?: number;
  profile_photo_url?: string;
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

export const filterEmployees = (
  employees: Employee[],
  searchQuery: string,
  roleFilter: string,
  statusFilter: string
): Employee[] => {
  return employees.filter((employee) => {
    const matchesSearch = !searchQuery || 
      employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.emp_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.mobile?.includes(searchQuery);
    
    const matchesRole = !roleFilter || employee.role === roleFilter;
    
    const matchesStatus = !statusFilter || 
      employee.employee_status === statusFilter ||
      employee.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });
};

