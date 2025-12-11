import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi, usersApi, rolesApi, positionsApi, rolePositionsApi } from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

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
  hire_date?: string;
};

export default function Employees() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // User form for creating employees (same as Users page)
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "developer",
    position: "",
    mobile: "",
    team_lead_id: "",
  });

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

  // Fetch roles from API
  const { data: rolesData, error: rolesError } = useQuery<{ data: any[] }>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    retry: 1,
  });

  // Fetch positions from API
  const { data: positionsData, error: positionsError } = useQuery<{ data: any[] }>({
    queryKey: ['positions'],
    queryFn: () => positionsApi.getAll(),
    retry: 1,
  });

  // Handle errors for roles and positions
  useEffect(() => {
    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      const error = rolesError as any;
      if (error.status === 403) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view roles. Please contact an administrator.",
          variant: "destructive",
        });
      }
    }
  }, [rolesError]);

  useEffect(() => {
    if (positionsError) {
      console.error('Error fetching positions:', positionsError);
      const error = positionsError as any;
      if (error.status === 403) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view positions. Please contact an administrator.",
          variant: "destructive",
        });
      }
    }
  }, [positionsError]);

  // Fetch position mappings for selected role
  const { data: rolePositionsData } = useQuery({
    queryKey: ['role-positions', userForm.role],
    queryFn: async () => {
      if (!userForm.role || !rolesData?.data) {
        return { data: [] };
      }
      const role = rolesData.data.find((r: any) => roleNameToValue(r.name) === userForm.role);
      if (!role) {
        return { data: [] };
      }
      const result = await rolePositionsApi.getByRole(role.id);
      return result;
    },
    enabled: !!userForm.role && !!rolesData?.data,
  });

  // Fetch Team Lead users for Developer, Designer, and Tester role assignment
  const { data: teamLeadsData } = useQuery({
    queryKey: ['team-leads'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
    enabled: userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester',
  });

  const roles = rolesData?.data || [];
  const allPositions = positionsData?.data || [];
  const rolePositions = rolePositionsData?.data || [];
  const teamLeads = teamLeadsData?.data?.filter((user: any) => user.role === 'Team Lead') || [];

  // Filter positions based on selected role
  let positions = allPositions;
  if (userForm.role && rolePositions.length > 0) {
    const mappedPositions = rolePositions.filter((rp: any) => {
      const isMapped = rp.is_mapped;
      return isMapped === 1 || isMapped === true || isMapped === '1';
    });
    if (mappedPositions.length > 0) {
      positions = mappedPositions.map((rp: any) => {
        const fullPosition = allPositions.find((p: any) => p.id === rp.id);
        return fullPosition || rp;
      }).filter((p: any) => p !== undefined && p !== null);
    } else {
      const hasAnyMappings = rolePositions.some((rp: any) => 
        rp.is_mapped === 1 || rp.is_mapped === true || rp.is_mapped === '1'
      );
      if (!hasAnyMappings) {
        positions = [];
      }
    }
  } else if (userForm.role && rolePositions.length === 0) {
    positions = allPositions;
  }

  // Extended profile form (TL/Manager can edit)
  const [profileForm, setProfileForm] = useState({
    empCode: "",
    department: "",
    photo: null as File | null,
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
    },
    bank: {
      name: "",
      accountNumber: "",
      ifsc: "",
      branch: "",
    },
    pan: "",
    aadhaar: "",
  });

  const employees = data?.data || [];
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

  // Clear position if it's not valid for the selected role
  useEffect(() => {
    if (userForm.role && userForm.position && positions.length > 0) {
      const currentPositionValue = userForm.position;
      const isValidPosition = positions.some((pos: any) => {
        const posValue = positionNameToValue(pos.name);
        return posValue === currentPositionValue;
      });
      if (!isValidPosition) {
        setUserForm(prev => ({ ...prev, position: '' }));
      }
    } else if (userForm.role && userForm.position && positions.length === 0 && rolePositions.length > 0) {
      setUserForm(prev => ({ ...prev, position: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userForm.role, positions.length, userForm.position]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Success", description: "Employee created successfully." });
      setShowAddDialog(false);
      setUserForm({ name: "", email: "", password: "", role: "developer", position: "", mobile: "", team_lead_id: "" });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = '/login';
      } else if (error.status === 403) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to create employees.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to create employee." });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Success", description: "Employee profile updated successfully." });
      setShowEditDialog(false);
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
        toast({ title: "Error", description: error.message || "Failed to update employee." });
      }
    },
  });

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

  const handleAddEmployee = () => {
    // Validate required fields
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Email, Password, Role)",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for Developer, Designer, and Tester roles
    if (userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester') {
      const roleNameMap: Record<string, string> = {
        'developer': 'Developer',
        'designer': 'Designer',
        'tester': 'Tester'
      };
      const roleName = roleNameMap[userForm.role] || userForm.role;
      if (!userForm.position) {
        toast({
          title: "Validation Error",
          description: `Position is required for ${roleName} role`,
          variant: "destructive",
        });
        return;
      }
      if (!userForm.team_lead_id) {
        toast({
          title: "Validation Error",
          description: `Team Lead is required for ${roleName} role`,
          variant: "destructive",
        });
        return;
      }
    }

    createMutation.mutate({
      name: userForm.name,
      email: userForm.email,
      password: userForm.password,
      role: roleValueToName(userForm.role),
      position: userForm.position ? positionValueToName(userForm.position) : undefined,
      mobile: userForm.mobile,
      team_lead_id: (userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester') ? userForm.team_lead_id : undefined,
    });
  };

  const handleEditProfile = (emp: Employee) => {
    setSelectedEmployee(emp);
    setProfileForm({
      empCode: emp.emp_code || "",
      department: emp.department || "",
      photo: null,
      address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      },
      bank: {
        name: "",
        accountNumber: "",
        ifsc: "",
        branch: "",
      },
      pan: "",
      aadhaar: "",
    });
    setShowEditDialog(true);
  };

  const handleSaveProfile = async () => {
    if (selectedEmployee) {
      try {
        // If photo is selected, upload it first
        let photoUrl = null;
        if (profileForm.photo) {
          // For now, convert image to base64 and store
          // In production, upload to cloud storage or file server
          const reader = new FileReader();
          photoUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(profileForm.photo);
          });
        }

        const updateData: any = {
          department: profileForm.department,
          empCode: profileForm.empCode,
          photo: photoUrl,
        };
        updateMutation.mutate({ id: selectedEmployee.id, data: updateData });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to process photo upload.",
          variant: "destructive",
        });
      }
    }
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
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Employee</DialogTitle>
              <DialogDescription>
                Create a user with Developer, Designer, or Tester role. An employee record will be automatically created.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+1234567890"
                    value={userForm.mobile}
                    onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Temporary Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Employee will change on first login"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value, position: "", team_lead_id: "" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.filter((role: any) => ['Developer', 'Designer', 'Tester'].includes(role.name)).map((role: any) => (
                        <SelectItem key={role.id} value={roleNameToValue(role.name)}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position *</Label>
                  <Select 
                    value={userForm.position} 
                    onValueChange={(value) => setUserForm({ ...userForm, position: value })}
                    disabled={!userForm.role || positions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={positions.length === 0 ? "No positions available" : "Select position"} />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No positions available for this role</div>
                      ) : (
                        positions.map((position: any) => (
                          <SelectItem key={position.id} value={positionNameToValue(position.name)}>
                            {position.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester') && (
                <div className="grid gap-2">
                  <Label htmlFor="team_lead">Team Lead *</Label>
                  <Select 
                    value={userForm.team_lead_id} 
                    onValueChange={(value) => setUserForm({ ...userForm, team_lead_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamLeads.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No team leads available</div>
                      ) : (
                        teamLeads.map((tl: any) => (
                          <SelectItem key={tl.id} value={tl.id.toString()}>
                            {tl.name} ({tl.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddEmployee} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Register Employee"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
              {employees.filter((e: Employee) => e.status === "Active").length}
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-info">
              {employees.filter((e: Employee) => e.status === "On Leave").length}
            </div>
            <p className="text-xs text-muted-foreground">On Leave</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">
              {employees.filter((e: Employee) => e.status === "Inactive").length}
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
                    <TableHead>Emp Code</TableHead>
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
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {emp.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{emp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                      <TableCell>{emp.role || "N/A"}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.team_lead_name || "N/A"}</TableCell>
                      <TableCell>
                        <StatusBadge variant={emp.status === "Active" ? "success" : emp.status === "On Leave" ? "info" : "warning"}>
                          {emp.status || "Active"}
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

      {/* Edit Profile Dialog (TL/Manager can add additional details) */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
            <DialogDescription>
              Add additional details for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      {profileForm.photo ? (
                        <AvatarImage src={URL.createObjectURL(profileForm.photo)} />
                      ) : null}
                      <AvatarFallback>
                        {selectedEmployee.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label htmlFor="photo-upload" className="cursor-pointer">
                        <Button variant="outline" type="button" className="w-full">
                          <Camera className="mr-2 h-4 w-4" />
                          {profileForm.photo ? "Change Photo" : "Upload Photo"}
                        </Button>
                      </Label>
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast({
                                title: "Error",
                                description: "File size must be less than 5MB",
                                variant: "destructive",
                              });
                              return;
                            }
                            setProfileForm({ ...profileForm, photo: file });
                          }
                        }}
                      />
                      {profileForm.photo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {profileForm.photo.name} ({(profileForm.photo.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emp-code">Employee Code</Label>
                    <Input
                      id="emp-code"
                      value={profileForm.empCode}
                      onChange={(e) => setProfileForm({ ...profileForm, empCode: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="e.g., Engineering, QA"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pan">PAN Number</Label>
                      <Input
                        id="pan"
                        value={profileForm.pan}
                        onChange={(e) => setProfileForm({ ...profileForm, pan: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="aadhaar">Aadhaar Number</Label>
                      <Input
                        id="aadhaar"
                        value={profileForm.aadhaar}
                        onChange={(e) => setProfileForm({ ...profileForm, aadhaar: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="address-line1">Address Line 1</Label>
                    <Input
                      id="address-line1"
                      value={profileForm.address.line1}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        address: { ...profileForm.address, line1: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address-line2">Address Line 2</Label>
                    <Input
                      id="address-line2"
                      value={profileForm.address.line2}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        address: { ...profileForm.address, line2: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={profileForm.address.city}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, city: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={profileForm.address.state}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, state: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input
                        id="postal-code"
                        value={profileForm.address.postalCode}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, postalCode: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={profileForm.address.country}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, country: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input
                      id="bank-name"
                      value={profileForm.bank.name}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        bank: { ...profileForm.bank, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input
                      id="account-number"
                      value={profileForm.bank.accountNumber}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        bank: { ...profileForm.bank, accountNumber: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ifsc">IFSC Code</Label>
                      <Input
                        id="ifsc"
                        value={profileForm.bank.ifsc}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bank: { ...profileForm.bank, ifsc: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="branch">Branch</Label>
                      <Input
                        id="branch"
                        value={profileForm.bank.branch}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bank: { ...profileForm.bank, branch: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-3">
                  {["Aadhaar", "PAN", "Bank Passbook"].map((docType) => (
                    <div key={docType} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <span className="font-medium">{docType}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          id={`doc-upload-${docType}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast({
                                  title: "Error",
                                  description: "File size must be less than 10MB",
                                  variant: "destructive",
                                });
                                return;
                              }
                              toast({
                                title: "Document Upload",
                                description: `${docType} document "${file.name}" selected. Document upload functionality will be implemented soon.`,
                              });
                              // TODO: Implement document upload to backend
                            }
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`doc-upload-${docType}`) as HTMLInputElement;
                            input?.click();
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveProfile} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

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
