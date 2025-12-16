import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

interface EmployeesHeaderProps {
  canCreateEmployee: boolean;
}

export const EmployeesHeader = memo(function EmployeesHeader({ canCreateEmployee }: EmployeesHeaderProps) {
  const navigate = useNavigate();

  const handleCreate = useCallback(() => {
    navigate('/employees/new');
  }, [navigate]);

  return (
    <div className="flex items-center justify-between">
      <PageTitle
        title="Employees"
        icon={User}
        description="Manage employee records"
      />
      {canCreateEmployee && (
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      )}
    </div>
  );
});

