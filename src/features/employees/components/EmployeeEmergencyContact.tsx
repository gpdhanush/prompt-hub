import { memo } from "react";
import { Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface EmployeeEmergencyContactProps {
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_number?: string | null;
}

export const EmployeeEmergencyContact = memo(({ 
  emergency_contact_name, 
  emergency_contact_relation, 
  emergency_contact_number 
}: EmployeeEmergencyContactProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Emergency Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-muted-foreground text-sm">Contact Name</Label>
          <div className="text-sm font-medium mt-1">{emergency_contact_name || "Not provided"}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Relation</Label>
          <div className="text-sm font-medium mt-1">{emergency_contact_relation || "Not provided"}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-sm">Contact Number</Label>
          <div className="text-sm font-medium mt-1">{emergency_contact_number || "Not provided"}</div>
        </div>
      </CardContent>
    </Card>
  );
});

EmployeeEmergencyContact.displayName = 'EmployeeEmergencyContact';

