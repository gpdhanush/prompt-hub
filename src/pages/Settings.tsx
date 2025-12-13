import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Shield, Building, Bell, Palette, DollarSign } from "lucide-react";
import { settingsApi } from "@/lib/api";
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
import { Loader2, Key, Copy, AlertCircle, Clock, Lock, CheckCircle2, XCircle, Timer } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { mfaApi, authApi } from "@/lib/api";
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
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [selectedColor, setSelectedColor] = useState("217 91% 60%");
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [isSavingTimeout, setIsSavingTimeout] = useState(false);
  const navigate = useNavigate();

  // Get current user info
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';

  const queryClient = useQueryClient();

  // Fetch MFA status
  const { data: mfaStatus, isLoading: isLoadingMfa, refetch: refetchMfa } = useQuery({
    queryKey: ['mfa-status'],
    queryFn: () => mfaApi.getStatus(),
  });

  const mfaEnabled = mfaStatus?.mfaEnabled || false;
  const mfaRequired = mfaStatus?.mfaRequired || false;
  const enforcedByAdmin = mfaStatus?.enforcedByAdmin || false;

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

  // Fetch settings from database
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  // Fetch user profile to get session timeout
  const { data: userProfile, refetch: refetchUserProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getMe(),
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
    // Get current primary color from CSS
    const root = document.documentElement;
    const primaryColor = getComputedStyle(root).getPropertyValue("--primary").trim();
    if (primaryColor) {
      setSelectedColor(primaryColor);
    }
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

  const handleSaveSessionTimeout = () => {
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

  if (isLoadingSettings) {
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

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MFA Section */}
            <Card className="glass-card border-2">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Multi-Factor Authentication</CardTitle>
                      <CardDescription>Add an extra layer of security to your account</CardDescription>
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
                            onClick={() => regenerateBackupCodesMutation.mutate()}
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

            {/* Session Timeout Section */}
            <Card className="glass-card border-2">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Timer className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Session Timeout</CardTitle>
                    <CardDescription>Configure automatic logout after inactivity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Inactivity Timeout</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out after this period of inactivity
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={sessionTimeout}
                          onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 30)}
                          className="w-32 text-center font-semibold text-lg pr-12" 
                          min="1"
                          max="1440"
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
              </CardContent>
            </Card>
          </div>
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
