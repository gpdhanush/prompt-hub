import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, Camera } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
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

  // Fetch employees from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', currentPage, pageLimit, searchQuery],
    queryFn: () => employeesApi.getAll({ page: currentPage, limit: pageLimit, search: searchQuery }),
  });

  // Filter out Super Admin employees if current user is not Super Admin
  const allEmployees = data?.data || [];
  const employees = isSuperAdmin 
    ? allEmployees 
    : allEmployees.filter((emp: Employee) => emp.role !== 'Super Admin');
  
  const pagination = data?.pagination || { total: 0, totalPages: 0 };
  const totalPages = pagination.totalPages;

  // Reset to page 1 when search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Handle page limit change
  const handlePageLimitChange = (value: string) => {
    setPageLimit(Number(value));
    setCurrentPage(1);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPages = Math.min(totalPages, 10);
    for (let i = 1; i <= maxPages; i++) {
      pages.push(i);
    }
    return pages;
  };


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
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading employees...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading employees. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee records</p>
        </div>
        <Button onClick={() => navigate('/employees/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pagination.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total Employees</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {employees.filter((e: Employee) => (e.employee_status || e.status) === "Active").length}
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-info">
              {employees.filter((e: Employee) => (e.employee_status || e.status) === "On Leave").length}
            </div>
            <p className="text-xs text-muted-foreground">On Leave</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">
              {employees.filter((e: Employee) => (e.employee_status || e.status) === "Inactive").length}
            </div>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Employees</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees found. Create your first employee using the "Add Employee" button.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Team Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp: Employee) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-mono text-muted-foreground hover:underline"
                          onClick={() => navigate(`/employee-profile/${emp.id}`)}
                        >
                          {emp.emp_code || `EMP-${emp.id}`}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {emp.profile_photo_url && String(emp.profile_photo_url).trim() !== '' && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={getProfilePhotoUrl(emp.profile_photo_url)} />
                              <AvatarFallback className="text-xs">
                                {emp.name.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="font-medium">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                      <TableCell>{emp.role || "N/A"}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.team_lead_name || "N/A"}</TableCell>
                      <TableCell>
                        <StatusBadge variant={(emp.employee_status || emp.status) === "Active" ? "success" : (emp.employee_status || emp.status) === "On Leave" ? "info" : "warning"}>
                          {emp.employee_status || emp.status || "Active"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="page-limit">Rows per page:</Label>
                    <Select value={pageLimit.toString()} onValueChange={handlePageLimitChange}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
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
