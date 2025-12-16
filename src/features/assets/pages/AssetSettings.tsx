import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  Bell,
  Shield,
  Package,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { assetsApi } from "@/features/assets/api";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";

export default function AssetSettings() {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const [settings, setSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: ["asset-settings"],
    queryFn: () => assetsApi.getSettings(),
    enabled: isAdmin,
  });

  // Update settings when data loads
  useEffect(() => {
    if (settingsData?.data) {
      const settingsMap: Record<string, any> = {};
      settingsData.data.forEach((setting: any) => {
        settingsMap[setting.setting_key] = setting;
      });
      setSettings(settingsMap);
    }
  }, [settingsData]);

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value, description }: { key: string; value: string; description?: string }) =>
      assetsApi.updateSetting(key, { setting_value: value, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-settings"] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update setting",
        variant: "destructive",
      });
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        setting_value: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = (key: string) => {
    const setting = settings[key];
    if (!setting) return;

    updateSettingMutation.mutate({
      key,
      value: setting.setting_value,
      description: setting.description,
    });
  };

  const getSettingValue = (key: string, defaultValue: any = "") => {
    return settings[key]?.setting_value || defaultValue;
  };

  const getSettingType = (key: string): "boolean" | "number" | "string" => {
    return settings[key]?.setting_type || "string";
  };

  const renderSettingInput = (key: string, label: string, description?: string) => {
    const setting = settings[key];
    const type = getSettingType(key);
    const value = getSettingValue(key);

    if (type === "boolean") {
      return (
        <div className="flex items-center justify-between space-x-4">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor={key} className="text-base">
              {label}
            </Label>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={key}
              checked={value === "true" || value === true}
              onCheckedChange={(checked) => handleSettingChange(key, checked ? "true" : "false")}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSave(key)}
              disabled={updateSettingMutation.isPending}
            >
              {updateSettingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      );
    }

    if (type === "number") {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={key} className="text-base">
              {label}
            </Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSave(key)}
              disabled={updateSettingMutation.isPending}
            >
              {updateSettingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <Input
            id={key}
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            placeholder={description}
          />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={key} className="text-base">
            {label}
          </Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave(key)}
            disabled={updateSettingMutation.isPending}
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <Input
          id={key}
          value={value}
          onChange={(e) => handleSettingChange(key, e.target.value)}
          placeholder={description}
        />
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            You need admin privileges to access asset settings
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12 text-destructive">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="font-medium">Error loading settings</p>
          <p className="text-sm text-muted-foreground mt-2">
            {(error as any)?.message || "Failed to fetch settings"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Asset Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure asset management preferences and notifications
          </p>
        </div>
      </div>

      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="approvals">
            <Shield className="h-4 w-4 mr-2" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="assets">
            <Settings className="h-4 w-4 mr-2" />
            Assets
          </TabsTrigger>
        </TabsList>

        {/* Approvals Settings */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval Settings</CardTitle>
              <CardDescription>
                Configure approval workflow and automation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderSettingInput(
                "auto_approve_assignments",
                "Auto-approve Assignments",
                "Automatically approve asset assignments without manual review"
              )}
              {renderSettingInput(
                "require_approval_for_returns",
                "Require Approval for Returns",
                "Require approval before processing asset returns"
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Settings */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>
                Configure inventory management and stock alert settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderSettingInput(
                "low_stock_threshold",
                "Low Stock Threshold",
                "Default minimum stock level for triggering low stock alerts"
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure email and system notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderSettingInput(
                "enable_email_notifications",
                "Enable Email Notifications",
                "Send email notifications for asset events (assignments, returns, maintenance, etc.)"
              )}
              {renderSettingInput(
                "warranty_reminder_days",
                "Warranty Reminder Days",
                "Number of days before warranty expiry to send reminder notifications"
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assets Settings */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Settings</CardTitle>
              <CardDescription>
                Configure default asset settings and code generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderSettingInput(
                "default_asset_status",
                "Default Asset Status",
                "Default status for newly created assets"
              )}
              {renderSettingInput(
                "asset_code_prefix",
                "Asset Code Prefix",
                "Prefix for auto-generated asset codes"
              )}
              {renderSettingInput(
                "enable_barcode_scanning",
                "Enable Barcode Scanning",
                "Enable barcode scanning functionality for assets"
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Settings Information
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Changes to settings are saved immediately when you click the save button next to each setting.
                Some settings may require a page refresh to take full effect.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
