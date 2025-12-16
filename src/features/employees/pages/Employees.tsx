import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi } from "@/lib/api";
import { employeesApi } from "@/features/employees/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { EmployeesHeader } from "../components/EmployeesHeader";
import { EmployeesFilters } from "../components/EmployeesFilters";
import { EmployeesTable } from "../components/EmployeesTable";
import { DeleteEmployeeDialog } from "../components/DeleteEmployeeDialog";
import { filterEmployees } from "../utils/utils";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";
import type { Employee } from "../utils/utils";

export default function Employees() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Get current user info to filter Super Admin data
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const canCreateEmployee = ['Admin', 'Super Admin', 'Team Lead', 'Manager'].includes(currentUser?.role || '');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch all employees (fetch large number to get all, then filter client-side)
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 10000 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch roles for filter
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const allEmployees = data?.data || [];
  const allRoles = rolesData?.data || [];

  // Filter out Super Admin employees if current user is not Super Admin
  const baseEmployees = useMemo(() => {
    return isSuperAdmin 
      ? allEmployees 
      : allEmployees.filter((emp: Employee) => emp.role !== 'Super Admin');
  }, [allEmployees, isSuperAdmin]);

  // Client-side filtering for search, role, and status
  const filteredEmployees = useMemo(
    () => filterEmployees(baseEmployees, searchQuery, roleFilter, statusFilter),
    [baseEmployees, searchQuery, roleFilter, statusFilter]
  );

  // Client-side pagination
  const paginatedEmployees = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, page, limit]);

  const total = filteredEmployees.length;
  const totalPages = Math.ceil(total / limit);

  const deleteMutation = useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Success", description: "Employee deleted successfully." });
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = '/login';
      } else {
        toast({ title: "Error", description: error.message || "Failed to delete employee." });
      }
    },
  });

  // Handlers with useCallback
  const handleEditProfile = useCallback((emp: Employee) => {
    navigate(`/employees/${emp.id}/edit`);
  }, [navigate]);

  const handleViewProfile = useCallback((emp: Employee) => {
    navigate(`/employee-profile/${emp.id}`, { state: { from: '/employees' } });
  }, [navigate]);

  const handleDelete = useCallback((emp: Employee) => {
    setSelectedEmployee(emp);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedEmployee) {
      deleteMutation.mutate(selectedEmployee.id);
    }
  }, [selectedEmployee, deleteMutation]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handleRoleFilterChange = useCallback((value: string) => {
    setRoleFilter(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <EmployeesHeader canCreateEmployee={canCreateEmployee} />

      <EmployeesFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        roleFilter={roleFilter}
        onRoleFilterChange={handleRoleFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        roles={allRoles}
      />

      <EmployeesTable
        employees={paginatedEmployees}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        page={page}
        limit={limit}
        total={total}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onView={handleViewProfile}
        onEdit={handleEditProfile}
        onDelete={handleDelete}
      />

      <DeleteEmployeeDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        employee={selectedEmployee}
        isDeleting={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
