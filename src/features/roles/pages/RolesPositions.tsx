import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Shield, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rolesApi, positionsApi, rolePositionsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";

type Role = {
  id: number;
  name: string;
  description?: string;
  reporting_person_role_id?: number;
  reporting_person_role_name?: string;
  level?: number | null;
  created_at?: string;
  updated_at?: string;
};

type Position = {
  id: number;
  name: string;
  description?: string;
  level?: number | null;
  parent_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

export default function RolesPositions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'roles' | 'positions'>('roles');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Roles state
  const [showRoleAddDialog, setShowRoleAddDialog] = useState(false);
  const [showRoleEditDialog, setShowRoleEditDialog] = useState(false);
  const [showRoleDeleteDialog, setShowRoleDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    reporting_person_role_id: "",
    level: "" as string | number,
  });
  
  // Positions state
  const [showPositionAddDialog, setShowPositionAddDialog] = useState(false);
  const [showPositionEditDialog, setShowPositionEditDialog] = useState(false);
  const [showPositionDeleteDialog, setShowPositionDeleteDialog] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [positionForm, setPositionForm] = useState({
    name: "",
    description: "",
    role_ids: [] as number[],
  });

  // Role-Position mapping state
  const [showPositionMappingDialog, setShowPositionMappingDialog] = useState(false);
  const [selectedRoleForMapping, setSelectedRoleForMapping] = useState<Role | null>(null);
  const [selectedPositionIds, setSelectedPositionIds] = useState<number[]>([]);
  const [isCreatingPosition, setIsCreatingPosition] = useState(false);
  const [isUpdatingPosition, setIsUpdatingPosition] = useState(false);

  // Get current user info
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  
  // Use permission-based check - Super Admin always has all permissions
  // Note: Roles management is system-level, so we check if user is Super Admin
  // (Super Admin always has all permissions via usePermissions hook)
  const { hasPermission } = usePermissions();
  // Since roles don't have their own permissions, we check if user is Super Admin
  // Super Admin always returns true for hasPermission, so we can use a simple check
  const canAccessRoles = userRole === 'Super Admin';
  
  if (!canAccessRoles) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Only Super Admin can access Roles & Positions management.</p>
        </div>
      </div>
    );
  }

  // Fetch roles - optimized query
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    staleTime: 1000 * 60 * 30, // 30 minutes (roles rarely change)
    gcTime: 1000 * 60 * 60, // 60 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch positions - optimized query
  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: () => positionsApi.getAll(),
    staleTime: 1000 * 60 * 30, // 30 minutes (positions rarely change)
    gcTime: 1000 * 60 * 60, // 60 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch positions for role mapping - optimized query
  const { data: rolePositionsData, isLoading: rolePositionsLoading } = useQuery({
    queryKey: ['role-positions', selectedRoleForMapping?.id],
    queryFn: () => rolePositionsApi.getByRole(selectedRoleForMapping!.id),
    enabled: !!selectedRoleForMapping,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch roles for position mapping (when creating/editing position) - optimized query
  const { data: positionRolesData } = useQuery({
    queryKey: ['position-roles', selectedPosition?.id],
    queryFn: () => rolePositionsApi.getByPosition(selectedPosition!.id),
    enabled: !!selectedPosition && showPositionEditDialog,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 60 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Memoized derived values
  const roles = useMemo(() => rolesData?.data || [], [rolesData?.data]);
  const positions = useMemo(() => positionsData?.data || [], [positionsData?.data]);
  const rolePositions = useMemo(() => rolePositionsData?.data || [], [rolePositionsData?.data]);

  // Update selected position IDs when role positions data loads
  useEffect(() => {
    if (rolePositions.length > 0 && selectedRoleForMapping) {
      const mappedIds = rolePositions
        .filter((rp: any) => rp.is_mapped)
        .map((rp: any) => rp.id);
      setSelectedPositionIds(mappedIds);
    } else if (selectedRoleForMapping) {
      setSelectedPositionIds([]);
    }
  }, [rolePositions, selectedRoleForMapping]);

  // Filter roles and positions based on search - memoized
  const filteredRoles = useMemo(() => 
    roles.filter((role: Role) =>
      role.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [roles, searchQuery]
  );

  const filteredPositions = useMemo(() =>
    positions.filter((position: Position) =>
      position.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [positions, searchQuery]
  );

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: "Success", description: "Role created successfully." });
      setShowRoleAddDialog(false);
      setRoleForm({ name: "", description: "", reporting_person_role_id: "", level: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role.",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: "Success", description: "Role updated successfully." });
      setShowRoleEditDialog(false);
      setSelectedRole(null);
      setRoleForm({ name: "", description: "", reporting_person_role_id: "", level: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role.",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: "Success", description: "Role deleted successfully." });
      setShowRoleDeleteDialog(false);
      setSelectedRole(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role.",
        variant: "destructive",
      });
    },
  });



  const deletePositionMutation = useMutation({
    mutationFn: positionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast({ title: "Success", description: "Position deleted successfully." });
      setShowPositionDeleteDialog(false);
      setSelectedPosition(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete position.",
        variant: "destructive",
      });
    },
  });

  // Role handlers - memoized
  const handleCreateRole = useCallback(() => {
    if (!roleForm.name) {
      toast({
        title: "Validation Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }
    createRoleMutation.mutate({
      name: roleForm.name,
      description: roleForm.description,
      reporting_person_role_id: roleForm.reporting_person_role_id && roleForm.reporting_person_role_id !== "" ? parseInt(roleForm.reporting_person_role_id) : null,
      level: roleForm.level && roleForm.level !== "" ? parseInt(roleForm.level as string) : null,
    });
  }, [roleForm, createRoleMutation]);

  const handleEditRole = useCallback((role: Role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      reporting_person_role_id: role.reporting_person_role_id?.toString() || "",
      level: role.level?.toString() || "",
    });
    setShowRoleEditDialog(true);
  }, []);

  const handleUpdateRole = useCallback(() => {
    if (!selectedRole || !roleForm.name) {
      toast({
        title: "Validation Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }
    updateRoleMutation.mutate({
      id: selectedRole.id,
      data: {
        name: roleForm.name,
        description: roleForm.description,
        reporting_person_role_id: roleForm.reporting_person_role_id && roleForm.reporting_person_role_id !== "" ? parseInt(roleForm.reporting_person_role_id) : null,
        level: roleForm.level && roleForm.level !== "" ? parseInt(roleForm.level as string) : null,
      },
    });
  }, [selectedRole, roleForm, updateRoleMutation]);

  const handleDeleteRole = useCallback((role: Role) => {
    setSelectedRole(role);
    setShowRoleDeleteDialog(true);
  }, []);

  const confirmDeleteRole = useCallback(() => {
    if (selectedRole) {
      deleteRoleMutation.mutate(selectedRole.id);
    }
  }, [selectedRole, deleteRoleMutation]);

  // Position handlers - memoized
  const handleCreatePosition = useCallback(async () => {
    if (!positionForm.name) {
      toast({
        title: "Validation Error",
        description: "Position name is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingPosition(true);
    try {
      // First create the position (positions are for display only - no hierarchy required)
      const result = await positionsApi.create({
        name: positionForm.name,
        description: positionForm.description,
      });
      
      const newPositionId = result.data.id;
      
      // Then update role mappings if any roles selected
      if (positionForm.role_ids.length > 0) {
        await rolePositionsApi.updatePositionMappings(newPositionId, positionForm.role_ids);
      }
      
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['role-positions'] });
      toast({ title: "Success", description: "Position created successfully." });
      setShowPositionAddDialog(false);
      setPositionForm({ name: "", description: "", role_ids: [] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create position.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPosition(false);
    }
  }, [positionForm, queryClient]);

  const handleEditPosition = useCallback(async (position: Position) => {
    setSelectedPosition(position);
    setPositionForm({
      name: position.name,
      description: position.description || "",
      role_ids: [],
    });
    
    // Fetch existing role mappings
    try {
      const rolesData = await rolePositionsApi.getByPosition(position.id);
      const mappedRoleIds = rolesData.data
        .filter((r: any) => r.is_mapped)
        .map((r: any) => r.id);
      setPositionForm(prev => ({ ...prev, role_ids: mappedRoleIds }));
    } catch (error) {
      console.error('Failed to fetch role mappings:', error);
    }
    
    setShowPositionEditDialog(true);
  }, []);

  const handleUpdatePosition = useCallback(async () => {
    if (!selectedPosition || !positionForm.name) {
      toast({
        title: "Validation Error",
        description: "Position name is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdatingPosition(true);
    try {
      // First update the position (positions are for display only - no hierarchy required)
      await positionsApi.update(selectedPosition.id, {
        name: positionForm.name,
        description: positionForm.description,
      });
      
      // Then update role mappings
      await rolePositionsApi.updatePositionMappings(selectedPosition.id, positionForm.role_ids);
      
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['role-positions'] });
      toast({ title: "Success", description: "Position updated successfully." });
      setShowPositionEditDialog(false);
      setSelectedPosition(null);
      setPositionForm({ name: "", description: "", role_ids: [] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update position.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPosition(false);
    }
  }, [selectedPosition, positionForm, queryClient]);

  const handleDeletePosition = useCallback((position: Position) => {
    setSelectedPosition(position);
    setShowPositionDeleteDialog(true);
  }, []);

  const confirmDeletePosition = useCallback(() => {
    if (selectedPosition) {
      deletePositionMutation.mutate(selectedPosition.id);
    }
  }, [selectedPosition, deletePositionMutation]);

  // Position mapping handlers - memoized
  const handleManagePositions = useCallback((role: Role) => {
    setSelectedRoleForMapping(role);
    setShowPositionMappingDialog(true);
  }, []);

  const updateRolePositionMappingMutation = useMutation({
    mutationFn: ({ roleId, positionIds }: { roleId: number; positionIds: number[] }) =>
      rolePositionsApi.updateRoleMappings(roleId, positionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-positions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: "Success", description: "Position mappings updated successfully." });
      setShowPositionMappingDialog(false);
      setSelectedRoleForMapping(null);
      setSelectedPositionIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update position mappings.",
        variant: "destructive",
      });
    },
  });

  const handleSavePositionMappings = useCallback(() => {
    if (!selectedRoleForMapping) return;
    updateRolePositionMappingMutation.mutate({
      roleId: selectedRoleForMapping.id,
      positionIds: selectedPositionIds,
    });
  }, [selectedRoleForMapping, selectedPositionIds, updateRolePositionMappingMutation]);

  const handleTogglePosition = useCallback((positionId: number) => {
    setSelectedPositionIds((prev) =>
      prev.includes(positionId)
        ? prev.filter((id) => id !== positionId)
        : [...prev, positionId]
    );
  }, []);

  const handleTabChange = useCallback((v: string) => {
    setActiveTab(v as 'roles' | 'positions');
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Roles & Positions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage roles and positions for the organization
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            {activeTab === 'roles' && (
              <Dialog open={showRoleAddDialog} onOpenChange={setShowRoleAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md">
                    <Plus className="mr-2 h-4 w-4" />
                    New Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>
                      Add a new role to the system
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="role-name">Role Name *</Label>
                      <Input
                        id="role-name"
                        placeholder="e.g., Manager, Designer"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role-description">Description</Label>
                      <Textarea
                        id="role-description"
                        placeholder="Role description"
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role-level">User Type Level</Label>
                      <Select
                        value={roleForm.level?.toString() || undefined}
                        onValueChange={(value) => setRoleForm({ ...roleForm, level: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (e.g., Super Admin)</SelectItem>
                          <SelectItem value="1">Level 1 (Managers)</SelectItem>
                          <SelectItem value="2">Level 2 (Employees)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role-reporting-person">Reporting Person Role</Label>
                      <Select
                        value={roleForm.reporting_person_role_id || undefined}
                        onValueChange={(value) => setRoleForm({ ...roleForm, reporting_person_role_id: value || "" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reporting person role (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.filter((r: Role) => r.id !== selectedRole?.id).map((role: Role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowRoleAddDialog(false);
                          setRoleForm({ name: "", description: "", reporting_person_role_id: "", level: "" });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleCreateRole}
                        disabled={createRoleMutation.isPending}
                      >
                        {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {activeTab === 'positions' && (
              <Dialog open={showPositionAddDialog} onOpenChange={setShowPositionAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md">
                    <Plus className="mr-2 h-4 w-4" />
                    New Position
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Position</DialogTitle>
                    <DialogDescription>
                      Add a new position to the system
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="position-name">Position Name *</Label>
                      <Input
                        id="position-name"
                        placeholder="e.g., Senior Developer, QA Lead"
                        value={positionForm.name}
                        onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="position-roles">Map to Roles</Label>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                        {roles.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No roles available</div>
                        ) : (
                          roles.map((role: Role) => (
                            <div key={role.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`role-${role.id}`}
                                checked={positionForm.role_ids.includes(role.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setPositionForm(prev => ({
                                      ...prev,
                                      role_ids: [...prev.role_ids, role.id]
                                    }));
                                  } else {
                                    setPositionForm(prev => ({
                                      ...prev,
                                      role_ids: prev.role_ids.filter(id => id !== role.id)
                                    }));
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`role-${role.id}`}
                                className="flex-1 cursor-pointer font-normal"
                              >
                                {role.name}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="position-description">Description</Label>
                      <Textarea
                        id="position-description"
                        placeholder="Position description"
                        value={positionForm.description}
                        onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowPositionAddDialog(false);
                          setPositionForm({ name: "", description: "", role_ids: [] });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleCreatePosition}
                        disabled={isCreatingPosition}
                      >
                        {isCreatingPosition ? "Creating..." : "Create Position"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <TabsContent value="roles">
          <Card className="glass-card shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/20">
            <CardContent className="pt-6">
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Role Name</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">Level</TableHead>
                      <TableHead className="font-semibold">Reporting Person</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rolesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-muted-foreground">Loading roles...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Shield className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground font-medium">
                              {searchQuery ? 'No roles found matching your search.' : 'No roles found. Create your first role to get started.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoles.map((role: Role) => (
                        <TableRow key={role.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium font-semibold">{role.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {role.description || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {role.level !== null && role.level !== undefined ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Level {role.level}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/70">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {role.reporting_person_role_name ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {role.reporting_person_role_name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/70">None (Top Level)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleManagePositions(role)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Manage Positions
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditRole(role)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {role.name !== 'Super Admin' && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteRole(role)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions">
          <Card className="glass-card shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/20">
            <CardContent className="pt-6">
              <div className="rounded-lg border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Position Name</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-muted-foreground">Loading positions...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredPositions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Briefcase className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-muted-foreground font-medium">
                              {searchQuery ? 'No positions found matching your search.' : 'No positions found. Create your first position to get started.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPositions.map((position: Position) => (
                        <TableRow key={position.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium font-semibold">{position.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {position.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditPosition(position)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeletePosition(position)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <Dialog open={showRoleEditDialog} onOpenChange={setShowRoleEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role-name">Role Name *</Label>
              <Input
                id="edit-role-name"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role-description">Description</Label>
              <Textarea
                id="edit-role-description"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role-level">User Type Level</Label>
              <Select
                value={roleForm.level?.toString() || undefined}
                onValueChange={(value) => setRoleForm({ ...roleForm, level: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (e.g., Super Admin)</SelectItem>
                  <SelectItem value="1">Level 1 (Managers)</SelectItem>
                  <SelectItem value="2">Level 2 (Employees)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role-reporting-person">Reporting Person Role</Label>
              <Select
                value={roleForm.reporting_person_role_id || undefined}
                onValueChange={(value) => setRoleForm({ ...roleForm, reporting_person_role_id: value || "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reporting person role (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter((r: Role) => r.id !== selectedRole?.id).map((role: Role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRoleEditDialog(false);
                  setSelectedRole(null);
                  setRoleForm({ name: "", description: "", reporting_person_role_id: "", level: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateRole}
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Position Dialog */}
      <Dialog open={showPositionEditDialog} onOpenChange={setShowPositionEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
            <DialogDescription>
              Update position information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-position-name">Position Name *</Label>
              <Input
                id="edit-position-name"
                value={positionForm.name}
                onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position-roles">Map to Roles</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                {roles.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No roles available</div>
                ) : (
                  roles.map((role: Role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-role-${role.id}`}
                        checked={positionForm.role_ids.includes(role.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setPositionForm(prev => ({
                              ...prev,
                              role_ids: [...prev.role_ids, role.id]
                            }));
                          } else {
                            setPositionForm(prev => ({
                              ...prev,
                              role_ids: prev.role_ids.filter(id => id !== role.id)
                            }));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`edit-role-${role.id}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        {role.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-position-description">Description</Label>
              <Textarea
                id="edit-position-description"
                value={positionForm.description}
                onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPositionEditDialog(false);
                  setSelectedPosition(null);
                  setPositionForm({ name: "", description: "", role_ids: [] });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdatePosition}
                disabled={isUpdatingPosition}
              >
                {isUpdatingPosition ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={showRoleDeleteDialog} onOpenChange={setShowRoleDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role{" "}
              <span className="font-semibold">{selectedRole?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedRole(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRoleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Position Confirmation */}
      <AlertDialog open={showPositionDeleteDialog} onOpenChange={setShowPositionDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the position{" "}
              <span className="font-semibold">{selectedPosition?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPosition(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePosition}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePositionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Position Mapping Dialog */}
      <Dialog open={showPositionMappingDialog} onOpenChange={setShowPositionMappingDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Positions for {selectedRoleForMapping?.name}</DialogTitle>
            <DialogDescription>
              Select which positions are available for the {selectedRoleForMapping?.name} role.
              When creating users with this role, only these positions will be shown.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[500px] overflow-y-auto">
            {rolePositionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading positions...
              </div>
            ) : rolePositions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No positions available. Create positions first.
              </div>
            ) : (
              <div className="space-y-3">
                {rolePositions.map((rp: any) => (
                  <div
                    key={rp.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50"
                  >
                    <Checkbox
                      id={`position-${rp.id}`}
                      checked={selectedPositionIds.includes(rp.id)}
                      onCheckedChange={() => handleTogglePosition(rp.id)}
                    />
                    <Label
                      htmlFor={`position-${rp.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{rp.name}</div>
                      {rp.description && (
                        <div className="text-sm text-muted-foreground">
                          {rp.description}
                        </div>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowPositionMappingDialog(false);
                setSelectedRoleForMapping(null);
                setSelectedPositionIds([]);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSavePositionMappings}
              disabled={updateRolePositionMappingMutation.isPending}
            >
              {updateRolePositionMappingMutation.isPending ? "Saving..." : "Save Mappings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
