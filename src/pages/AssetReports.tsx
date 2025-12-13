import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";

export default function AssetReports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset Reports</h1>
        <p className="text-muted-foreground mt-2">Generate and view asset reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileBarChart className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Reports module coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
