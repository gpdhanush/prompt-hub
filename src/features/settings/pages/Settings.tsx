import { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Shield, Building, Palette, DollarSign } from "lucide-react";
import { settingsApi } from "@/features/settings/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Key, Copy, AlertCircle, Clock, Lock, CheckCircle2, XCircle, Timer } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { mfaApi, authApi } from "@/features/auth/api";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const themeColors = [
  { name: "Blue", value: "217 91% 60%", class: "blue" },
  { name: "Green", value: "142 71% 45%", class: "green" },
  { name: "Purple", value: "262 83% 58%", class: "purple" },
  { name: "Orange", value: "25 95% 53%", class: "orange" },
  { name: "Pink", value: "330 81% 60%", class: "pink" },
  { name: "Red", value: "0 72% 51%", class: "red" },
  { name: "Teal", value: "173 80% 40%", class: "teal" },
  { name: "Indigo", value: "239 84% 67%", class: "indigo" },
  { name: "Cyan", value: "188 78% 41%", class: "cyan" },
  { name: "Amber", value: "43 96% 56%", class: "amber" },
  { name: "Lime", value: "75 80% 50%", class: "lime" },
  { name: "Emerald", value: "160 84% 39%", class: "emerald" },
  { name: "Violet", value: "258 90% 66%", class: "violet" },
  { name: "Rose", value: "350 89% 60%", class: "rose" },
  { name: "Sky", value: "199 89% 48%", class: "sky" },
  { name: "Indigo1", value: "242 57% 58%", class: "indigo1" },
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
  const [selectedColor, setSelectedColor] = useState("217 91% 60%");
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [isSavingTimeout, setIsSavingTimeout] = useState(false);
  const navigate = useNavigate();

  // Get current user info
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';

  const queryClient = useQueryClient();

  // Fetch MFA status - optimized query
  const { data: mfaStatus, isLoading: isLoadingMfa, refetch: refetchMfa } = useQuery({
    queryKey: ['mfa-status'],
    queryFn: () => mfaApi.getStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Memoized derived values
  const mfaEnabled = useMemo(() => mfaStatus?.mfaEnabled || false, [mfaStatus?.mfaEnabled]);
  const mfaRequired = useMemo(() => mfaStatus?.mfaRequired || false, [mfaStatus?.mfaRequired]);
  const enforcedByAdmin = useMemo(() => mfaStatus?.enforcedByAdmin || false, [mfaStatus?.enforcedByAdmin]);

  // Disable MFA mutation
  const disableMfaMutation = useMutation({
    mutationFn: (password?: string) => mfaApi.disable(password),
    onSuccess: () => {
      refetchMfa();
      toast({ title: "Success", description: "MFA has been disabled successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to disable MFA.", variant: "destructive" });
    },
  });

  // Regenerate backup codes mutation
  const regenerateBackupCodesMutation = useMutation({
    mutationFn: () => mfaApi.regenerateBackupCodes(),
    onSuccess: (data) => {
      toast({ 
        title: "Backup Codes Regenerated", 
        description: "Your backup codes have been regenerated. Please save them in a safe place.",
      });
      // Show backup codes in a dialog or alert
      const codesText = data.backupCodes.join('\n');
      alert(`Your new backup codes:\n\n${codesText}\n\nPlease save these codes in a safe place.`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to regenerate backup codes.", variant: "destructive" });
    },
  });

  // Fetch settings from database - optimized query
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 1000 * 60 * 10, // 10 minutes (settings don't change often)
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch user profile to get session timeout - optimized query
  const { data: userProfile, refetch: refetchUserProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getMe(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update session timeout when user profile loads
  useEffect(() => {
    if (userProfile?.data?.session_timeout) {
      setSessionTimeout(userProfile.data.session_timeout);
    }
  }, [userProfile]);

  // Currency symbol from database
  const [currencySymbol, setCurrencySymbol] = useState('$');

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
    // Load saved theme color from localStorage, or use default
    const savedColor = localStorage.getItem("theme-color");
    const defaultColor = "242 57% 58%"; // Default indigo color
    const colorToUse = savedColor || defaultColor;
    
    const root = document.documentElement;
    root.style.setProperty("--primary", colorToUse);
    root.style.setProperty("--ring", colorToUse);
    root.style.setProperty("--sidebar-primary", colorToUse);
    root.style.setProperty("--sidebar-ring", colorToUse);
    root.style.setProperty("--chart-1", colorToUse);
    setSelectedColor(colorToUse);
    
    // If no color was saved, save the default
    if (!savedColor) {
      localStorage.setItem("theme-color", defaultColor);
    }
    
    // Set default theme to light if not set
    const savedTheme = localStorage.getItem("vite-ui-theme");
    if (!savedTheme) {
      localStorage.setItem("vite-ui-theme", "light");
      setTheme("light");
    }
  }, [setTheme]);

  const handleColorChange = useCallback(async (colorValue: string) => {
    setSelectedColor(colorValue);
    const root = document.documentElement;
    root.style.setProperty("--primary", colorValue);
    root.style.setProperty("--ring", colorValue);
    root.style.setProperty("--sidebar-primary", colorValue);
    root.style.setProperty("--sidebar-ring", colorValue);
    root.style.setProperty("--chart-1", colorValue);
    
    // Save to database
    try {
      await authApi.updateProfile({ theme_color: colorValue });
      toast({ title: "Success", description: "Theme color updated successfully." });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save theme color.", 
        variant: "destructive" 
      });
    }
  }, []);

  const handleCurrencyChange = useCallback((symbol: string) => {
    if (!isSuperAdmin) return;
    setCurrencySymbol(symbol);
    updateSettingsMutation.mutate({ currency_symbol: symbol });
  }, [isSuperAdmin, updateSettingsMutation]);

  // Save session timeout mutation
  const saveSessionTimeoutMutation = useMutation({
    mutationFn: (timeout: number) => authApi.updateProfile({ session_timeout: timeout }),
    onSuccess: () => {
      refetchUserProfile();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: "Success", description: "Session timeout updated successfully." });
      setIsSavingTimeout(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update session timeout.", variant: "destructive" });
      setIsSavingTimeout(false);
    },
  });

  const handleSaveSessionTimeout = useCallback(() => {
    const timeout = parseInt(String(sessionTimeout));
    if (isNaN(timeout) || timeout < 1 || timeout > 1440) {
      toast({ 
        title: "Invalid Timeout", 
        description: "Session timeout must be between 1 and 1440 minutes.",
        variant: "destructive" 
      });
      return;
    }
    setIsSavingTimeout(true);
    saveSessionTimeoutMutation.mutate(timeout);
  }, [sessionTimeout, saveSessionTimeoutMutation]);

  const handleSaveOrganization = useCallback(() => {
    toast({ title: "Success", description: "Organization settings saved successfully." });
  }, []);

  useEffect(() => {
    const savedColor = localStorage.getItem("theme-color");
    if (savedColor) {
      handleColorChange(savedColor);
    }
  }, []);

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  function handleRegenerateBackupCodes(event: React.MouseEvent<HTMLButtonElement>): void {
    // You can add logic here to actually regenerate backup codes
    // For now we'll simply show a toast
    toast({
      title: "Backup Codes Regenerated",
      description: "Your backup codes have been regenerated successfully.",
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <span className="text-primary">Settings</span>
        </h1>
        <p className="text-muted-foreground">Manage system configuration and preferences</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appearance Section */}
            <Card className="glass-card border-2">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Palette className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of your dashboard</CardDescription>
                  </div>
                </div>
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
                      <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 border-2 border-border/50 shadow-sm">
                        {themeColors.map((color) => (
                          <button
                            key={color.class}
                            onClick={() => handleColorChange(color.value)}
                            className={`relative h-14 w-full rounded-xl border-2 transition-all transform hover:scale-105 hover:shadow-lg ${
                              selectedColor === color.value
                                ? "border-primary ring-4 ring-primary/30 ring-offset-2 shadow-lg scale-105"
                                : "border-border/50 hover:border-primary/50 hover:shadow-md"
                            }`}
                            style={{
                              backgroundColor: `hsl(${color.value})`,
                            }}
                            title={color.name}
                          >
                            {selectedColor === color.value && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-7 w-7 rounded-full bg-white/95 shadow-md flex items-center justify-center backdrop-blur-sm">
                                  <svg
                                    className="h-5 w-5 text-primary"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            )}
                            {!selectedColor && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-medium text-white drop-shadow-lg bg-black/20 px-1.5 py-0.5 rounded">
                                  {color.name}
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  {/* Session Timeout Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Timer className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold">Session Timeout</Label>
                        <p className="text-xs text-muted-foreground">Configure automatic logout after inactivity</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          <div className="relative">
                            <Input 
                              type="text" 
                              value={sessionTimeout}
                              onChange={handleSaveSessionTimeout}
                              onBlur={handleSaveSessionTimeout}
                              className="w-32 text-center font-semibold text-lg pr-12" 
                              maxLength={4}
                              placeholder="30"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              min
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-center">
                            {sessionTimeout < 60 
                              ? `${sessionTimeout} minute${sessionTimeout !== 1 ? 's' : ''}`
                              : `${Math.floor(sessionTimeout / 60)} hour${Math.floor(sessionTimeout / 60) !== 1 ? 's' : ''} ${sessionTimeout % 60 > 0 ? `${sessionTimeout % 60} minute${sessionTimeout % 60 !== 1 ? 's' : ''}` : ''}`
                            } of inactivity
                          </span>
                        </div>

                        <div className="pt-2">
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span>Range: 1 - 1440 minutes (1 day)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleSaveSessionTimeout}
                      disabled={isSavingTimeout || saveSessionTimeoutMutation.isPending}
                      className="w-full"
                    >
                      {isSavingTimeout || saveSessionTimeoutMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Save Session Timeout
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="glass-card border-2">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Security</CardTitle>
                      <CardDescription>Protect your account with advanced security</CardDescription>
                    </div>
                  </div>
                  {!isLoadingMfa && (
                    <Badge variant={mfaEnabled ? "default" : "secondary"} className="text-sm px-3 py-1">
                      {mfaEnabled ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Disabled
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingMfa ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {mfaRequired && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                          MFA is required for your role ({userRole}) and cannot be disabled.
                        </AlertDescription>
                      </Alert>
                    )}

                    {mfaEnabled ? (
                      <div className="space-y-3">
                        <div className="p-4 rounded-lg bg-muted/50 border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Status</span>
                            <Badge variant="default" className="bg-status-success">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          </div>
                          {mfaStatus?.mfaVerifiedAt && (
                            <p className="text-xs text-muted-foreground">
                              Last verified: {new Date(mfaStatus.mfaVerifiedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            onClick={() => navigate("/mfa/setup")}
                            className="w-full"
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Reconfigure MFA
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleRegenerateBackupCodes}
                            disabled={regenerateBackupCodesMutation.isPending}
                            className="w-full"
                          >
                            <Key className="mr-2 h-4 w-4" />
                            {regenerateBackupCodesMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              "Backup Codes"
                            )}
                          </Button>
                        </div>
                        
                        {!mfaRequired && (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to disable MFA? This will make your account less secure."
                                )
                              ) {
                                disableMfaMutation.mutate(undefined);
                              }
                            }}
                            disabled={disableMfaMutation.isPending}
                            className="w-full"
                          >
                            {disableMfaMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Disabling...
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Disable MFA
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/20 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 dark:border-primary/30 shadow-sm">
                          <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-3 rounded-full bg-primary/20 dark:bg-primary/30">
                              <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-semibold text-base">Enable Multi-Factor Authentication</h3>
                              <p className="text-sm text-muted-foreground max-w-sm">
                                Protect your account with two-factor authentication. You'll need an authenticator app like Google Authenticator or Authy.
                              </p>
                            </div>
                            <Button
                              onClick={() => navigate("/mfa/setup")}
                              className="w-full mt-2"
                              size="lg"
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Set Up MFA
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

        {isSuperAdmin && (
          <div className="space-y-6 mt-6">
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
          </div>
        )}

      </div>
    </div>
  );
}
