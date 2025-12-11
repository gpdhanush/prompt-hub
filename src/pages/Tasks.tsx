import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, MessageSquare, Paperclip } from "lucide-react";
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
import { StatusBadge, taskStageMap, taskPriorityMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tasksApi, projectsApi, usersApi } from "@/lib/api";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast";

type Task = {
  id: number;
  task_code?: string;
  project_id?: number;
  title: string;
  description?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_to_email?: string;
  developer_id?: number;
  developer_name?: string;
  designer_id?: number;
  designer_name?: string;
  tester_id?: number;
  tester_name?: string;
  priority?: string;
  stage?: string;
  status?: string;
  deadline?: string;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  created_by_email?: string;
  updated_by_name?: string;
  updated_by_email?: string;
};

const stages = ["All", "Analysis", "Documentation", "Development", "Testing", "Pre-Prod", "Production", "Closed"];

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStage, setActiveStage] = useState("All");
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    project_id: "",
    title: "",
    description: "",
    priority: "Medium",
    stage: "Analysis",
    status: "Open",
    assigned_to: "",
    developer_id: "",
    designer_id: "",
    tester_id: "",
    deadline: "",
  });
  
  // Get current user info for role-based permissions
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userRole = currentUser?.role || '';
  const currentUserId = currentUser?.id;
  
  // Permissions: Super Admin and Team Lead have full CRUD access
  // Developer, Designer, Tester can create and update tasks (but not delete)
  // Admin can only view (no create/edit/delete)
  const canCreateTask = (userRole === 'Team Lead' || userRole === 'Developer' || userRole === 'Designer' || userRole === 'Tester' || userRole === 'Super Admin');
  const canEditTask = (userRole === 'Team Lead' || userRole === 'Developer' || userRole === 'Designer' || userRole === 'Tester' || userRole === 'Super Admin');
  const canDeleteTask = (userRole === 'Team Lead' || userRole === 'Super Admin');

  // Fetch tasks from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', searchQuery, activeStage, viewFilter],
    queryFn: () => tasksApi.getAll({ page: 1, limit: 100, my_tasks: viewFilter === 'my' ? currentUserId : undefined }),
  });

  // Fetch projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
  });

  // Fetch users for assignment dropdown (Employee, Team Lead, and Tester roles)
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  const tasks = data?.data || [];
  const projects = projectsData?.data || [];
  const allUsers = usersData?.data || [];
  
  // Separate users by role for different dropdowns
  const developers = allUsers.filter((user: any) => user.role === 'Developer');
  const designers = allUsers.filter((user: any) => user.role === 'Designer');
  const testers = allUsers.filter((user: any) => user.role === 'Tester');
  
  // For backward compatibility - keep assignableUsers for the old assigned_to field
  const assignableUsers = allUsers
    .filter((user: any) => 
      user.role === 'Developer' || user.role === 'Designer' || user.role === 'Tester' || user.role === 'Team Lead'
    )
    .sort((a: any, b: any) => {
      const roleOrder: { [key: string]: number } = {
        'Team Lead': 1,
        'Developer': 2,
        'Designer': 3,
        'Tester': 4,
      };
      return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
    });


  const filteredTasks = tasks.filter((task: Task) => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.task_code?.includes(searchQuery) ||
      task.id?.toString().includes(searchQuery);
    const matchesStage = activeStage === "All" || task.stage === activeStage;
    return matchesSearch && matchesStage;
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task created successfully." });
      setShowAddDialog(false);
      setTaskForm({ project_id: "", title: "", description: "", priority: "Medium", stage: "Analysis", status: "Open", assigned_to: "", developer_id: "", designer_id: "", tester_id: "", deadline: "" });
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
          description: "You don't have permission to create tasks.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to create task." });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task updated successfully." });
      setShowEditDialog(false);
      setSelectedTask(null);
      setTaskForm({ project_id: "", title: "", description: "", priority: "Medium", stage: "Analysis", status: "Open", assigned_to: "", developer_id: "", designer_id: "", tester_id: "", deadline: "" });
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
          description: "You don't have permission to update tasks.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to update task." });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Success", description: "Task deleted successfully." });
      setShowDeleteDialog(false);
      setSelectedTask(null);
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
          description: "You don't have permission to delete tasks.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to delete task." });
      }
    },
  });

  // Handlers
  const handleView = (task: Task) => {
    setSelectedTask(task);
    setShowViewDialog(true);
  };

  // Handle task query parameter to open view dialog
  const taskIdParam = searchParams.get('task');
  useEffect(() => {
    if (taskIdParam && tasks.length > 0) {
      const task = tasks.find((t: Task) => t.id.toString() === taskIdParam || t.task_code === taskIdParam);
      if (task) {
        handleView(task);
        // Remove task parameter from URL
        setSearchParams((params) => {
          params.delete('task');
          return params;
        });
      }
    }
  }, [taskIdParam, tasks, setSearchParams]);

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setTaskForm({
      project_id: task.project_id?.toString() || "",
      title: task.title,
      description: task.description || "",
      priority: task.priority === 'Med' ? 'Medium' : (task.priority || 'Medium'),
      stage: task.stage || "Analysis",
      status: task.status || "Open",
      assigned_to: task.assigned_to?.toString() || "",
      developer_id: task.developer_id?.toString() || "",
      designer_id: task.designer_id?.toString() || "",
      tester_id: task.tester_id?.toString() || "",
      deadline: task.deadline ? task.deadline.split('T')[0] : "",
    });
    setShowEditDialog(true);
  };

  const handleDelete = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedTask) {
      deleteMutation.mutate(selectedTask.id);
    }
  };

  const handleCreateTask = () => {
    if (!taskForm.title || !taskForm.project_id) {
      toast({
        title: "Validation Error",
        description: "Title and Project are required",
        variant: "destructive",
      });
      return;
    }

    // Map priority: Medium -> Med (database format)
    const priorityMap: Record<string, string> = {
      'Low': 'Low',
      'Medium': 'Med',
      'High': 'High',
    };
    const dbPriority = priorityMap[taskForm.priority] || 'Med';

    createMutation.mutate({
      project_id: parseInt(taskForm.project_id),
      title: taskForm.title,
      description: taskForm.description,
      priority: dbPriority,
      stage: taskForm.stage,
      status: taskForm.status,
      assigned_to: taskForm.assigned_to ? parseInt(taskForm.assigned_to) : null,
      developer_id: taskForm.developer_id ? parseInt(taskForm.developer_id) : null,
      designer_id: taskForm.designer_id ? parseInt(taskForm.designer_id) : null,
      tester_id: taskForm.tester_id ? parseInt(taskForm.tester_id) : null,
      deadline: taskForm.deadline || null,
    });
  };

  const handleUpdateTask = () => {
    if (!taskForm.title || !selectedTask) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    // Map priority: Medium -> Med (database format)
    const priorityMap: Record<string, string> = {
      'Low': 'Low',
      'Medium': 'Med',
      'High': 'High',
    };
    const dbPriority = priorityMap[taskForm.priority] || 'Med';

    updateMutation.mutate({
      id: selectedTask.id,
      data: {
        title: taskForm.title,
        description: taskForm.description,
        priority: dbPriority,
        stage: taskForm.stage,
        status: taskForm.status,
        assigned_to: taskForm.assigned_to ? parseInt(taskForm.assigned_to) : null,
        developer_id: taskForm.developer_id ? parseInt(taskForm.developer_id) : null,
        designer_id: taskForm.designer_id ? parseInt(taskForm.designer_id) : null,
        tester_id: taskForm.tester_id ? parseInt(taskForm.tester_id) : null,
        deadline: taskForm.deadline || null,
      },
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatFullDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", { 
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPriorityLabel = (priority?: string) => {
    if (priority === 'Med') return 'Medium';
    return priority || 'Medium';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            {userRole === 'Admin' ? 'View and track all tasks' : 'Track and manage all tasks'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={viewFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewFilter('all')}
            >
              All Tasks
            </Button>
            <Button
              variant={viewFilter === 'my' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewFilter('my')}
            >
              My Tasks
            </Button>
          </div>
          {canCreateTask && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to track and manage
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-project">Project *</Label>
                  <Select
                    value={taskForm.project_id}
                    onValueChange={(value) => setTaskForm({ ...taskForm, project_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-title">Task Title *</Label>
                  <Input
                    id="task-title"
                    placeholder="Enter task title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    placeholder="Enter task description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task-priority">Priority</Label>
                    <Select
                      value={taskForm.priority}
                      onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-stage">Stage</Label>
                    <Select
                      value={taskForm.stage}
                      onValueChange={(value) => setTaskForm({ ...taskForm, stage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Analysis">Analysis</SelectItem>
                        <SelectItem value="Documentation">Documentation</SelectItem>
                        <SelectItem value="Development">Development</SelectItem>
                        <SelectItem value="Testing">Testing</SelectItem>
                        <SelectItem value="Pre-Prod">Pre-Prod</SelectItem>
                        <SelectItem value="Production">Production</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task-status">Status</Label>
                    <Select
                      value={taskForm.status}
                      onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Ready for Testing">Ready for Testing</SelectItem>
                        <SelectItem value="Testing">Testing</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-deadline">Deadline</Label>
                    <Input
                      id="task-deadline"
                      type="date"
                      value={taskForm.deadline}
                      onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="task-developer">Developer</Label>
                    <Select
                      value={taskForm.developer_id || undefined}
                      onValueChange={(value) => setTaskForm({ ...taskForm, developer_id: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select developer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {developers.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-designer">Designer</Label>
                    <Select
                      value={taskForm.designer_id || undefined}
                      onValueChange={(value) => setTaskForm({ ...taskForm, designer_id: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select designer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {designers.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-tester">Tester</Label>
                    <Select
                      value={taskForm.tester_id || undefined}
                      onValueChange={(value) => setTaskForm({ ...taskForm, tester_id: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {testers.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddDialog(false);
                      setTaskForm({ project_id: "", title: "", description: "", priority: "Medium", stage: "Analysis", status: "Open", assigned_to: "", developer_id: "", designer_id: "", tester_id: "", deadline: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateTask}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Stage Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {stages.slice(1).map((stage) => {
          const count = tasks.filter((t) => t.stage === stage).length;
          return (
            <Card
              key={stage}
              className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                activeStage === stage ? "border-primary" : ""
              }`}
              onClick={() => setActiveStage(stage)}
            >
              <CardContent className="p-4">
                <div className="text-xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground truncate">{stage}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Tabs value={activeStage} onValueChange={setActiveStage} className="w-full md:w-auto">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="All">All</TabsTrigger>
                <TabsTrigger value="Development">Dev</TabsTrigger>
                <TabsTrigger value="Testing">Testing</TabsTrigger>
                <TabsTrigger value="Production">Prod</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
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
                <TableHead>Task ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Designer</TableHead>
                <TableHead>Tester</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-center">Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-destructive">
                    Error loading tasks. Please check your database connection.
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {searchQuery || activeStage !== "All" ? 'No tasks found matching your filters.' : 'No tasks found. Create your first task to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task: Task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-primary font-medium">
                      #{task.task_code || task.id}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {task.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.developer_name || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.designer_name || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.tester_name || '-'}
                  </TableCell>
                  <TableCell>
                      <StatusBadge variant={taskPriorityMap[getPriorityLabel(task.priority)]}>
                        {getPriorityLabel(task.priority)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                      <StatusBadge variant={taskStageMap[task.stage || 'Analysis']}>
                        {task.stage || 'Analysis'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                      {task.deadline ? formatDate(task.deadline) : "Not set"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1 text-xs">
                        <MessageSquare className="h-3 w-3" />
                          0
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Paperclip className="h-3 w-3" />
                          0
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(task)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                          {canEditTask && (
                            <DropdownMenuItem onClick={() => handleEdit(task)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                          )}
                          {canDeleteTask && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(task)}
                            >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Task Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>
              View task information and details
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Task ID</Label>
                <div className="font-mono text-sm">#{selectedTask.task_code || selectedTask.id}</div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Task Title</Label>
                <div className="font-medium">{selectedTask.title}</div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Description</Label>
                <div className="text-sm">{selectedTask.description || "No description provided"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Priority</Label>
                  <StatusBadge variant={taskPriorityMap[getPriorityLabel(selectedTask.priority)]}>
                    {getPriorityLabel(selectedTask.priority)}
                  </StatusBadge>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Stage</Label>
                  <StatusBadge variant={taskStageMap[selectedTask.stage || 'Analysis']}>
                    {selectedTask.stage || 'Analysis'}
                  </StatusBadge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="text-sm">{selectedTask.status || 'Open'}</div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Deadline</Label>
                  <div className="text-sm">{formatDate(selectedTask.deadline)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Developer</Label>
                  <div className="text-sm">{selectedTask.developer_name || 'Not assigned'}</div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Designer</Label>
                  <div className="text-sm">{selectedTask.designer_name || 'Not assigned'}</div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Tester</Label>
                  <div className="text-sm">{selectedTask.tester_name || 'Not assigned'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Created By</Label>
                  <div className="text-sm">
                    {selectedTask.created_by_name || 'N/A'}
                    {selectedTask.created_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(selectedTask.created_at)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Last Updated By</Label>
                  <div className="text-sm">
                    {selectedTask.updated_by_name || selectedTask.created_by_name || 'N/A'}
                    {selectedTask.updated_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(selectedTask.updated_at)}
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
                {canEditTask && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setShowViewDialog(false);
                      handleEdit(selectedTask);
                    }}
                  >
                    Edit Task
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-task-title">Task Title *</Label>
              <Input
                id="edit-task-title"
                placeholder="Enter task title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                placeholder="Enter task description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-task-priority">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-task-stage">Stage</Label>
                <Select
                  value={taskForm.stage}
                  onValueChange={(value) => setTaskForm({ ...taskForm, stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Analysis">Analysis</SelectItem>
                    <SelectItem value="Documentation">Documentation</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Pre-Prod">Pre-Prod</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-task-status">Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Ready for Testing">Ready for Testing</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-task-deadline">Deadline</Label>
                <DatePicker
                  id="edit-task-deadline"
                  value={taskForm.deadline}
                  onChange={(date) => setTaskForm({ ...taskForm, deadline: date })}
                  placeholder="Select deadline"
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-task-developer">Developer</Label>
                <Select
                  value={taskForm.developer_id || undefined}
                  onValueChange={(value) => setTaskForm({ ...taskForm, developer_id: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select developer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {developers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-task-designer">Designer</Label>
                <Select
                  value={taskForm.designer_id || undefined}
                  onValueChange={(value) => setTaskForm({ ...taskForm, designer_id: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {designers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-task-tester">Tester</Label>
                <Select
                  value={taskForm.tester_id || undefined}
                  onValueChange={(value) => setTaskForm({ ...taskForm, tester_id: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {testers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedTask(null);
                  setTaskForm({ project_id: "", title: "", description: "", priority: "Medium", stage: "Analysis", status: "Open", assigned_to: "", developer_id: "", designer_id: "", tester_id: "", deadline: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateTask}
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
              This action cannot be undone. This will permanently delete the task{" "}
              <span className="font-semibold">{selectedTask?.title}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTask(null)}>
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
