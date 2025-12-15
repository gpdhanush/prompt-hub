import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge, projectStatusMap } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { projectsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { getImageUrl } from "@/lib/imageUtils";

// Component to handle project image with error fallback
const ProjectImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (imageError) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        setImageError(true);
        setImageLoading(false);
      }}
      onLoad={() => setImageLoading(false)}
      style={{ display: imageLoading ? 'none' : 'block' }}
    />
  );
};

type Project = {
  id: number;
  project_code?: string;
  name: string;
  description?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  created_by_email?: string;
  updated_by_name?: string;
  updated_by_email?: string;
  team_lead_id?: number;
  team_lead_name?: string;
  team_lead_email?: string;
  member_count?: number;
  logo_url?: string;
};

export default function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Get current user info for role-based permissions
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  
  // Use permission-based checks instead of hardcoded roles
  const { hasPermission } = usePermissions();
  const canCreateProject = hasPermission('projects.create');
  const canEditProject = hasPermission('projects.edit');
  const canDeleteProject = hasPermission('projects.delete');

  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch projects from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', searchQuery, viewFilter, page],
    queryFn: () => projectsApi.getAll({ 
      page, 
      limit, 
      my_projects: viewFilter === 'my' ? 1 : undefined 
    }),
  });

  const projects = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 0 };
  
  // Filter projects based on search query and status filter (client-side for now)
  const filteredProjects = projects.filter((project: Project) => {
    const matchesSearch = project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.project_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.id?.toString().includes(searchQuery);
    
    let matchesStatus = true;
    if (statusFilter) {
      if (statusFilter === 'In Progress') {
        // Match In Progress, Testing, Pre-Prod, or Production
        matchesStatus = project.status === 'In Progress' || 
                       project.status === 'Testing' || 
                       project.status === 'Pre-Prod' || 
                       project.status === 'Production';
      } else {
        matchesStatus = project.status === statusFilter;
      }
    }
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats from actual data (use all projects, not filtered)
  const allProjectsForStats = data?.data || [];
  const totalProjects = allProjectsForStats.length;
  const inProgressCount = allProjectsForStats.filter((p: Project) => 
    p.status === 'In Progress' || p.status === 'Testing' || p.status === 'Pre-Prod' || p.status === 'Production'
  ).length;
  const completedCount = allProjectsForStats.filter((p: Project) => 
    p.status === 'Completed'
  ).length;
  const onHoldCount = allProjectsForStats.filter((p: Project) => 
    p.status === 'On Hold'
  ).length;


  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatFullDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", { 
      year: "numeric",
      month: "long", 
      day: "numeric" 
    });
  };


  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project deleted successfully." });
      setShowDeleteDialog(false);
      setSelectedProject(null);
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = '/login';
      } else if (error.status === 403) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to delete projects.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to delete project." });
      }
    },
  });


  // Handlers
  const handleView = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleEdit = (project: Project) => {
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
  };

  const handleDelete = (project: Project) => {
    setSelectedProject(project);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject.id);
    }
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            {userRole === 'Admin' ? 'View and track all projects' : 'Manage and track all projects'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateProject && (
            <Button onClick={() => navigate('/projects/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className={`glass-card cursor-pointer transition-colors ${
            statusFilter === null ? 'bg-primary/10 border-primary' : ''
          }`}
          onClick={() => {
            setStatusFilter(null);
            setPage(1);
          }}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">Total Projects</p>
          </CardContent>
        </Card>
        <Card 
          className={`glass-card cursor-pointer transition-colors ${
            statusFilter === 'In Progress' || statusFilter === 'Testing' || statusFilter === 'Pre-Prod' || statusFilter === 'Production'
              ? 'bg-primary/10 border-primary' : ''
          }`}
          onClick={() => {
            // Toggle between In Progress states or clear
            if (statusFilter === 'In Progress') {
              setStatusFilter(null);
            } else {
              setStatusFilter('In Progress');
            }
            setPage(1);
          }}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card 
          className={`glass-card cursor-pointer transition-colors ${
            statusFilter === 'Completed' ? 'bg-primary/10 border-primary' : ''
          }`}
          onClick={() => {
            setStatusFilter(statusFilter === 'Completed' ? null : 'Completed');
            setPage(1);
          }}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card 
          className={`glass-card cursor-pointer transition-colors ${
            statusFilter === 'On Hold' ? 'bg-primary/10 border-primary' : ''
          }`}
          onClick={() => {
            setStatusFilter(statusFilter === 'On Hold' ? null : 'On Hold');
            setPage(1);
          }}
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-neutral">{onHoldCount}</div>
            <p className="text-xs text-muted-foreground">On Hold</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Projects</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewFilter('all');
                    setPage(1);
                  }}
                  className={viewFilter === 'all' ? '' : ''}
                >
                  All Projects
                </Button>
                <Button
                  variant={viewFilter === 'my' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewFilter('my');
                    setPage(1);
                  }}
                  className={viewFilter === 'my' ? '' : ''}
                >
                  My Projects
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-destructive font-semibold">
                        {(error as any).status === 503 
                          ? 'Service Unavailable' 
                          : (error as any).status === 401
                          ? 'Authentication Required'
                          : 'Error Loading Projects'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(error as any).status === 503 
                          ? 'The database service is temporarily unavailable. Please try again in a moment.'
                          : (error as any).status === 401
                          ? 'Your session has expired. Please login again.'
                          : error.message || 'An error occurred while loading projects. Please refresh the page.'}
                      </div>
                      {(error as any).status === 503 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.location.reload()}
                          className="mt-2"
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No projects found matching your search.' : 'No projects found. Create your first project to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project: Project) => {
                  // Log projects with invalid IDs for debugging
                  if (!project.id || project.id <= 0) {
                    console.warn('Project with invalid ID found:', project);
                  }
                  return (
                <TableRow 
                  key={project.id || `project-${project.name}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleView(project)}
                >
                  <TableCell className="font-mono font-bold text-primary" onClick={(e) => e.stopPropagation()}>
                        {project.project_code || `PRJ-${String(project.id).padStart(3, '0')}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {project.logo_url && getImageUrl(project.logo_url) && (
                        <ProjectImage 
                          src={getImageUrl(project.logo_url)!} 
                          alt={project.name}
                          className="h-10 w-10 rounded object-cover border flex-shrink-0"
                        />
                      )}
                      <span className="font-medium">{project.name}</span>
                    </div>
                  </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.team_lead_name || '-'}
                      </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={projectStatusMap[project.status] || "neutral"}>
                          {project.status || 'Planning'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(project)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                            {canEditProject && (
                              <DropdownMenuItem onClick={() => handleEdit(project)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                            )}
                            {canDeleteProject && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(project)}
                              >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                            )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              total={pagination.total}
              limit={limit}
            />
          )}
        </CardContent>
      </Card>


      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project{" "}
              <span className="font-semibold">{selectedProject?.name}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProject(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
