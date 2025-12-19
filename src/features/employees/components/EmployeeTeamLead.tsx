import { memo } from "react";
import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfilePhotoUrl } from "@/lib/imageUtils";

interface EmployeeTeamLeadProps {
  team_lead_name?: string | null;
  team_lead_email?: string | null;
  team_lead_photo_url?: string | null;
}

export const EmployeeTeamLead = memo(({ team_lead_name, team_lead_email, team_lead_photo_url }: EmployeeTeamLeadProps) => {
  const photoUrl = getProfilePhotoUrl(team_lead_photo_url);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Lead</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={team_lead_name || 'Team Lead'}
                className="h-10 w-10 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <User className={`h-5 w-5 text-primary ${photoUrl ? 'hidden' : ''}`} />
          </div>
          <div>
            <div className="text-sm font-medium">{team_lead_name || 'Unassigned'}</div>
            {team_lead_email && (
              <div className="text-xs text-muted-foreground">{team_lead_email}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

EmployeeTeamLead.displayName = 'EmployeeTeamLead';

