import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, Users, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { StatusBadge, projectStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { projectsApi, usersApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

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
};

export default function Projects() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [membersPopoverOpen, setMembersPopoverOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "Planning",
    start_date: "",
    end_date: "",
    team_lead_id: "",
    member_ids: [] as string[],
  });
  
  // Get current user info for role-based permissions
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userRole = currentUser?.role || '';
  const currentUserId = currentUser?.id;
  
  // Permissions: Super Admin and Team Lead have full CRUD access
  // Admin can only view (no create/edit/delete)
  const canCreateProject = userRole === 'Team Lead' || userRole === 'Super Admin';
  const canEditProject = userRole === 'Team Lead' || userRole === 'Super Admin';
  const canDeleteProject = userRole === 'Team Lead' || userRole === 'Super Admin';

  // Fetch projects from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', searchQuery, viewFilter],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100, my_projects: viewFilter === 'my' ? currentUserId : undefined }),
  });

  // Fetch users for team lead and members dropdowns
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  const projects = data?.data || [];
  const allUsers = usersData?.data || [];
  const teamLeads = allUsers.filter((user: any) => user.role === 'Team Lead');
  const assignableUsers = allUsers.filter((user: any) => 
    ['Developer', 'Designer', 'Tester', 'Team Lead'].includes(user.role)
  );
  
  // Filter projects based on search query
  const filteredProjects = projects.filter((project: Project) =>
    project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.id?.toString().includes(searchQuery)
  );

  // Calculate stats from actual data
  const totalProjects = projects.length;
  const inProgressCount = projects.filter((p: Project) => 
    p.status === 'In Progress' || p.status === 'Testing' || p.status === 'Pre-Prod' || p.status === 'Production'
  ).length;
  const completedCount = projects.filter((p: Project) => 
    p.status === 'Completed'
  ).length;
  const onHoldCount = projects.filter((p: Project) => 
    p.status === 'On Hold'
  ).length;

  // Calculate progress (mock for now - can be enhanced with actual task completion data)
  const calculateProgress = (project: Project) => {
    // This is a placeholder - in real app, calculate from tasks
    if (project.status === 'Completed') return 100;
    if (project.status === 'Planning') return 10;
    if (project.status === 'In Progress') return 30;
    if (project.status === 'Testing') return 70;
    if (project.status === 'Pre-Prod') return 85;
    if (project.status === 'Production') return 95;
    if (project.status === 'On Hold') return 0;
    return 0;
  };

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

  // Mutations
  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project created successfully." });
      setShowAddDialog(false);
      setProjectForm({ name: "", description: "", status: "Planning", start_date: "", end_date: "", team_lead_id: "", member_ids: [] });
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
          description: "You don't have permission to create projects. Only Team Leads can create projects.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to create project." });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      console.log('Frontend: Calling update API with:', { id, data });
      return projectsApi.update(id, data);
    },
    onSuccess: (response) => {
      console.log('Frontend: Update successful, response:', response);
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.refetchQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project updated successfully." });
      setShowEditDialog(false);
      setSelectedProject(null);
      setProjectForm({ name: "", description: "", status: "Planning", start_date: "", end_date: "", team_lead_id: "", member_ids: [] });
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
          description: "You don't have permission to update projects.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to update project." });
      }
    },
  });

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

  // Valid status values matching database ENUM
  const validStatuses = ['Planning', 'In Progress', 'Testing', 'Pre-Prod', 'Production', 'Completed', 'On Hold'];
  
  // Normalize status to ensure it's valid
  const normalizeStatus = (status: string | undefined): string => {
    if (!status) return 'Planning';
    // Map old/invalid statuses to valid ones
    const statusMap: Record<string, string> = {
      'Development': 'In Progress',
      'Dev': 'In Progress',
      'In-Progress': 'In Progress',
      'PreProd': 'Pre-Prod',
      'Pre Prod': 'Pre-Prod',
    };
    
    const normalized = statusMap[status] || status;
    // If normalized status is valid, return it; otherwise default to Planning
    return validStatuses.includes(normalized) ? normalized : 'Planning';
  };

  // Handlers
  const handleView = (project: Project) => {
    setSelectedProject(project);
    setShowViewDialog(true);
  };

  const handleEdit = async (project: Project) => {
    setSelectedProject(project);
    // Fetch full project details including members
    try {
      const projectData = await projectsApi.getById(project.id);
      const fullProject = projectData.data;
      setProjectForm({
        name: fullProject.name,
        description: fullProject.description || "",
        status: normalizeStatus(fullProject.status),
        start_date: fullProject.start_date ? fullProject.start_date.split('T')[0] : "",
        end_date: fullProject.end_date ? fullProject.end_date.split('T')[0] : "",
        team_lead_id: fullProject.team_lead_id?.toString() || "",
        member_ids: fullProject.member_ids || [],
      });
    } catch (error) {
      // Fallback to basic project data
      setProjectForm({
        name: project.name,
        description: project.description || "",
        status: normalizeStatus(project.status),
        start_date: project.start_date ? project.start_date.split('T')[0] : "",
        end_date: project.end_date ? project.end_date.split('T')[0] : "",
        team_lead_id: project.team_lead_id?.toString() || "",
        member_ids: [],
      });
    }
    setShowEditDialog(true);
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

  const handleCreateProject = () => {
    if (!projectForm.name) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    // Ensure status is valid
    const normalizedStatus = normalizeStatus(projectForm.status);

    createMutation.mutate({
      name: projectForm.name,
      description: projectForm.description,
      status: normalizedStatus,
      start_date: projectForm.start_date || null,
      end_date: projectForm.end_date || null,
      team_lead_id: projectForm.team_lead_id || null,
      member_ids: projectForm.member_ids || [],
    });
  };

  const handleUpdateProject = () => {
    if (!projectForm.name || !selectedProject) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    // Ensure status is valid
    const normalizedStatus = normalizeStatus(projectForm.status);

    console.log('Updating project:', {
      id: selectedProject.id,
      currentStatus: selectedProject.status,
      newStatus: projectForm.status,
      normalizedStatus: normalizedStatus,
      formData: projectForm
    });

    updateMutation.mutate({
      id: selectedProject.id,
      data: {
        name: projectForm.name,
        description: projectForm.description,
        status: normalizedStatus,
        start_date: projectForm.start_date || null,
        end_date: projectForm.end_date || null,
        team_lead_id: projectForm.team_lead_id || null,
        member_ids: projectForm.member_ids || [],
      },
    });
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
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={viewFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewFilter('all')}
            >
              All Projects
            </Button>
            <Button
              variant={viewFilter === 'my' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewFilter('my')}
            >
              My Projects
            </Button>
          </div>
          {canCreateProject && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to track and manage
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="Enter project name"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Enter project description"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="project-status">Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Planning">Planning</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Testing">Testing</SelectItem>
                        <SelectItem value="Pre-Prod">Pre-Prod</SelectItem>
                        <SelectItem value="Production">Production</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddDialog(false);
                      setProjectForm({ name: "", description: "", status: "Planning", start_date: "", end_date: "", team_lead_id: "", member_ids: [] });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateProject}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground">Total Projects</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
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
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
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
                <TableHead className="text-center">Members</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading projects...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-destructive">
                    Error loading projects. Please check your database connection.
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No projects found matching your search.' : 'No projects found. Create your first project to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project: Project) => {
                  const progress = calculateProgress(project);
                  return (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-muted-foreground">
                        {project.project_code || `PRJ-${String(project.id).padStart(3, '0')}`}
                  </TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.team_lead_name || '-'}
                      </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{project.member_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={projectStatusMap[project.status] || "neutral"}>
                          {project.status || 'Planning'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
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
        </CardContent>
      </Card>

      {/* View Project Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
            <DialogDescription>
              View project information and details
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Project ID</Label>
                <div className="font-mono text-sm">{selectedProject.project_code || `PRJ-${String(selectedProject.id).padStart(3, '0')}`}</div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Project Name</Label>
                <div className="font-medium">{selectedProject.name}</div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Description</Label>
                <div className="text-sm">{selectedProject.description || "No description provided"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <StatusBadge variant={projectStatusMap[selectedProject.status] || "neutral"}>
                    {selectedProject.status || 'Planning'}
                  </StatusBadge>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Progress</Label>
                  <div className="flex items-center gap-2">
                    <Progress value={calculateProgress(selectedProject)} className="h-2 w-32" />
                    <span className="text-sm">{calculateProgress(selectedProject)}%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Start Date</Label>
                  <div className="text-sm">{formatFullDate(selectedProject.start_date)}</div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">End Date</Label>
                  <div className="text-sm">{formatFullDate(selectedProject.end_date)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Created By</Label>
                  <div className="text-sm">
                    {selectedProject.created_by_name || 'N/A'}
                    {selectedProject.created_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(selectedProject.created_at)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Last Updated By</Label>
                  <div className="text-sm">
                    {selectedProject.updated_by_name || selectedProject.created_by_name || 'N/A'}
                    {selectedProject.updated_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(selectedProject.updated_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
                {canEditProject && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setShowViewDialog(false);
                      handleEdit(selectedProject);
                    }}
                  >
                    Edit Project
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-project-name">Project Name *</Label>
              <Input
                id="edit-project-name"
                placeholder="Enter project name"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea
                id="edit-project-description"
                placeholder="Enter project description"
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-project-status">Status</Label>
                <Select
                  value={projectForm.status}
                  onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={projectForm.start_date}
                  onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={projectForm.end_date}
                  onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedProject(null);
                  setProjectForm({ name: "", description: "", status: "Planning", start_date: "", end_date: "", team_lead_id: "", member_ids: [] });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateProject}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
