import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { StatusBadge, userStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { usersApi, rolesApi, positionsApi, rolePositionsApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

type User = {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  role: string;
  position?: string;
  status: "Active" | "Inactive" | "Suspended";
  last_login?: string;
};

export default function Users() {
  const queryClient = useQueryClient();
  
  // Get current user info
  const currentUser = getCurrentUser();
  const canManageUsers = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(5);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    position: "",
    mobile: "",
    team_lead_id: "",
  });

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', currentPage, pageLimit, searchQuery],
    queryFn: () => usersApi.getAll({ page: currentPage, limit: pageLimit, search: searchQuery }),
  });

  // Helper function to map role name to frontend value (needed before useQuery)
  const roleNameToValue = (roleName: string): string => {
    return roleName.toLowerCase().replace(/\s+/g, "-");
  };

  // Fetch roles from API
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  // Fetch positions from API
  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn: () => positionsApi.getAll(),
  });

  // Fetch position mappings for selected role
  const { data: rolePositionsData } = useQuery({
    queryKey: ['role-positions', userForm.role],
    queryFn: async () => {
      if (!userForm.role || !rolesData?.data) {
        return { data: [] };
      }
      // Get role ID from role name
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
    enabled: userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester', // Fetch when Developer, Designer, or Tester role is selected
  });

  const roles = rolesData?.data || [];
  const allPositions = positionsData?.data || [];
  const rolePositions = rolePositionsData?.data || [];
  const teamLeads = teamLeadsData?.data?.filter((user: User) => user.role === 'Team Lead') || [];

  // Filter positions based on selected role
  // The API returns all positions with is_mapped flag (0 or 1 from MySQL), so we filter to show only mapped ones
  let positions = allPositions;
  
  if (userForm.role && rolePositions.length > 0) {
    // Filter to only show positions that are mapped to the selected role
    // MySQL returns is_mapped as 0 or 1 (number), handle both number and boolean
    const mappedPositions = rolePositions.filter((rp: any) => {
      const isMapped = rp.is_mapped;
      return isMapped === 1 || isMapped === true || isMapped === '1';
    });
    
    if (mappedPositions.length > 0) {
      // Map to full position objects from allPositions to ensure we have complete data
      positions = mappedPositions.map((rp: any) => {
        const fullPosition = allPositions.find((p: any) => p.id === rp.id);
        return fullPosition || rp;
      }).filter((p: any) => p !== undefined && p !== null);
    } else {
      // Check if there are any mappings at all (some might be 0)
      const hasAnyMappings = rolePositions.some((rp: any) => 
        rp.is_mapped === 1 || rp.is_mapped === true || rp.is_mapped === '1'
      );
      
      if (!hasAnyMappings) {
        // No positions mapped to this role, show empty array
        positions = [];
      }
    }
  } else if (userForm.role && rolePositions.length === 0) {
    // API returned empty array - might mean table doesn't exist or no data
    // Fallback: show all positions (backward compatibility)
    positions = allPositions;
  }



  // Helper function to map position name to frontend value
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

  // Helper function to map frontend value to role name
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

  // Helper function to map frontend value to position name
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

  // Clear position if it's not valid for the selected role
  useEffect(() => {
    if (userForm.role && userForm.position && positions.length > 0) {
      const currentPositionValue = userForm.position;
      // Check if current position is in the filtered positions list
      const isValidPosition = positions.some((pos: any) => {
        const posValue = positionNameToValue(pos.name);
        return posValue === currentPositionValue;
      });
      
      if (!isValidPosition) {
        // Position is not valid for the selected role, clear it
        setUserForm(prev => ({ ...prev, position: '' }));
      }
    } else if (userForm.role && userForm.position && positions.length === 0 && rolePositions.length > 0) {
      // If role has mappings but no positions are available, clear position
      setUserForm(prev => ({ ...prev, position: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userForm.role, positions.length, userForm.position]);

  const users = data?.data || [];
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

  // Generate page numbers to display - show all pages
  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Success", description: "User created successfully." });
      setShowAddDialog(false);
      setUserForm({ name: "", email: "", password: "", role: "", position: "", mobile: "", team_lead_id: "" });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        // Redirect to login
        window.location.href = '/login';
      } else if (error.status === 403) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to create users. Only Admins can create users.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to create user." });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Success", description: "User updated successfully." });
      setShowEditDialog(false);
      setSelectedUser(null);
      setUserForm({ name: "", email: "", password: "", role: "", position: "", mobile: "", team_lead_id: "" });
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
          description: "You don't have permission to update users.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to update user." });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Success", description: "User deleted successfully." });
      setShowDeleteDialog(false);
      setSelectedUser(null);
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
          description: "You don't have permission to delete users.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to delete user." });
      }
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setShowViewDialog(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: roleNameToValue(user.role),
      position: user.position ? positionNameToValue(user.position) : "",
      mobile: user.mobile || "",
      team_lead_id: "", // Will be populated from employees table if needed
    });
    setShowEditDialog(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const handleSaveEdit = () => {
    if (selectedUser) {
      const updateData: any = {
        name: userForm.name,
        email: userForm.email,
        role: roleValueToName(userForm.role),
        position: userForm.position ? positionValueToName(userForm.position) : undefined,
      };
      if (userForm.password) {
        updateData.password = userForm.password;
      }
      if (userForm.mobile) {
        updateData.mobile = userForm.mobile;
      }
      updateMutation.mutate({ id: selectedUser.id, data: updateData });
    }
  };

  const handleCreateUser = () => {
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

    console.log('Creating user with data:', {
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      position: userForm.position,
      team_lead_id: userForm.team_lead_id,
    });

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage system users and access</p>
        </div>
        {canManageUsers ? (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter full name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="user@company.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select 
                    value={userForm.role} 
                    onValueChange={(value) => {
                      const needsTeamLead = value === 'developer' || value === 'designer' || value === 'tester';
                      // Clear position when role changes (position will be filtered based on new role)
                      setUserForm({ 
                        ...userForm, 
                        role: value, 
                        position: '', // Clear position when role changes
                        team_lead_id: needsTeamLead ? userForm.team_lead_id : '' 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role: any) => {
                        // Hide Super Admin from non-Super Admin users
                        if (role.name === 'Super Admin' && currentUser?.role !== 'Super Admin') {
                          return null;
                        }
                        return (
                          <SelectItem key={role.id} value={roleNameToValue(role.name)}>
                            {role.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {!userForm.role && (
                    <p className="text-xs text-destructive">Role is required</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position{(userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester') ? ' *' : ''}</Label>
                  <Select 
                    value={userForm.position} 
                    onValueChange={(value) => setUserForm({ ...userForm, position: value })}
                    disabled={!userForm.role}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!userForm.role ? "Select role first" : positions.length === 0 ? "No positions available for this role" : "Select position"} />
                    </SelectTrigger>
                    <SelectContent>
                      {!userForm.role ? (
                        <div className="p-2 text-sm text-muted-foreground">Please select a role first</div>
                      ) : positions.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {rolePositions.length === 0 
                            ? "Loading positions or no mappings found. If this persists, check if role_positions table exists in database."
                            : rolePositions.some((rp: any) => rp.is_mapped === 1 || rp.is_mapped === true)
                            ? "No positions available for this role"
                            : "No positions mapped to this role. Map positions in Roles & Positions page."}
                        </div>
                      ) : (
                        positions.map((position: any) => (
                          <SelectItem key={position.id} value={positionNameToValue(position.name)}>
                            {position.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {(userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester') && !userForm.position && (
                    <p className="text-xs text-destructive">Position is required for {userForm.role === 'developer' ? 'Developer' : userForm.role === 'designer' ? 'Designer' : 'Tester'} role</p>
                  )}
                </div>
              </div>
              {(userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester') && (
                <div className="grid gap-2">
                  <Label htmlFor="team-lead">Team Lead *</Label>
                  {teamLeads.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-2 border rounded-md">
                      No Team Leads available. Please create a Team Lead user first.
                    </div>
                  ) : (
                    <Select 
                      value={userForm.team_lead_id} 
                      onValueChange={(value) => setUserForm({ ...userForm, team_lead_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Team Lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamLeads.map((tl: User) => (
                          <SelectItem key={tl.id} value={tl.id.toString()}>
                            {tl.name} ({tl.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!userForm.team_lead_id && (userForm.role === 'developer' || userForm.role === 'designer' || userForm.role === 'tester') && (
                    <p className="text-xs text-destructive">Team Lead is required for {userForm.role === 'developer' ? 'Developer' : userForm.role === 'designer' ? 'Designer' : 'Tester'} role</p>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setShowAddDialog(false);
                    setUserForm({ name: "", email: "", password: "", role: "", position: "", mobile: "", team_lead_id: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCreateUser}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Users</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="page-limit" className="text-sm text-muted-foreground whitespace-nowrap">
                    Show:
                  </Label>
                  <Select value={pageLimit.toString()} onValueChange={handlePageLimitChange}>
                    <SelectTrigger id="page-limit" className="w-20">
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
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-destructive">
                    Error loading users. Please check your database connection.
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    #{user.id}
                  </TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={
                        user.role === "Super Admin" ? "purple" :
                        user.role === "Admin" ? "purple" :
                        user.role === "Team Lead" ? "info" :
                        (user.role === "Developer" || user.role === "Designer" || user.role === "Tester") ? "neutral" : "neutral"
                      }
                    >
                      {user.role}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{user.position}</TableCell>
                  <TableCell>
                    <StatusBadge variant={userStatusMap[user.status]}>
                      {user.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.last_login)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canManageUsers && (
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {/* Hide delete button for Super Admin users */}
                            {user.role !== 'Super Admin' && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(user)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {pagination.total > 0 && (
          <div className="flex items-center justify-end border-t px-4 py-4 gap-4">
            <div className="text-sm text-muted-foreground whitespace-nowrap mr-auto">
              Showing {((currentPage - 1) * pageLimit) + 1} to {Math.min(currentPage * pageLimit, pagination.total)} of {pagination.total} user{pagination.total !== 1 ? "s" : ""}
            </div>
            {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {getPageNumbers().map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            )}
          </div>
        )}
      </Card>

      {/* View User Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View user information and details
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">User ID</Label>
                <div className="font-mono text-sm">#{selectedUser.id}</div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Full Name</Label>
                <div className="font-medium">{selectedUser.name}</div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Email</Label>
                <div>{selectedUser.email}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Role</Label>
                  <StatusBadge
                    variant={
                      selectedUser.role === "Super Admin" ? "purple" :
                      selectedUser.role === "Admin" ? "purple" :
                      selectedUser.role === "Team Lead" ? "info" :
                      (selectedUser.role === "Developer" || selectedUser.role === "Designer" || selectedUser.role === "Tester") ? "neutral" : "neutral"
                    }
                  >
                    {selectedUser.role}
                  </StatusBadge>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Position</Label>
                  <div>{selectedUser.position}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <StatusBadge variant={userStatusMap[selectedUser.status]}>
                    {selectedUser.status}
                  </StatusBadge>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Last Login</Label>
                  <div className="text-sm">{formatDate(selectedUser.last_login)}</div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setShowViewDialog(false);
                    handleEdit(selectedUser);
                  }}
                >
                  Edit User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and access
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input 
                id="edit-name" 
                placeholder="Enter full name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email" 
                type="email" 
                placeholder="user@company.com"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Password</Label>
              <Input 
                id="edit-password" 
                type="password" 
                placeholder="Leave blank to keep current password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={userForm.role} 
                  onValueChange={(value) => {
                    // Clear position when role changes (position will be filtered based on new role)
                    setUserForm({ ...userForm, role: value, position: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                    <SelectContent>
                      {roles.map((role: any) => {
                        // Hide Super Admin from non-Super Admin users
                        if (role.name === 'Super Admin' && currentUser?.role !== 'Super Admin') {
                          return null;
                        }
                        return (
                          <SelectItem key={role.id} value={roleNameToValue(role.name)}>
                            {role.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-position">Position</Label>
                <Select 
                  value={userForm.position}
                  onValueChange={(value) => setUserForm({ ...userForm, position: value })}
                  disabled={!userForm.role}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!userForm.role ? "Select role first" : positions.length === 0 ? "No positions available for this role" : "Select position"} />
                  </SelectTrigger>
                  <SelectContent>
                    {!userForm.role ? (
                      <div className="p-2 text-sm text-muted-foreground">Please select a role first</div>
                    ) : positions.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {rolePositions.length === 0 
                          ? "Loading positions or no mappings found. If this persists, check if role_positions table exists in database."
                          : rolePositions.some((rp: any) => rp.is_mapped === 1 || rp.is_mapped === true)
                          ? "No positions available for this role"
                          : "No positions mapped to this role. Map positions in Roles & Positions page."}
                      </div>
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
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedUser(null);
                  setUserForm({ name: "", email: "", password: "", role: "", position: "", mobile: "", team_lead_id: "" });
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user{" "}
              <span className="font-semibold">{selectedUser?.name}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
