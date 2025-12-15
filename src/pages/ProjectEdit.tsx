import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ProjectForm from "@/components/project/ProjectForm";

export default function ProjectEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Validate that id is a valid number
  const projectId = id ? Number(id) : NaN;
  
  useEffect(() => {
    if (!id || isNaN(projectId) || projectId <= 0) {
      // Invalid project ID, redirect to projects list
      navigate('/projects');
    }
  }, [id, projectId, navigate]);
  
  // Don't render if projectId is invalid
  if (!id || isNaN(projectId) || projectId <= 0) {
    return null;
  }
  
  return <ProjectForm mode="edit" projectId={projectId} />;
}
