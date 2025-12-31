import { memo } from "react";
import { MoreHorizontal, Edit, Trash2, Eye, FolderKanban, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge, projectStatusMap } from "@/components/ui/status-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaginationControls from "@/shared/components/PaginationControls";
import type { Project } from "../utils/utils";
import { formatDate } from "../utils/utils";
import { PROJECT_PAGE_LIMITS } from "../utils/constants";

interface ProjectsTableProps {
  projects: Project[];
  isLoading: boolean;
  error: any;
  searchQuery: string;
  statusFilter: string | null;
  page: number;
  limit: number;
  pagination: { total: number; totalPages: number };
  onPageChange: (page: number) => void;
  canEditProject: boolean;
  canDeleteProject: boolean;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export const ProjectsTable = memo(function ProjectsTable({
  projects,
  isLoading,
  error,
  searchQuery,
  statusFilter,
  page,
  limit,
  pagination,
  onPageChange,
  canEditProject,
  canDeleteProject,
  onView,
  onEdit,
  onDelete,
}: ProjectsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive font-semibold mb-2">
              {error.status === 503 
                ? 'Service Unavailable' 
                : error.status === 401
                ? 'Authentication Required'
                : 'Error Loading Projects'}
            </p>
            <p className="text-sm text-muted-foreground">
              {error.status === 503 
                ? 'The database service is temporarily unavailable. Please try again in a moment.'
                : error.status === 401
                ? 'Your session has expired. Please login again.'
                : error.message || 'An error occurred while loading projects. Please refresh the page.'}
            </p>
            {error.status === 503 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <FolderKanban className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'No projects available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Projects ({projects.length})</CardTitle>
            <CardDescription>List of all projects</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Project ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                // Log projects with invalid IDs for debugging
                if (!project.id || project.id <= 0) {
                  console.warn('Project with invalid ID found:', project);
                }
                return (
                  <TableRow 
                    key={project.id || `project-${project.name}`}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => onView(project)}
                  >
                    <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                      <span className="font-mono text-sm">
                        {project.project_code || `PRJ-${String(project.id).padStart(3, '0')}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{project.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {project.team_lead_name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={projectStatusMap[project.status] || "neutral"}>
                        {project.status || 'Planning'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(project)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canEditProject && (
                            <DropdownMenuItem onClick={() => onEdit(project)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDeleteProject && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => onDelete(project)}
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
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {projects.length > 0 && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} projects
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="page-limit" className="text-sm text-muted-foreground">
                  Rows per page:
                </Label>
                <Select
                  value={limit.toString()}
                  onValueChange={() => {
                    // Note: limit is constant, but we can add state if needed
                    onPageChange(1);
                  }}
                >
                  <SelectTrigger className="w-20" id="page-limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_PAGE_LIMITS.map((limitValue) => (
                      <SelectItem key={limitValue} value={limitValue.toString()}>
                        {limitValue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <PaginationControls
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={onPageChange}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
