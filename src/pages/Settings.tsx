import { useState } from "react";
import { Settings as SettingsIcon, Users, Shield, Building, Bell, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [auditEnabled, setAuditEnabled] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-muted-foreground" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage system configuration and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>Basic organization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Organization Name</Label>
                <Input defaultValue="Acme Corporation" />
              </div>
              <div className="grid gap-2">
                <Label>Admin Email</Label>
                <Input defaultValue="admin@acme.com" type="email" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Connection
              </CardTitle>
              <CardDescription>MySQL connection settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Connection String</Label>
                <Input 
                  defaultValue="mysql://user:****@host:3306/database" 
                  type="password"
                  className="font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Test Connection</Button>
                <Button>Update</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Roles Management
              </CardTitle>
              <CardDescription>Configure roles and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Super Admin", "Admin", "Team Lead", "Employee", "Viewer"].map((role) => (
                  <div key={role} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium">{role}</p>
                      <p className="text-xs text-muted-foreground">
                        {role === "Super Admin" ? "Full system access" :
                         role === "Admin" ? "Manage users and projects" :
                         role === "Team Lead" ? "Project-level management" :
                         role === "Employee" ? "Task and self-management" :
                         "Read-only access"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
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
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audit Logging</Label>
                  <p className="text-xs text-muted-foreground">Log all admin actions</p>
                </div>
                <Switch checked={auditEnabled} onCheckedChange={setAuditEnabled} />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label>Session Timeout (minutes)</Label>
                <Input type="number" defaultValue="30" className="w-32" />
              </div>
              <div className="grid gap-2">
                <Label>IP Allowlist</Label>
                <Input placeholder="192.168.1.0/24, 10.0.0.0/8" className="font-mono" />
                <p className="text-xs text-muted-foreground">Comma-separated CIDR blocks</p>
              </div>
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
              <Separator />
              <div className="space-y-4">
                <Label>Notify me about:</Label>
                {[
                  "New task assignments",
                  "Bug reports",
                  "Reimbursement approvals",
                  "Leave requests",
                  "Prompt usage",
                ].map((item) => (
                  <div key={item} className="flex items-center justify-between">
                    <span className="text-sm">{item}</span>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
