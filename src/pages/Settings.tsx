import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Users, Shield, Building, Bell, Palette, DollarSign, Check, X } from "lucide-react";
import { rolesApi, settingsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const themeColors = [
  { name: "Blue", value: "217 91% 60%", class: "blue" },
  { name: "Green", value: "142 71% 45%", class: "green" },
  { name: "Purple", value: "262 83% 58%", class: "purple" },
  { name: "Orange", value: "25 95% 53%", class: "orange" },
  { name: "Pink", value: "330 81% 60%", class: "pink" },
  { name: "Red", value: "0 72% 51%", class: "red" },
  { name: "Teal", value: "173 80% 40%", class: "teal" },
  { name: "Indigo", value: "239 84% 67%", class: "indigo" },
];

// Permission modules mapping
const permissionModules = [
  { module: 'Users', permissions: ['View', 'Create', 'Edit', 'Delete'] },
  { module: 'Employees', permissions: ['View', 'Create', 'Edit', 'Delete'] },
  { module: 'Projects', permissions: ['View', 'Create', 'Edit', 'Delete'] },
  { module: 'Tasks', permissions: ['View', 'Create', 'Edit', 'Assign'] },
  { module: 'Bugs', permissions: ['View', 'Create', 'Edit'] },
  { module: 'Leaves', permissions: ['View', 'Create', 'Edit', 'Approve'] },
  { module: 'Reimbursements', permissions: ['View', 'Create', 'Edit', 'Approve'] },
  { module: 'Reports', permissions: ['View'] },
  { module: 'Settings', permissions: ['Edit'] },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [selectedColor, setSelectedColor] = useState("217 91% 60%");
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<number, any[]>>({});

  // Get current user info
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';

  const queryClient = useQueryClient();

  // Fetch settings from database
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  // Currency symbol from database
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Check if user can access roles (Super Admin, Admin, Team Lead only)
  const canAccessRoles = ['Super Admin', 'Admin', 'Team Lead'].includes(userRole);

  // Fetch roles from API - only if user has permission
  const { data: rolesData, isLoading: isLoadingRoles, error: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    enabled: canAccessRoles, // Only fetch if user has permission
    retry: (failureCount, error: any) => {
      // Don't retry on 403 errors
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
      setRolePermissions(prev => ({
        ...prev,
        [selectedRole]: permissionsData.data
      }));
    }
  }, [permissionsData, selectedRole]);

  // Update currency symbol when settings load
  useEffect(() => {
    if (settingsData?.data?.currency_symbol) {
      setCurrencySymbol(settingsData.data.currency_symbol);
      // Also update localStorage for Dashboard
      localStorage.setItem('currency_symbol', settingsData.data.currency_symbol);
    }
  }, [settingsData]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: "Success", description: "Settings updated successfully." });
      // Dispatch event for Dashboard
      window.dispatchEvent(new Event('currencySymbolChanged'));
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update settings.", variant: "destructive" });
    },
  });

  useEffect(() => {
    setMounted(true);
    // Get current primary color from CSS
    const root = document.documentElement;
    const primaryColor = getComputedStyle(root).getPropertyValue("--primary").trim();
    if (primaryColor) {
      setSelectedColor(primaryColor);
    }
    // Load saved settings
    const savedSessionTimeout = localStorage.getItem('session_timeout');
    if (savedSessionTimeout) setSessionTimeout(savedSessionTimeout);
  }, []);

  const handleColorChange = (colorValue: string) => {
    setSelectedColor(colorValue);
    const root = document.documentElement;
    root.style.setProperty("--primary", colorValue);
    root.style.setProperty("--ring", colorValue);
    root.style.setProperty("--sidebar-primary", colorValue);
    root.style.setProperty("--sidebar-ring", colorValue);
    root.style.setProperty("--chart-1", colorValue);
    // Save to localStorage
    localStorage.setItem("theme-color", colorValue);
    toast({ title: "Success", description: "Theme color updated successfully." });
  };

  const handleCurrencyChange = (symbol: string) => {
    if (!isSuperAdmin) return;
    setCurrencySymbol(symbol);
    updateSettingsMutation.mutate({ currency_symbol: symbol });
  };

  const handleSaveSecurity = () => {
    localStorage.setItem('session_timeout', sessionTimeout);
    toast({ title: "Success", description: "Security settings saved successfully." });
  };

  const handleSaveOrganization = () => {
    toast({ title: "Success", description: "Organization settings saved successfully." });
  };

  useEffect(() => {
    const savedColor = localStorage.getItem("theme-color");
    if (savedColor) {
      handleColorChange(savedColor);
    }
  }, []);

  if (isLoadingSettings || (canAccessRoles && isLoadingRoles)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-muted-foreground" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage system configuration and preferences</p>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="system">System</TabsTrigger>}
          {canAccessRoles && <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>}
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Settings
              </CardTitle>
              <CardDescription>Customize the appearance of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme Mode</Label>
                    <p className="text-xs text-muted-foreground">Choose between light and dark mode</p>
                  </div>
                  {mounted && (
                    <Select value={theme} onValueChange={(value) => setTheme(value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <Label>Theme Color</Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      Select a primary color for your dashboard
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {themeColors.map((color) => (
                        <button
                          key={color.class}
                          onClick={() => handleColorChange(color.value)}
                          className={`relative h-12 w-full rounded-lg border-2 transition-all ${
                            selectedColor === color.value
                              ? "border-primary ring-2 ring-primary ring-offset-2"
                              : "border-border hover:border-primary/50"
                          }`}
                          style={{
                            backgroundColor: `hsl(${color.value})`,
                          }}
                          title={color.name}
                        >
                          {selectedColor === color.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center">
                                <svg
                                  className="h-4 w-4 text-primary"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="system" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Currency Settings
                </CardTitle>
                <CardDescription>Set the default currency symbol for the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="currency-symbol">Currency Symbol</Label>
                  <Select
                    value={currencySymbol}
                    onValueChange={handleCurrencyChange}
                    disabled={updateSettingsMutation.isPending}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$">Dollar ($)</SelectItem>
                      <SelectItem value="₹">Rupees (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This symbol will be used throughout the system for all users.
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-sm font-medium mb-2">Preview:</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-lg">
                      {currencySymbol}1,234.56
                    </p>
                  </div>
                </div>
                {updateSettingsMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="roles" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Roles & Permissions
              </CardTitle>
              <CardDescription>
                {isSuperAdmin 
                  ? "View and manage role permissions. Click on a role to see its permissions."
                  : "View role permissions"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role: any) => (
                  <div 
                    key={role.id} 
                    className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedRole === role.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {role.description || "No description available"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedRole === role.id ? (
                          <X className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Check className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {selectedRole === role.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-medium mb-3">Permissions:</p>
                        {isLoadingPermissions ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const permissions = rolePermissions[role.id] || [];
                              // Group permissions by module
                              const groupedPermissions: Record<string, any[]> = {};
                              permissions.forEach((perm: any) => {
                                if (!groupedPermissions[perm.module]) {
                                  groupedPermissions[perm.module] = [];
                                }
                                groupedPermissions[perm.module].push(perm);
                              });
                              
                              return Object.keys(groupedPermissions).length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                                    <div key={module} className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">{module}</p>
                                      <div className="space-y-1">
                                        {perms.map((perm: any) => {
                                          const permName = perm.code.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || perm.code;
                                          return (
                                            <div key={perm.id} className="flex items-center gap-2">
                                              {perm.allowed ? (
                                                <Check className="h-3 w-3 text-status-success" />
                                              ) : (
                                                <X className="h-3 w-3 text-muted-foreground" />
                                              )}
                                              <span className={`text-xs ${perm.allowed ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {permName}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground py-4">
                                  No permissions data available. This role may have all permissions (Super Admin) or permissions are not configured.
                                </div>
                              );
                            })()}
                            {isSuperAdmin && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <Button variant="outline" size="sm">
                                  Edit Permissions
                                </Button>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Click to modify permissions for this role. Changes will affect all users with this role.
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
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>MFA for Super Admin</Label>
                  <p className="text-xs text-muted-foreground">Require multi-factor authentication</p>
                </div>
                <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label>Session Timeout (minutes)</Label>
                <Input 
                  type="number" 
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-32" 
                  min="5"
                  max="1440"
                />
                <p className="text-xs text-muted-foreground">
                  Users will be logged out after this period of inactivity (5-1440 minutes)
                </p>
              </div>
              <Button onClick={handleSaveSecurity}>Save Security Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
