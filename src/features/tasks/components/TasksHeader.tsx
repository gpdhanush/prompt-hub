import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

interface TasksHeaderProps {
  canCreateTask: boolean;
  userRole?: string;
}

export const TasksHeader = memo(function TasksHeader({ canCreateTask, userRole }: TasksHeaderProps) {
  const navigate = useNavigate();

  const handleCreate = useCallback(() => {
    navigate('/tasks/new');
  }, [navigate]);

  return (
    <div className="flex items-center justify-between">
      <PageTitle
        title="Tasks"
        icon={CheckSquare}
        description={userRole === 'Admin' ? 'View and track all tasks' : 'Track and manage all tasks'}
      />
      {canCreateTask && (
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      )}
    </div>
  );
});

