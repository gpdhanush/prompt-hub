import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi, rolesApi } from "@/lib/api";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, Loader2, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageTitle } from "@/components/ui/page-title";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

type Employee = {
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

export default function Employees() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Get current user info to filter Super Admin data
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Helper functions (declared before use)
  const roleNameToValue = (roleName: string): string => {
    return roleName.toLowerCase().replace(/\s+/g, "-");
  };

  const roleValueToName = (value: string): string => {
    const mapping: Record<string, string> = {
      'admin': 'Admin',
      'team-lead': 'Team Lead',
      'developer': 'Developer',
      'designer': 'Designer',
      'tester': 'Tester',
      'viewer': 'Viewer',
      'super-admin': 'Super Admin',
    };
    return mapping[value] || value;
  };

  const positionNameToValue = (positionName: string): string => {
    const mapping: Record<string, string> = {
      'Developer': 'developer',
      'Senior Developer': 'senior-dev',
      'Team Lead': 'tech-lead',
      'Project Manager': 'pm',
      'QA Engineer': 'qa',
      'Senior QA Engineer': 'senior-qa',
    };
    return mapping[positionName] || positionName.toLowerCase().replace(/\s+/g, "-");
  };

  const positionValueToName = (value: string): string => {
    const mapping: Record<string, string> = {
      'developer': 'Developer',
      'senior-dev': 'Senior Developer',
      'tech-lead': 'Team Lead',
      'pm': 'Project Manager',
      'qa': 'QA Engineer',
      'senior-qa': 'Senior QA Engineer',
    };
    return mapping[value] || value;
  };

  // Fetch all employees (fetch large number to get all, then filter client-side)
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 10000 }),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Fetch roles for filter
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  const allEmployees = data?.data || [];
  const allRoles = rolesData?.data || [];

  // Filter out Super Admin employees if current user is not Super Admin
  const baseEmployees = isSuperAdmin 
    ? allEmployees 
    : allEmployees.filter((emp: Employee) => emp.role !== 'Super Admin');

  // Client-side filtering for search, role, and status
  const filteredEmployees = useMemo(() => {
    return baseEmployees.filter((employee: Employee) => {
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
  }, [baseEmployees, searchQuery, roleFilter, statusFilter]);

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

  const handleEditProfile = (emp: Employee) => {
    navigate(`/employees/${emp.id}/edit`);
  };

  const handleViewProfile = (emp: Employee) => {
    navigate(`/employee-profile/${emp.id}`);
  };

  const handleDelete = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedEmployee) {
      deleteMutation.mutate(selectedEmployee.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive font-semibold mb-2">Error loading employees</p>
            <p className="text-muted-foreground">Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle
          title="Employees"
          icon={User}
          description="Manage employee records"
        />
        <Button onClick={() => navigate('/employees/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, employee code, or mobile..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select 
              value={roleFilter || "all"} 
              onValueChange={(value) => {
                setRoleFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map((role: any) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={statusFilter || "all"} 
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Resigned">Resigned</SelectItem>
                <SelectItem value="Terminated">Terminated</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
              <CardDescription>List of all employees</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-muted-foreground">
                {searchQuery || roleFilter || statusFilter
                  ? 'Try adjusting your filters'
                  : 'No employees available'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Emp. ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Team Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((emp: Employee) => (
                    <TableRow
                      key={emp.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/employee-profile/${emp.id}`, { state: { from: '/employees' } })}
                    >
                      <TableCell className="font-medium">
                        <span className="font-mono text-sm">{emp.emp_code || `EMP-${emp.id}`}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getProfilePhotoUrl(emp.profile_photo_url || null)} />
                            <AvatarFallback className="text-xs">
                              {emp.name ? emp.name.split(" ").map((n: string) => n[0]).join("") : "E"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{emp.email}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{emp.mobile || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {emp.role || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{emp.team_lead_name || "N/A"}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge 
                          variant={(emp.employee_status || emp.status) === "Active" ? "success" : (emp.employee_status || emp.status) === "On Leave" ? "info" : "warning"}
                        >
                          {emp.employee_status || emp.status || "Active"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewProfile(emp)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditProfile(emp)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(emp)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} employees
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="page-limit" className="text-sm text-muted-foreground">
                    Rows per page:
                  </Label>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setLimit(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20" id="page-limit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete employee {selectedEmployee?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
