import { memo } from "react";
import { Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface EmployeeAddressProps {
  address1?: string | null;
  address2?: string | null;
  state?: string | null;
  district?: string | null;
  pincode?: string | null;
  landmark?: string | null;
}

export const EmployeeAddress = memo(({ 
  address1, 
  address2, 
  state, 
  district, 
  pincode, 
  landmark 
}: EmployeeAddressProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-muted-foreground text-sm">Address Line 1</Label>
          <div className="text-sm mt-1">{address1 || "Not provided"}</div>
        </div>
        {address2 && (
          <div>
            <Label className="text-muted-foreground text-sm">Address Line 2</Label>
            <div className="text-sm mt-1">{address2}</div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-muted-foreground text-sm">State</Label>
            <div className="text-sm mt-1">{state || "Not provided"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">District</Label>
            <div className="text-sm mt-1">{district || "Not provided"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Pincode</Label>
            <div className="text-sm mt-1">{pincode || "Not provided"}</div>
          </div>
        </div>
        {landmark && (
          <div>
            <Label className="text-muted-foreground text-sm">Landmark</Label>
            <div className="text-sm mt-1">{landmark}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

EmployeeAddress.displayName = 'EmployeeAddress';

