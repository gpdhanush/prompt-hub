import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse } from "lucide-react";

export default function AssetInventory() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-2">View inventory summary and stock levels</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Warehouse className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Inventory module coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
