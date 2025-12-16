import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjectsQuery, useProjectMutations } from "@/hooks/useProjects";
import { ProjectsHeader } from "@/components/project/ProjectsHeader";
import { ProjectsFilters } from "@/components/project/ProjectsFilters";
import { ProjectsTable } from "@/components/project/ProjectsTable";
import { DeleteProjectDialog } from "@/components/project/DeleteProjectDialog";
import { filterProjects } from "@/components/project/utils";
import { DEFAULT_PAGE_LIMIT } from "@/components/project/constants";
import type { Project } from "@/components/project/utils";

export default function Projects() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [page, setPage] = useState(1);
  const limit = DEFAULT_PAGE_LIMIT;
  
  // Use permission-based checks instead of hardcoded roles
  const { hasPermission } = usePermissions();
  const canCreateProject = hasPermission('projects.create');
  const canEditProject = hasPermission('projects.edit');
  const canDeleteProject = hasPermission('projects.delete');

  // Fetch projects from API
  const { data, isLoading, error } = useProjectsQuery({ page, limit, viewFilter });

  const projects = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 0 };
  
  // Filter projects based on search query and status filter (client-side for now)
  const filteredProjects = useMemo(
    () => filterProjects(projects, searchQuery, statusFilter),
    [projects, searchQuery, statusFilter]
  );

  // Project mutations
  const { deleteMutation } = useProjectMutations();

  // Handlers with useCallback to prevent unnecessary re-renders
  const handleView = useCallback((project: Project) => {
    navigate(`/projects/${project.id}`);
  }, [navigate]);

  const handleEdit = useCallback((project: Project) => {
    // Ensure project has a valid ID before navigating
    if (!project.id || project.id <= 0) {
      console.error('Invalid project ID in handleEdit:', project);
      toast({
        title: "Cannot Edit Project",
        description: `Project "${project.name}" has an invalid ID (${project.id}). This project needs to be fixed in the database. Please run the SQL fix script or contact your database administrator.`,
        variant: "destructive",
        duration: 10000,
      });
      return;
    }
    console.log('Navigating to edit project:', project.id, project.name);
    navigate(`/projects/${project.id}/edit`);
  }, [navigate]);

  const handleDelete = useCallback((project: Project) => {
    setSelectedProject(project);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject.id, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setSelectedProject(null);
        },
      });
    }
  }, [selectedProject, deleteMutation]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string | null) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleViewFilterChange = useCallback((value: 'all' | 'my') => {
    setViewFilter(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <div className="space-y-6">
      <ProjectsHeader canCreateProject={canCreateProject} />

      <ProjectsFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        viewFilter={viewFilter}
        onViewFilterChange={handleViewFilterChange}
      />

      <ProjectsTable
        projects={filteredProjects}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        page={page}
        limit={limit}
        pagination={pagination}
        onPageChange={handlePageChange}
        canEditProject={canEditProject}
        canDeleteProject={canDeleteProject}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DeleteProjectDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        project={selectedProject}
        isDeleting={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
