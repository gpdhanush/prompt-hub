import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Check, X, Save, Loader2, Shield, Key, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { rolesApi } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";

// Permission modules mapping
// Note: This is for reference only. Actual permissions are fetched from database.
// The Roles & Permissions page dynamically loads permissions from the database.
const permissionModules = [
  { module: 'Users', permissions: ['View', 'Create', 'Edit', 'Delete'] },
  { module: 'Employees', permissions: ['View', 'Create', 'Edit', 'Delete'] },
  { module: 'Projects', permissions: ['View', 'Create', 'Edit', 'Delete'] },
  { module: 'Tasks', permissions: ['View', 'Create', 'Edit', 'Assign'] },
  { module: 'Bugs', permissions: ['View', 'Create', 'Edit'] },
  { module: 'Leaves', permissions: ['View', 'Create', 'Edit', 'Approve', 'Accept', 'Reject'] },
  { module: 'Reimbursements', permissions: ['View', 'Create', 'Edit', 'Approve'] },
  { module: 'Reports', permissions: ['View'] },
  { module: 'Settings', permissions: ['Edit'] },
  { module: 'My Devices', permissions: ['View', 'Create'] },
  { module: 'IT Asset Management', permissions: ['Dashboard View', 'Assets View', 'Assets Create', 'Assets Edit', 'Assets Delete', 'Assignments View', 'Assignments Create', 'Assignments Edit', 'Assignments Delete', 'Tickets View', 'Tickets Create', 'Tickets Edit', 'Tickets Approve', 'Maintenance View', 'Maintenance Create', 'Maintenance Edit', 'Maintenance Delete', 'Inventory View', 'Inventory Create', 'Inventory Edit', 'Inventory Delete', 'Inventory Adjust'] },
  { module: 'Audit', permissions: ['View'] },
  { module: 'Roles', permissions: ['View'] },
];

export default function RolesPermissions() {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';
  const { hasPermission } = usePermissions();

  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<number, any[]>>({});
  const [editingPermissions, setEditingPermissions] = useState<Record<number, boolean>>({});
  const [localPermissions, setLocalPermissions] = useState<Record<number, Record<number, boolean>>>({});

  // Check if user can access roles (permission-based or Super Admin)
  const canAccessRoles = hasPermission('roles_permissions.view') || isSuperAdmin;

  // Fetch roles from API - only if user has permission
  const { data: rolesData, isLoading: isLoadingRoles, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    enabled: canAccessRoles,
    retry: (failureCount, error: any) => {
      return error?.status !== 403;
    },
  });

  const roles = rolesData?.data || [];

  // Fetch permissions for selected role
  const { data: permissionsData, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['role-permissions', selectedRole],
    queryFn: () => rolesApi.getPermissions(selectedRole!),
    enabled: !!selectedRole && isSuperAdmin,
  });

  useEffect(() => {
    if (permissionsData?.data && selectedRole) {
      const currentPermissions = permissionsData.data;
      setRolePermissions(prev => ({
        ...prev,
        [selectedRole]: currentPermissions
      }));
      
      // Always initialize/update local permissions state
      // If in edit mode, preserve existing changes; otherwise initialize from server
      setLocalPermissions(prev => {
        const existing = prev[selectedRole] || {};
        const updated: Record<number, boolean> = {};
        
        // First, set all permissions from server (this handles new permissions)
        currentPermissions.forEach((perm: any) => {
          // If user has already changed this permission, keep their change
          // Otherwise, use the server value
          updated[perm.id] = existing[perm.id] !== undefined ? existing[perm.id] : perm.allowed;
        });
        
        return {
          ...prev,
          [selectedRole]: updated
        };
      });
    }
  }, [permissionsData, selectedRole]);

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: number; permissions: Array<{ permission_id: number; allowed: boolean }> }) =>
      rolesApi.updatePermissions(roleId, permissions),
    onSuccess: (data, variables) => {
      // Update the rolePermissions state with the response data immediately
      if (data?.data) {
        setRolePermissions(prev => ({
          ...prev,
          [variables.roleId]: data.data
        }));
        // Update localPermissions to match the saved state
        const permissionsMap: Record<number, boolean> = {};
        data.data.forEach((perm: any) => {
          permissionsMap[perm.id] = perm.allowed;
        });
        setLocalPermissions(prev => ({
          ...prev,
          [variables.roleId]: permissionsMap
        }));
      }
      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.roleId] });
      toast({ title: "Success", description: "Permissions updated successfully." });
      setEditingPermissions(prev => ({ ...prev, [variables.roleId]: false }));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permissions.",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (roleId: number) => {
    // Ensure localPermissions is fully initialized before entering edit mode
    const permissions = rolePermissions[roleId] || [];
    const currentLocalPerms = localPermissions[roleId] || {};
    
    // Initialize all permissions in local state if not already present
    const initializedPerms: Record<number, boolean> = {};
    permissions.forEach((perm: any) => {
      initializedPerms[perm.id] = currentLocalPerms[perm.id] !== undefined 
        ? currentLocalPerms[perm.id] 
        : perm.allowed;
    });
    
    setLocalPermissions(prev => ({
      ...prev,
      [roleId]: initializedPerms
    }));
    setEditingPermissions(prev => ({ ...prev, [roleId]: true }));
  };

  const handleCancelEdit = (roleId: number) => {
    setEditingPermissions(prev => ({ ...prev, [roleId]: false }));
    // Reset local permissions to original
    if (rolePermissions[roleId]) {
      const permissionsMap: Record<number, boolean> = {};
      rolePermissions[roleId].forEach((perm: any) => {
        permissionsMap[perm.id] = perm.allowed;
      });
      setLocalPermissions(prev => ({
        ...prev,
        [roleId]: permissionsMap
      }));
    }
  };

  const handlePermissionToggle = (roleId: number, permissionId: number, checked: boolean) => {
    setLocalPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permissionId]: checked
      }
    }));
  };

  // Check if all permissions are checked (globally) - only for visible permissions
  const areAllPermissionsChecked = (roleId: number) => {
    const permissions = rolePermissions[roleId] || [];
    const localPerms = localPermissions[roleId] || {};
    // Filter out excluded modules
    const excludedModules = ['My Devices', 'Prompts', 'Roles', 'Settings'];
    const visiblePermissions = permissions.filter((perm: any) => 
      !excludedModules.includes(perm.module) &&
      (perm.module !== 'IT Asset Management' || 
       ['assets', 'assignments', 'tickets', 'maintenance', 'inventory'].some(menu => perm.code.includes(`.${menu}.`)))
    );
    return visiblePermissions.length > 0 && visiblePermissions.every((perm: any) => localPerms[perm.id] === true);
  };

  // Check if all permissions in a module are checked
  const areAllModulePermissionsChecked = (roleId: number, moduleKey: string) => {
    const permissions = rolePermissions[roleId] || [];
    const localPerms = localPermissions[roleId] || {};
    // Handle both regular modules and IT Asset Management sub-menus
    const [module, menuName] = moduleKey.split('::');
    let modulePerms: any[];
    if (menuName) {
      // IT Asset Management sub-menu
      const itAssetMenuMapping: Record<string, string> = {
        'IT Asset Dashboard': 'dashboard',
        'Assets': 'assets',
        'Assignments': 'assignments',
        'Tickets': 'tickets',
        'Maintenance': 'maintenance',
        'Inventory': 'inventory',
      };
      const menuKey = itAssetMenuMapping[menuName] || menuName.toLowerCase();
      modulePerms = permissions.filter((perm: any) => {
        if (perm.module !== module) return false;
        const codeParts = perm.code.split('.');
        if (codeParts.length >= 2) {
          return codeParts[1] === menuKey || (menuKey === 'IT Asset Dashboard' && perm.code.includes('dashboard'));
        }
        return false;
      });
    } else {
      // Regular module
      modulePerms = permissions.filter((perm: any) => perm.module === module);
    }
    return modulePerms.length > 0 && modulePerms.every((perm: any) => localPerms[perm.id] === true);
  };

  // Check if some (but not all) permissions are checked (for indeterminate state) - only for visible permissions
  const areSomePermissionsChecked = (roleId: number) => {
    const permissions = rolePermissions[roleId] || [];
    const localPerms = localPermissions[roleId] || {};
    // Filter out excluded modules
    const excludedModules = ['My Devices', 'Prompts', 'Roles', 'Settings'];
    const visiblePermissions = permissions.filter((perm: any) => 
      !excludedModules.includes(perm.module) &&
      (perm.module !== 'IT Asset Management' || 
       ['assets', 'assignments', 'tickets', 'maintenance', 'inventory'].some(menu => perm.code.includes(`.${menu}.`)))
    );
    const checkedCount = visiblePermissions.filter((perm: any) => localPerms[perm.id] === true).length;
    return checkedCount > 0 && checkedCount < visiblePermissions.length;
  };

  // Check if some (but not all) permissions in a module are checked
  const areSomeModulePermissionsChecked = (roleId: number, moduleKey: string) => {
    const permissions = rolePermissions[roleId] || [];
    const localPerms = localPermissions[roleId] || {};
    // Handle both regular modules and IT Asset Management sub-menus
    const [module, menuName] = moduleKey.split('::');
    let modulePerms: any[];
    if (menuName) {
      // IT Asset Management sub-menu
      const itAssetMenuMapping: Record<string, string> = {
        'IT Asset Dashboard': 'dashboard',
        'Assets': 'assets',
        'Assignments': 'assignments',
        'Tickets': 'tickets',
        'Maintenance': 'maintenance',
        'Inventory': 'inventory',
      };
      const menuKey = itAssetMenuMapping[menuName] || menuName.toLowerCase();
      modulePerms = permissions.filter((perm: any) => {
        if (perm.module !== module) return false;
        const codeParts = perm.code.split('.');
        if (codeParts.length >= 2) {
          return codeParts[1] === menuKey || (menuKey === 'IT Asset Dashboard' && perm.code.includes('dashboard'));
        }
        return false;
      });
    } else {
      // Regular module
      modulePerms = permissions.filter((perm: any) => perm.module === module);
    }
    const checkedCount = modulePerms.filter((perm: any) => localPerms[perm.id] === true).length;
    return checkedCount > 0 && checkedCount < modulePerms.length;
  };

  // Toggle all permissions (globally) - only for visible permissions
  const handleToggleAllPermissions = (roleId: number, checked: boolean) => {
    const permissions = rolePermissions[roleId] || [];
    const localPerms = localPermissions[roleId] || {};
    // Filter out excluded modules
    const excludedModules = ['My Devices', 'Prompts', 'Roles', 'Settings'];
    const visiblePermissions = permissions.filter((perm: any) => 
      !excludedModules.includes(perm.module) &&
      (perm.module !== 'IT Asset Management' || 
       ['assets', 'assignments', 'tickets', 'maintenance', 'inventory'].some(menu => perm.code.includes(`.${menu}.`)))
    );
    const updatedPerms: Record<number, boolean> = { ...localPerms };
    visiblePermissions.forEach((perm: any) => {
      updatedPerms[perm.id] = checked;
    });
    setLocalPermissions(prev => ({
      ...prev,
      [roleId]: updatedPerms
    }));
  };

  // Toggle all permissions in a module
  const handleToggleModulePermissions = (roleId: number, moduleKey: string, checked: boolean) => {
    const permissions = rolePermissions[roleId] || [];
    // Handle both regular modules and IT Asset Management sub-menus
    const [module, menuName] = moduleKey.split('::');
    let modulePerms: any[];
    if (menuName) {
      // IT Asset Management sub-menu
      const itAssetMenuMapping: Record<string, string> = {
        'IT Asset Dashboard': 'dashboard',
        'Assets': 'assets',
        'Assignments': 'assignments',
        'Tickets': 'tickets',
        'Maintenance': 'maintenance',
        'Inventory': 'inventory',
      };
      const menuKey = itAssetMenuMapping[menuName] || menuName.toLowerCase();
      modulePerms = permissions.filter((perm: any) => {
        if (perm.module !== module) return false;
        const codeParts = perm.code.split('.');
        if (codeParts.length >= 2) {
          return codeParts[1] === menuKey || (menuKey === 'IT Asset Dashboard' && perm.code.includes('dashboard'));
        }
        return false;
      });
    } else {
      // Regular module
      modulePerms = permissions.filter((perm: any) => perm.module === module);
    }
    setLocalPermissions(prev => {
      const current = prev[roleId] || {};
      const updated = { ...current };
      modulePerms.forEach((perm: any) => {
        updated[perm.id] = checked;
      });
      return {
        ...prev,
        [roleId]: updated
      };
    });
  };

  const handleSavePermissions = (roleId: number) => {
    const permissions = rolePermissions[roleId] || [];
    const localPerms = localPermissions[roleId] || {};
    
    // Use localPerms if it exists (user changed it), otherwise use the original allowed value
    const permissionsToUpdate = permissions.map((perm: any) => ({
      permission_id: perm.id,
      allowed: localPerms[perm.id] !== undefined ? localPerms[perm.id] : perm.allowed
    }));

    updatePermissionsMutation.mutate({ roleId, permissions: permissionsToUpdate });
  };

  if (!canAccessRoles) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access Roles & Permissions management. Required permission: roles_permissions.view</p>
        </div>
      </div>
    );
  }

  if (isLoadingRoles) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Roles & Permissions
        </h1>
        <p className="text-muted-foreground">
          {isSuperAdmin 
            ? "View and manage role permissions. Click on a role to see its permissions."
            : "View role permissions"}
        </p>
      </div>

      <Card className="glass-card shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-primary" />
            Manage Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role: any) => (
              <div 
                key={role.id} 
                className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
                  selectedRole === role.id 
                    ? "border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-md" 
                    : "border-border hover:border-primary/50 hover:shadow-sm bg-card"
                }`}
                onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        selectedRole === role.id 
                          ? "bg-primary/20" 
                          : "bg-muted"
                      }`}>
                        <Shield className={`h-5 w-5 ${
                          selectedRole === role.id 
                            ? "text-primary" 
                            : "text-muted-foreground"
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{role.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {role.description || "No description available"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRole === role.id ? (
                      <X className="h-5 w-5 text-primary" />
                    ) : (
                      <Check className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {selectedRole === role.id && (
                  <div className="mt-5 pt-5 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-base font-semibold flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        Permissions
                      </p>
                      {isSuperAdmin && role.name !== 'Super Admin' && !editingPermissions[role.id] && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(role.id);
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1.5" />
                          Edit Permissions
                        </Button>
                      )}
                      {isSuperAdmin && role.name !== 'Super Admin' && editingPermissions[role.id] && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEdit(role.id);
                            }}
                            disabled={updatePermissionsMutation.isPending}
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSavePermissions(role.id);
                            }}
                            disabled={updatePermissionsMutation.isPending}
                          >
                            {updatePermissionsMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3 mr-1.5" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    {isLoadingPermissions ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const permissions = rolePermissions[role.id] || [];
                          const isEditing = editingPermissions[role.id] && role.name !== 'Super Admin';
                          const localPerms = localPermissions[role.id] || {};
                          
                          // Filter out unwanted modules
                          const excludedModules = ['My Devices', 'Prompts', 'Roles', 'Settings'];
                          const filteredPermissions = permissions.filter((perm: any) => 
                            !excludedModules.includes(perm.module)
                          );
                          
                          // Define module order for first group
                          const firstGroupOrder = ['Audit', 'Bugs', 'Employees', 'Leaves', 'Projects', 'Reimbursements', 'Reports', 'Tasks', 'Users'];
                          
                          // IT Asset Management menu mapping
                          const itAssetMenuMapping: Record<string, string> = {
                            'assets': 'Assets',
                            'assignments': 'Assignments',
                            'tickets': 'Tickets',
                            'maintenance': 'Maintenance',
                            'inventory': 'Inventory',
                          };
                          
                          // Group permissions by module
                          // For IT Asset Management, also group by menu name (Assets, Assignments, etc.)
                          const groupedPermissions: Record<string, any[]> = {};
                          
                          filteredPermissions.forEach((perm: any) => {
                            if (perm.module === 'IT Asset Management') {
                              // Extract menu name from permission code (e.g., "it_assets.assets.view" -> "assets")
                              const codeParts = perm.code.split('.');
                              if (codeParts.length >= 2) {
                                const menuKey = codeParts[1]; // "assets", "assignments", etc.
                                const menuName = itAssetMenuMapping[menuKey] || menuKey;
                                // Only include specific menus: Assets, Assignments, Tickets, Maintenance, Inventory
                                if (['Assets', 'Assignments', 'Tickets', 'Maintenance', 'Inventory'].includes(menuName)) {
                                  const groupKey = `${perm.module}::${menuName}`;
                                  if (!groupedPermissions[groupKey]) {
                                    groupedPermissions[groupKey] = [];
                                  }
                                  groupedPermissions[groupKey].push(perm);
                                }
                              }
                            } else {
                              // Regular module grouping (only if in first group order)
                              if (firstGroupOrder.includes(perm.module)) {
                                if (!groupedPermissions[perm.module]) {
                                  groupedPermissions[perm.module] = [];
                                }
                                groupedPermissions[perm.module].push(perm);
                              }
                            }
                          });
                          
                          // Sort permissions in the specified order
                          const itAssetMenuOrder = ['Assets', 'Assignments', 'Tickets', 'Maintenance', 'Inventory'];
                          
                          // Create sorted grouped permissions
                          const sortedGroupedPermissions: Record<string, any[]> = {};
                          
                          // First, add modules in first group order
                          firstGroupOrder.forEach(module => {
                            if (groupedPermissions[module]) {
                              sortedGroupedPermissions[module] = groupedPermissions[module];
                            }
                          });
                          
                          // Then, add IT Asset Management sub-menus in specified order
                          itAssetMenuOrder.forEach(menuName => {
                            const groupKey = `IT Asset Management::${menuName}`;
                            if (groupedPermissions[groupKey]) {
                              sortedGroupedPermissions[groupKey] = groupedPermissions[groupKey];
                            }
                          });
                          
                          // Count total visible permissions
                          const totalPermissions = Object.values(sortedGroupedPermissions).reduce((sum, perms) => sum + perms.length, 0);
                          
                          // Check if we have IT Asset Management permissions to show parent module
                          const hasITAssetPermissions = Object.keys(sortedGroupedPermissions).some(key => key.startsWith('IT Asset Management::'));
                          
                          return Object.keys(sortedGroupedPermissions).length > 0 ? (
                            <div className="space-y-5">
                              {/* Global Check All */}
                              {isEditing && (
                                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border-2 border-primary/20 shadow-sm">
                                  <Checkbox
                                    id={`global-check-all-${role.id}`}
                                    checked={areAllPermissionsChecked(role.id)}
                                    onCheckedChange={(checked) => 
                                      handleToggleAllPermissions(role.id, checked as boolean)
                                    }
                                    disabled={updatePermissionsMutation.isPending}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
                                  />
                                  <Label 
                                    htmlFor={`global-check-all-${role.id}`}
                                    className="text-base font-semibold cursor-pointer flex-1 text-foreground"
                                  >
                                    Check All Permissions ({totalPermissions} total)
                                  </Label>
                                </div>
                              )}
                              
                              {/* First Group: Regular Modules */}
                              {Object.entries(sortedGroupedPermissions)
                                .filter(([moduleKey]) => !moduleKey.startsWith('IT Asset Management::'))
                                .map(([moduleKey, perms]) => {
                                  const displayName = moduleKey;
                                  
                                  return (
                                    <div key={moduleKey} className="space-y-3 p-5 bg-gradient-to-br from-card via-card/95 to-muted/20 rounded-xl border border-border/60 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex items-center justify-between mb-4">
                                        <p className="text-base font-semibold text-foreground flex items-center gap-2.5">
                                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary"></span>
                                          {displayName}
                                        </p>
                                        {isEditing && (
                                          <div className="flex items-center gap-2.5">
                                            <Checkbox
                                              id={`module-check-all-${role.id}-${moduleKey}`}
                                              checked={areAllModulePermissionsChecked(role.id, moduleKey)}
                                              onCheckedChange={(checked) => 
                                                handleToggleModulePermissions(role.id, moduleKey, checked as boolean)
                                              }
                                              disabled={updatePermissionsMutation.isPending}
                                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <Label 
                                              htmlFor={`module-check-all-${role.id}-${moduleKey}`}
                                              className="text-sm text-muted-foreground cursor-pointer font-medium"
                                            >
                                              Check All ({perms.length})
                                            </Label>
                                          </div>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {perms.map((perm: any) => {
                                          const permCode = perm.code.split('.').pop() || perm.code;
                                          const permName = permCode.charAt(0).toUpperCase() + permCode.slice(1);
                                          const isChecked = isEditing ? (localPerms[perm.id] || false) : perm.allowed;
                                          
                                          return (
                                            <div 
                                              key={perm.id} 
                                              className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                                                isChecked 
                                                  ? 'bg-primary/10 border-2 border-primary/30 shadow-sm' 
                                                  : 'bg-background/60 border border-border/40 hover:border-border/60'
                                              }`}
                                            >
                                              {isEditing ? (
                                                <Checkbox
                                                  id={`perm-${role.id}-${perm.id}`}
                                                  checked={isChecked}
                                                  onCheckedChange={(checked) => 
                                                    handlePermissionToggle(role.id, perm.id, checked as boolean)
                                                  }
                                                  disabled={updatePermissionsMutation.isPending}
                                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                              ) : (
                                                isChecked ? (
                                                  <div className="p-1 rounded-full bg-primary/20 flex-shrink-0">
                                                    <Check className="h-4 w-4 text-primary" />
                                                  </div>
                                                ) : (
                                                  <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                )
                                              )}
                                              <Label 
                                                htmlFor={`perm-${role.id}-${perm.id}`}
                                                className={`text-sm cursor-pointer flex-1 ${
                                                  isChecked 
                                                    ? 'text-foreground font-medium' 
                                                    : 'text-muted-foreground'
                                                }`}
                                              >
                                                {permName}
                                              </Label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              
                              {/* IT Asset Management Group */}
                              {hasITAssetPermissions && (
                                <div className="space-y-4">
                                  <div className="p-4 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent rounded-xl border-2 border-primary/20 shadow-sm">
                                    <p className="text-base font-semibold text-foreground flex items-center gap-2.5">
                                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary"></span>
                                      IT Asset Management
                                    </p>
                                  </div>
                                  
                                  {Object.entries(sortedGroupedPermissions)
                                    .filter(([moduleKey]) => moduleKey.startsWith('IT Asset Management::'))
                                    .map(([moduleKey, perms]) => {
                                      const [, menuName] = moduleKey.split('::');
                                      const displayName = menuName;
                                      
                                      return (
                                        <div key={moduleKey} className="space-y-3 p-5 bg-gradient-to-br from-card via-card/95 to-muted/20 rounded-xl border-l-4 border-l-primary/40 border border-border/60 shadow-sm hover:shadow-md transition-shadow ml-4">
                                          <div className="flex items-center justify-between mb-4">
                                            <p className="text-base font-semibold text-foreground flex items-center gap-2.5">
                                              <span className="inline-block w-2 h-2 rounded-full bg-primary/70"></span>
                                              {displayName}
                                            </p>
                                            {isEditing && (
                                              <div className="flex items-center gap-2.5">
                                                <Checkbox
                                                  id={`module-check-all-${role.id}-${moduleKey}`}
                                                  checked={areAllModulePermissionsChecked(role.id, moduleKey)}
                                                  onCheckedChange={(checked) => 
                                                    handleToggleModulePermissions(role.id, moduleKey, checked as boolean)
                                                  }
                                                  disabled={updatePermissionsMutation.isPending}
                                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                />
                                                <Label 
                                                  htmlFor={`module-check-all-${role.id}-${moduleKey}`}
                                                  className="text-sm text-muted-foreground cursor-pointer font-medium"
                                                >
                                                  Check All ({perms.length})
                                                </Label>
                                              </div>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {perms.map((perm: any) => {
                                              const permCode = perm.code.split('.').pop() || perm.code;
                                              const permName = permCode.charAt(0).toUpperCase() + permCode.slice(1);
                                              const isChecked = isEditing ? (localPerms[perm.id] || false) : perm.allowed;
                                              
                                              return (
                                                <div 
                                                  key={perm.id} 
                                                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                                                    isChecked 
                                                      ? 'bg-primary/10 border-2 border-primary/30 shadow-sm' 
                                                      : 'bg-background/60 border border-border/40 hover:border-border/60'
                                                  }`}
                                                >
                                                  {isEditing ? (
                                                    <Checkbox
                                                      id={`perm-${role.id}-${perm.id}`}
                                                      checked={isChecked}
                                                      onCheckedChange={(checked) => 
                                                        handlePermissionToggle(role.id, perm.id, checked as boolean)
                                                      }
                                                      disabled={updatePermissionsMutation.isPending}
                                                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                    />
                                                  ) : (
                                                    isChecked ? (
                                                      <div className="p-1 rounded-full bg-primary/20 flex-shrink-0">
                                                        <Check className="h-4 w-4 text-primary" />
                                                      </div>
                                                    ) : (
                                                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    )
                                                  )}
                                                  <Label 
                                                    htmlFor={`perm-${role.id}-${perm.id}`}
                                                    className={`text-sm cursor-pointer flex-1 ${
                                                      isChecked 
                                                        ? 'text-foreground font-medium' 
                                                        : 'text-muted-foreground'
                                                    }`}
                                                  >
                                                    {permName}
                                                  </Label>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground py-4">
                              {role.name === 'Super Admin' 
                                ? "Super Admin has all permissions by default."
                                : "No permissions data available. Permissions are not configured."}
                            </div>
                          );
                        })()}
                        {role.name === 'Super Admin' && (
                          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                              <strong>Note:</strong> Super Admin role has all permissions by default and cannot be modified.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
