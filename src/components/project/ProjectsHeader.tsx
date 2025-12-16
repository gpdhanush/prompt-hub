import { useNavigate } from "react-router-dom";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";

interface ProjectsHeaderProps {
  canCreateProject: boolean;
}

export const ProjectsHeader = ({ canCreateProject }: ProjectsHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <PageTitle
        title="Projects"
        icon={FolderKanban}
        description="Manage and track all your projects"
      />
      {canCreateProject && (
        <Button onClick={() => navigate('/projects/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      )}
    </div>
  );
};

