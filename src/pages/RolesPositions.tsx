import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Shield } from "lucide-react";
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

type Role = {
  id: number;
  name: string;
  description?: string;
  reporting_person_role_id?: number;
  reporting_person_role_name?: string;
  created_at?: string;
  updated_at?: string;
};

type Position = {
  id: number;
  name: string;
  description?: string;
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
  
  // Only Super Admin can access this page
  if (userRole !== 'Super Admin') {
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

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  // Fetch positions
  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: () => positionsApi.getAll(),
  });

  // Fetch positions for role mapping
  const { data: rolePositionsData, isLoading: rolePositionsLoading } = useQuery({
    queryKey: ['role-positions', selectedRoleForMapping?.id],
    queryFn: () => rolePositionsApi.getByRole(selectedRoleForMapping!.id),
    enabled: !!selectedRoleForMapping,
  });

  // Fetch roles for position mapping (when creating/editing position)
  const { data: positionRolesData } = useQuery({
    queryKey: ['position-roles', selectedPosition?.id],
    queryFn: () => rolePositionsApi.getByPosition(selectedPosition!.id),
    enabled: !!selectedPosition && showPositionEditDialog,
  });

  const roles = rolesData?.data || [];
  const positions = positionsData?.data || [];
  const rolePositions = rolePositionsData?.data || [];

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

  // Filter roles and positions based on search
  const filteredRoles = roles.filter((role: Role) =>
    role.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPositions = positions.filter((position: Position) =>
    position.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    position.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({ title: "Success", description: "Role created successfully." });
      setShowRoleAddDialog(false);
      setRoleForm({ name: "", description: "", reporting_person_role_id: "" });
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
      setRoleForm({ name: "", description: "", reporting_person_role_id: "" });
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

  // Role handlers
  const handleCreateRole = () => {
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
    });
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      reporting_person_role_id: role.reporting_person_role_id?.toString() || "",
    });
    setShowRoleEditDialog(true);
  };

  const handleUpdateRole = () => {
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
      },
    });
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setShowRoleDeleteDialog(true);
  };

  const confirmDeleteRole = () => {
    if (selectedRole) {
      deleteRoleMutation.mutate(selectedRole.id);
    }
  };

  // Position handlers
  const handleCreatePosition = async () => {
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
      // First create the position
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
  };

  const handleEditPosition = async (position: Position) => {
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
  };

  const handleUpdatePosition = async () => {
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
      // First update the position
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
  };

  const handleDeletePosition = (position: Position) => {
    setSelectedPosition(position);
    setShowPositionDeleteDialog(true);
  };

  const confirmDeletePosition = () => {
    if (selectedPosition) {
      deletePositionMutation.mutate(selectedPosition.id);
    }
  };

  // Position mapping handlers
  const handleManagePositions = (role: Role) => {
    setSelectedRoleForMapping(role);
    setShowPositionMappingDialog(true);
  };

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

  const handleSavePositionMappings = () => {
    if (!selectedRoleForMapping) return;
    updateRolePositionMappingMutation.mutate({
      roleId: selectedRoleForMapping.id,
      positionIds: selectedPositionIds,
    });
  };

  const handleTogglePosition = (positionId: number) => {
    setSelectedPositionIds((prev) =>
      prev.includes(positionId)
        ? prev.filter((id) => id !== positionId)
        : [...prev, positionId]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Roles & Positions
          </h1>
          <p className="text-muted-foreground">
            Manage roles and positions for the organization
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'roles' | 'positions')}>
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
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {activeTab === 'roles' && (
              <Dialog open={showRoleAddDialog} onOpenChange={setShowRoleAddDialog}>
                <DialogTrigger asChild>
                  <Button>
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
                          setRoleForm({ name: "", description: "", reporting_person_role_id: "" });
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
                  <Button>
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
          <Card className="glass-card">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reporting Person</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading roles...
                      </TableCell>
                    </TableRow>
                  ) : filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'No roles found matching your search.' : 'No roles found. Create your first role to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map((role: Role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.description || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.reporting_person_role_name || 'None (Top Level)'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Loading positions...
                      </TableCell>
                    </TableRow>
                  ) : filteredPositions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'No positions found matching your search.' : 'No positions found. Create your first position to get started.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPositions.map((position: Position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {position.description || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
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
                  setRoleForm({ name: "", description: "", reporting_person_role_id: "" });
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
