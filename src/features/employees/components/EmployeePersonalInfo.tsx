import { memo } from "react";
import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface EmployeePersonalInfoProps {
  date_of_birth?: string | null;
  gender?: string | null;
  district?: string | null;
  teams_id?: string | null;
  whatsapp?: string | null;
  formatDate: (dateString: string | null | undefined) => string;
}

export const EmployeePersonalInfo = memo(({ 
  date_of_birth, 
  gender, 
  district, 
  teams_id, 
  whatsapp,
  formatDate 
}: EmployeePersonalInfoProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-muted-foreground text-sm">Date of Birth</Label>
          <div className="text-sm font-medium mt-1">{formatDate(date_of_birth)}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Gender</Label>
          <div className="text-sm font-medium mt-1">{gender || "Not provided"}</div>
        </div>
        {district && (
          <div>
            <Label className="text-muted-foreground text-sm">District</Label>
            <div className="text-sm font-medium mt-1">{district}</div>
          </div>
        )}
        {teams_id && (
          <div>
            <Label className="text-muted-foreground text-sm">Teams ID</Label>
            <div className="text-sm font-medium mt-1">{teams_id}</div>
          </div>
        )}
        {whatsapp && (
          <div>
            <Label className="text-muted-foreground text-sm">WhatsApp</Label>
            <div className="text-sm font-medium mt-1">{whatsapp}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

EmployeePersonalInfo.displayName = 'EmployeePersonalInfo';

