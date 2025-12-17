import { memo } from "react";
import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface EmployeeBankDetailsProps {
  bank_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
  pf_uan_number?: string | null;
}

export const EmployeeBankDetails = memo(({ 
  bank_name, 
  bank_account_number, 
  ifsc_code, 
  pf_uan_number 
}: EmployeeBankDetailsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Bank Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-muted-foreground text-sm">Bank Name</Label>
            <div className="text-sm font-medium mt-1">{bank_name || "Not provided"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Account Number</Label>
            <div className="text-sm font-medium font-mono mt-1">
              {bank_account_number ? "••••" + bank_account_number.slice(-4) : "Not provided"}
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">IFSC Code</Label>
            <div className="text-sm font-medium font-mono mt-1">{ifsc_code || "Not provided"}</div>
          </div>
        </div>
        {pf_uan_number && (
          <div>
            <Label className="text-muted-foreground text-sm">PF UAN Number</Label>
            <div className="text-sm font-medium mt-1">{pf_uan_number}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

EmployeeBankDetails.displayName = 'EmployeeBankDetails';

