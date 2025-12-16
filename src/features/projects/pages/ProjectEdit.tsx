import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useCallback } from "react";
import ProjectForm from "../components/ProjectForm";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";

export default function ProjectEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const projectId = useMemo(() => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return null;
    }
    const trimmedId = id.trim();
    const parsedId = parseInt(trimmedId, 10);
    return isNaN(parsedId) || parsedId <= 0 ? null : parsedId;
  }, [id]);

  const handleBack = useCallback(() => {
    navigate('/projects');
  }, [navigate]);
  
  // Validate that id is a valid number
  if (!id || typeof id !== 'string' || id.trim() === '') {
    logger.warn('ProjectEdit - Missing or invalid id parameter:', id);
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading project...</div>
        </div>
      </div>
    );
  }
  
  // Parse the ID and validate it
  const trimmedId = id.trim();
  const parsedProjectId = parseInt(trimmedId, 10);
  
  logger.debug('ProjectEdit - id from params:', id, 'trimmed:', trimmedId, 'parsed projectId:', parsedProjectId);
  
  // If projectId is invalid (including 0), show error instead of passing undefined
  if (isNaN(parsedProjectId) || parsedProjectId <= 0) {
    logger.error('ProjectEdit - Invalid project ID:', id, 'parsed as:', parsedProjectId);
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive text-lg font-semibold">
            Invalid Project ID: {parsedProjectId === 0 ? '0' : trimmedId}
          </div>
          <div className="text-sm text-muted-foreground max-w-md text-center">
            {parsedProjectId === 0 
              ? 'This project has ID 0 in the database. Please run the SQL fix: database/migrations/fix_project_id_zero_all_in_one.sql'
              : 'The project ID in the URL is invalid. Please go back and try again.'}
          </div>
          <Button onClick={handleBack} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }
  
  // Pass the valid projectId to ProjectForm
  return <ProjectForm mode="edit" projectId={parsedProjectId} />;
}
