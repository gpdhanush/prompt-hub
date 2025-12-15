import { useParams } from "react-router-dom";
import ProjectForm from "@/components/project/ProjectForm";

export default function ProjectEdit() {
  const { id } = useParams<{ id: string }>();
  return <ProjectForm mode="edit" projectId={Number(id)} />;
}
