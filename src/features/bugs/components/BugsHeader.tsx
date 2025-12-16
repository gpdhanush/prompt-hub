import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

interface BugsHeaderProps {
  canCreateBug: boolean;
  userRole?: string;
}

export const BugsHeader = memo(function BugsHeader({ canCreateBug, userRole }: BugsHeaderProps) {
  const navigate = useNavigate();

  const handleCreate = useCallback(() => {
    navigate('/bugs/new');
  }, [navigate]);

  return (
    <div className="flex items-center justify-between">
      <PageTitle
        title="Bug Tracker"
        icon={AlertCircle}
        description={userRole === 'Admin' ? 'View and track bugs across projects' : 'Track and resolve bugs across projects'}
      />
      {canCreateBug && (
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Report Bug
        </Button>
      )}
    </div>
  );
});

