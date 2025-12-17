import { memo } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface EmployeeLeaveBalanceProps {
  annual_leave_count?: number | null;
  sick_leave_count?: number | null;
  casual_leave_count?: number | null;
}

export const EmployeeLeaveBalance = memo(({ 
  annual_leave_count, 
  sick_leave_count, 
  casual_leave_count 
}: EmployeeLeaveBalanceProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Leave Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-muted-foreground text-sm">Annual Leaves</Label>
          <div className="text-2xl font-bold mt-1">{annual_leave_count || 0}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Sick Leaves</Label>
          <div className="text-2xl font-bold mt-1">{sick_leave_count || 0}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Casual Leaves</Label>
          <div className="text-2xl font-bold mt-1">{casual_leave_count || 0}</div>
        </div>
      </CardContent>
    </Card>
  );
});

EmployeeLeaveBalance.displayName = 'EmployeeLeaveBalance';

