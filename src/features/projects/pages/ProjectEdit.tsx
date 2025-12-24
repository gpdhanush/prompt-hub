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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // If UUID, return the raw string so downstream components can fetch by UUID
    if (uuidRegex.test(trimmedId)) return trimmedId;
    const parsedId = parseInt(trimmedId, 10);
    return isNaN(parsedId) || parsedId <= 0 ? null : parsedId;
  }, [id]);

  const handleBack = useCallback(() => {
    navigate('/projects');
  }, [navigate]);
  
  // Validate that id is present
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
  
  // Log and render Edit form. `projectId` may be a number or a UUID string.
  logger.debug('ProjectEdit - id param:', id, 'resolved projectId:', projectId);

  if (projectId === null) {
    logger.error('ProjectEdit - Invalid project ID parameter:', id);
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive text-lg font-semibold">Invalid Project ID: {id?.trim() || 'undefined'}</div>
          <div className="text-sm text-muted-foreground max-w-md text-center">The project ID in the URL is invalid. Please go back and try again.</div>
          <Button onClick={handleBack} variant="outline">Back to Projects</Button>
        </div>
      </div>
    );
  }

  // Pass either numeric ID or UUID string to ProjectForm; ProjectForm will handle both.
  return <ProjectForm mode="edit" projectId={projectId as any} />;
}
