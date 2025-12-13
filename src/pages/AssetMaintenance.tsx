import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function AssetMaintenance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground mt-2">Track asset maintenance and repairs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Maintenance module coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
