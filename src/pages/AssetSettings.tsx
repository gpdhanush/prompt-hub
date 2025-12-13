import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function AssetSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset Settings</h1>
        <p className="text-muted-foreground mt-2">Configure asset management settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Settings module coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
