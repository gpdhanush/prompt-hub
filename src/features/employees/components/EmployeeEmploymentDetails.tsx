import { memo } from "react";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";

interface EmployeeEmploymentDetailsProps {
  role?: string | null;
  position?: string | null;
  date_of_joining?: string | null;
  employee_status?: string | null;
  status?: string | null;
  formatDate: (dateString: string | null | undefined) => string;
}

export const EmployeeEmploymentDetails = memo(({ 
  role, 
  position, 
  date_of_joining, 
  employee_status, 
  status,
  formatDate 
}: EmployeeEmploymentDetailsProps) => {
  const employeeStatus = employee_status || status || "Active";
  const statusVariant = employeeStatus === "Active" ? "success" : employeeStatus === "On Leave" ? "info" : "warning";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Employment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground text-sm">Role</Label>
            <div className="text-sm font-medium mt-1">{role || "Not assigned"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Position</Label>
            <div className="text-sm font-medium mt-1">{position || "Not assigned"}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Date of Joining</Label>
            <div className="text-sm font-medium mt-1">{formatDate(date_of_joining)}</div>
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Employee Status</Label>
            <div className="mt-1">
              <StatusBadge 
                variant={statusVariant}
                className="text-xs"
              >
                {employeeStatus}
              </StatusBadge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

EmployeeEmploymentDetails.displayName = 'EmployeeEmploymentDetails';

