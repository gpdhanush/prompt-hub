import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Shield, Key, Loader2 } from "lucide-react";
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
import { permissionsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

type Permission = {
  id: number;
  code: string;
  description?: string;
  module?: string;
  created_at?: string;
};

const PERMISSION_MODULES = [
  'Users',
  'Employees',
  'Projects',
  'Tasks',
  'Bugs',
  'Leaves',
  'Reimbursements',
  'Reports',
  'Settings',
  'Prompts',
  'Audit',
  'Roles',
  'Positions',
  'Permissions',
];

export default function Permissions() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [permissionForm, setPermissionForm] = useState({
    code: "",
    description: "",
    module: "",
  });

  // Get current user info
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const canAccessPermissions = userRole === 'Super Admin';
  
  if (!canAccessPermissions) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Only Super Admin can access Permissions management.</p>
        </div>
      </div>
    );
  }

  // Fetch permissions - optimized query
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionsApi.getAll(),
    staleTime: 1000 * 60 * 30, // 30 minutes (permissions rarely change)
    gcTime: 1000 * 60 * 60, // 60 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Memoized derived values
  const permissions = useMemo(() => permissionsData?.data || [], [permissionsData?.data]);

  // Filter permissions based on search - memoized
  const filteredPermissions = useMemo(() => {
    return permissions.filter((permission: Permission) =>
      permission.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.module?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [permissions, searchQuery]);

  // Mutations
  const createPermissionMutation = useMutation({
    mutationFn: permissionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast({ title: "Success", description: "Permission created successfully." });
      setShowAddDialog(false);
      setPermissionForm({ code: "", description: "", module: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create permission.",
        variant: "destructive",
      });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => permissionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast({ title: "Success", description: "Permission updated successfully." });
      setShowEditDialog(false);
      setSelectedPermission(null);
      setPermissionForm({ code: "", description: "", module: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permission.",
        variant: "destructive",
      });
    },
  });

  const deletePermissionMutation = useMutation({
    mutationFn: permissionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast({ title: "Success", description: "Permission deleted successfully." });
      setShowDeleteDialog(false);
      setSelectedPermission(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete permission.",
        variant: "destructive",
      });
    },
  });

  // Handlers - memoized
  const handleCreatePermission = useCallback(() => {
    if (!permissionForm.code) {
      toast({
        title: "Validation Error",
        description: "Permission code is required",
        variant: "destructive",
      });
      return;
    }
    if (!permissionForm.module) {
      toast({
        title: "Validation Error",
        description: "Permission module is required",
        variant: "destructive",
      });
      return;
    }
    createPermissionMutation.mutate({
      code: permissionForm.code,
      description: permissionForm.description,
      module: permissionForm.module,
    });
  }, [permissionForm, createPermissionMutation]);

  const handleEditPermission = useCallback((permission: Permission) => {
    setSelectedPermission(permission);
    setPermissionForm({
      code: permission.code,
      description: permission.description || "",
      module: permission.module || "",
    });
    setShowEditDialog(true);
  }, []);

  const handleUpdatePermission = useCallback(() => {
    if (!selectedPermission || !permissionForm.code) {
      toast({
        title: "Validation Error",
        description: "Permission code is required",
        variant: "destructive",
      });
      return;
    }
    if (!permissionForm.module) {
      toast({
        title: "Validation Error",
        description: "Permission module is required",
        variant: "destructive",
      });
      return;
    }
    updatePermissionMutation.mutate({
      id: selectedPermission.id,
      data: {
        code: permissionForm.code,
        description: permissionForm.description,
        module: permissionForm.module,
      },
    });
  }, [selectedPermission, permissionForm, updatePermissionMutation]);

  const handleDeletePermission = useCallback((permission: Permission) => {
    setSelectedPermission(permission);
    setShowDeleteDialog(true);
  }, []);

  const confirmDeletePermission = useCallback(() => {
    if (selectedPermission) {
      deletePermissionMutation.mutate(selectedPermission.id);
    }
  }, [selectedPermission, deletePermissionMutation]);

  // Memoized handlers for form fields
  const handleFormFieldChange = useCallback((field: string, value: string) => {
    setPermissionForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Memoized handlers for dialog actions
  const handleCancelAdd = useCallback(() => {
    setShowAddDialog(false);
    setPermissionForm({ code: "", description: "", module: "" });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setShowEditDialog(false);
    setSelectedPermission(null);
    setPermissionForm({ code: "", description: "", module: "" });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="h-8 w-8 text-primary" />
            Permissions Management
          </h1>
          <p className="text-muted-foreground">
            Manage system permissions and access controls
          </p>
        </div>
      </div>

      <Card className="glass-card shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Shield className="h-6 w-6 text-primary" />
                Permissions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage system permissions
              </p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md">
                  <Plus className="mr-2 h-4 w-4" />
                  New Permission
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Permission</DialogTitle>
                  <DialogDescription>
                    Add a new permission to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="permission-code">Permission Code *</Label>
                    <Input
                      id="permission-code"
                      placeholder="e.g., users.create, projects.edit"
                      value={permissionForm.code}
                      onChange={(e) => handleFormFieldChange('code', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: module.action (e.g., users.create, projects.edit)
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="permission-module">Module *</Label>
                    <Select
                      value={permissionForm.module}
                      onValueChange={(value) => handleFormFieldChange('module', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMISSION_MODULES.map((module) => (
                          <SelectItem key={module} value={module}>
                            {module}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="permission-description">Description</Label>
                    <Textarea
                      id="permission-description"
                      placeholder="Permission description"
                      value={permissionForm.description}
                      onChange={(e) => handleFormFieldChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleCancelAdd}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleCreatePermission}
                      disabled={createPermissionMutation.isPending}
                    >
                      {createPermissionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Permission"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                className="pl-9"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Module</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-muted-foreground">Loading permissions...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Key className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground font-medium">
                          {searchQuery ? 'No permissions found matching your search.' : 'No permissions found. Create your first permission to get started.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPermissions.map((permission: Permission) => (
                    <TableRow key={permission.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium font-mono text-sm">
                        {permission.code}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {permission.module || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {permission.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditPermission(permission)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeletePermission(permission)}
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

      {/* Edit Permission Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Update permission information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-permission-code">Permission Code *</Label>
              <Input
                id="edit-permission-code"
                value={permissionForm.code}
                onChange={(e) => setPermissionForm({ ...permissionForm, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-permission-module">Module *</Label>
              <Select
                value={permissionForm.module}
                onValueChange={(value) => setPermissionForm({ ...permissionForm, module: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_MODULES.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-permission-description">Description</Label>
              <Textarea
                id="edit-permission-description"
                value={permissionForm.description}
                onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdatePermission}
                disabled={updatePermissionMutation.isPending}
              >
                {updatePermissionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Permission Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the permission{" "}
              <span className="font-semibold">{selectedPermission?.code}</span>.
              {selectedPermission && (
                <p className="mt-2 text-sm text-muted-foreground">
                  If this permission is assigned to any roles, you'll need to remove it from those roles first.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPermission(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePermission}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePermissionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
