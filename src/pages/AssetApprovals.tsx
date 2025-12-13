import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function AssetApprovals() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground mt-2">Review and approve asset requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Approvals module coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
