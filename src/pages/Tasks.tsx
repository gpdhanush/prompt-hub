import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, MessageSquare, Paperclip, CheckSquare, CheckCircle, User, Clock, CalendarDays, FileText, AlertCircle, Target, Users, Calendar, History, Timer, Send, Reply, ArrowRight, CheckSquare as CheckSquareIcon, Loader2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { tasksApi, projectsApi, usersApi } from "@/lib/api";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const [timesheetForm, setTimesheetForm] = useState({ date: '', hours: '', notes: '' });
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
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const currentUserId = currentUser?.id;
  
  // Use permission-based checks instead of hardcoded roles
  const { hasPermission } = usePermissions();
  const canCreateTask = hasPermission('tasks.create');
  const canEditTask = hasPermission('tasks.edit');
  const canDeleteTask = hasPermission('tasks.delete');

  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch tasks from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', searchQuery, statusFilter, viewFilter, page],
    queryFn: () => tasksApi.getAll({ page, limit, my_tasks: viewFilter === 'my' ? currentUserId : undefined }),
  });

  const tasks = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 0 };

  // Fetch projects for dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
  });

  // Fetch users for assignment dropdown (Employee, Team Lead, and Tester roles)
  // Use getAssignable() which is accessible to all authenticated users
  const { data: usersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getAssignable(),
  });

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
    const matchesStatus = statusFilter === "All" || task.stage === statusFilter;
    return matchesSearch && matchesStatus;
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
    navigate(`/tasks/${task.id}`);
  };

  // Handle task query parameter to navigate to view page
  const taskIdParam = searchParams.get('task');
  useEffect(() => {
    if (taskIdParam && tasks.length > 0) {
      const task = tasks.find((t: Task) => t.id.toString() === taskIdParam || t.task_code === taskIdParam);
      if (task) {
        navigate(`/tasks/${task.id}`);
        // Remove task parameter from URL
        setSearchParams((params) => {
          params.delete('task');
          return params;
        });
      }
    }
  }, [taskIdParam, tasks, setSearchParams, navigate]);

  const handleEdit = (task: Task) => {
    navigate(`/tasks/${task.id}/edit`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckSquareIcon className="h-6 w-6 text-primary" />
            </div>
            Tasks
          </h1>
          <p className="text-muted-foreground mt-2">
            {userRole === 'Admin' ? 'View and track all tasks' : 'Track and manage all tasks'}
          </p>
        </div>
        {canCreateTask && (
          <Button onClick={() => navigate('/tasks/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by task title, task code, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select 
              value={statusFilter || "All"} 
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Stages</SelectItem>
                {stages.slice(1).map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                variant={viewFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewFilter('all');
                  setPage(1);
                }}
              >
                All Tasks
              </Button>
              <Button
                variant={viewFilter === 'my' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewFilter('my');
                  setPage(1);
                }}
              >
                My Tasks
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tasks ({filteredTasks.length})</CardTitle>
              <CardDescription>List of all tasks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-semibold mb-2">Error loading tasks</p>
              <p className="text-sm text-muted-foreground">Please check your database connection.</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquareIcon className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "All"
                  ? 'Try adjusting your filters'
                  : 'No tasks available'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Task ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task: Task) => (
                    <TableRow 
                      key={task.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleView(task)}
                    >
                      <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono text-sm">{task.task_code || `TASK-${task.id}`}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{task.title}</span>
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
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {task.deadline ? formatDate(task.deadline) : "Not set"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(task)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredTasks.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} tasks
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="page-limit" className="text-sm text-muted-foreground">
                    Rows per page:
                  </Label>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20" id="page-limit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove old dialogs - we're using separate pages now */}
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

// Export components for TaskView to use - these are defined below

// Task Comments Section Component
export function TaskCommentsSection({ taskId }: { taskId: number }) {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => tasksApi.getComments(taskId),
  });

  const comments = commentsData?.data || [];

  // Organize comments into tree structure
  const commentMap = new Map();
  const rootComments: any[] = [];

  comments.forEach((comment: any) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach((comment: any) => {
    const commentNode = commentMap.get(comment.id);
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(commentNode);
      }
    } else {
      rootComments.push(commentNode);
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: (data: { comment: string; parent_comment_id?: number }) =>
      tasksApi.createComment(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      setCommentText('');
      setReplyingTo(null);
      toast({ title: "Success", description: "Comment added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add comment.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate({
      comment: commentText,
      parent_comment_id: replyingTo || undefined,
    });
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <div className="space-y-2">
        <Label>Add Comment</Label>
        <Textarea
          placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between">
          {replyingTo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplyingTo(null);
                setCommentText('');
              }}
            >
              Cancel Reply
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!commentText.trim() || createCommentMutation.isPending}
            size="sm"
          >
            <Send className="mr-2 h-4 w-4" />
            {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Clock className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : rootComments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rootComments.map((comment: any) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{comment.user_name || 'Unknown'}</p>
                    {comment.user_role && (
                      <Badge variant="outline" className="text-xs">
                        {comment.user_role}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => setReplyingTo(comment.id)}
                  >
                    <Reply className="mr-1 h-3 w-3" />
                    Reply
                  </Button>
                </div>
              </div>
              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-11 space-y-2 border-l-2 border-muted pl-4">
                  {comment.replies.map((reply: any) => (
                    <div key={reply.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium">{reply.user_name || 'Unknown'}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">{reply.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Task History Section Component
export function TaskHistorySection({ taskId }: { taskId: number }) {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['task-history', taskId],
    queryFn: () => tasksApi.getHistory(taskId),
  });

  const history = historyData?.data || [];

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Clock className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No history recorded yet.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical Stepper Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border"></div>
          
          <div className="space-y-0">
            {history.map((entry: any, index: number) => (
              <div key={entry.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                {/* Stepper Circle */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
                  <History className="h-5 w-5 text-primary" />
                </div>
                
                {/* Content Card */}
                <div className="flex-1 min-w-0 rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{entry.changed_by_name || 'Unknown'}</p>
                        <Badge variant="outline" className="text-xs">
                          {formatTimeAgo(entry.timestamp)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {entry.from_status || 'N/A'}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="default" className="text-xs">
                          {entry.to_status || 'N/A'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                  {entry.note && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">{entry.note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Task Timesheets Section Component
export function TaskTimesheetsSection({ taskId }: { taskId: number }) {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const [showAddTimesheet, setShowAddTimesheet] = useState(false);
  const [timesheetForm, setTimesheetForm] = useState({ date: '', hours: '', notes: '' });
  const [editingTimesheet, setEditingTimesheet] = useState<number | null>(null);

  const { data: timesheetsData, isLoading } = useQuery({
    queryKey: ['task-timesheets', taskId],
    queryFn: () => tasksApi.getTimesheets(taskId),
  });

  const timesheets = timesheetsData?.data || [];

  const createTimesheetMutation = useMutation({
    mutationFn: (data: { date: string; hours: number; notes?: string }) =>
      tasksApi.createTimesheet(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-timesheets', taskId] });
      setTimesheetForm({ date: '', hours: '', notes: '' });
      setShowAddTimesheet(false);
      toast({ title: "Success", description: "Timesheet entry added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add timesheet.", variant: "destructive" });
    },
  });

  const updateTimesheetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { date?: string; hours?: number; notes?: string } }) =>
      tasksApi.updateTimesheet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-timesheets', taskId] });
      setEditingTimesheet(null);
      setTimesheetForm({ date: '', hours: '', notes: '' });
      toast({ title: "Success", description: "Timesheet updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update timesheet.", variant: "destructive" });
    },
  });

  const [showDeleteTimesheetDialog, setShowDeleteTimesheetDialog] = useState(false);
  const [timesheetToDelete, setTimesheetToDelete] = useState<number | null>(null);

  const deleteTimesheetMutation = useMutation({
    mutationFn: (id: number) => tasksApi.deleteTimesheet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-timesheets', taskId] });
      toast({ title: "Success", description: "Timesheet deleted successfully." });
      setShowDeleteTimesheetDialog(false);
      setTimesheetToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete timesheet.", variant: "destructive" });
    },
  });

  const handleSubmitTimesheet = () => {
    if (!timesheetForm.date || !timesheetForm.hours) {
      toast({ title: "Error", description: "Date and hours are required.", variant: "destructive" });
      return;
    }

    if (editingTimesheet) {
      updateTimesheetMutation.mutate({
        id: editingTimesheet,
        data: {
          date: timesheetForm.date,
          hours: parseFloat(timesheetForm.hours),
          notes: timesheetForm.notes || undefined,
        },
      });
    } else {
      createTimesheetMutation.mutate({
        date: timesheetForm.date,
        hours: parseFloat(timesheetForm.hours),
        notes: timesheetForm.notes || undefined,
      });
    }
  };

  const totalHours = timesheets.reduce((sum: number, ts: any) => sum + parseFloat(ts.hours || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/40 transition-all">
          <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Hours</p>
                <p className="text-3xl font-bold text-primary">{totalHours.toFixed(2)}</p>
          </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Timer className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10 hover:border-blue-500/40 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
          <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Entries</p>
                <p className="text-3xl font-bold text-blue-600">{timesheets.length}</p>
          </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
        </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Timesheet Button */}
      <Button
        onClick={() => {
          setShowAddTimesheet(true);
          setEditingTimesheet(null);
          setTimesheetForm({ date: '', hours: '', notes: '' });
        }}
        size="sm"
        variant="outline"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Timesheet Entry
      </Button>

      {/* Add/Edit Timesheet Dialog */}
      <Dialog open={showAddTimesheet || editingTimesheet !== null} onOpenChange={(open) => {
        if (!open) {
          setShowAddTimesheet(false);
          setEditingTimesheet(null);
          setTimesheetForm({ date: '', hours: '', notes: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTimesheet ? 'Update Timesheet' : 'Add Timesheet Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <DatePicker
                value={timesheetForm.date}
                onChange={(date) => setTimesheetForm({ ...timesheetForm, date })}
                placeholder="Select date"
              />
            </div>
            <div className="space-y-2">
              <Label>Hours *</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                max="24"
                placeholder="e.g., 8.5"
                value={timesheetForm.hours}
                onChange={(e) => setTimesheetForm({ ...timesheetForm, hours: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="What did you work on?"
                value={timesheetForm.notes}
                onChange={(e) => setTimesheetForm({ ...timesheetForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddTimesheet(false);
                  setEditingTimesheet(null);
                  setTimesheetForm({ date: '', hours: '', notes: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitTimesheet}
                disabled={!timesheetForm.date || !timesheetForm.hours || createTimesheetMutation.isPending || updateTimesheetMutation.isPending}
              >
                {createTimesheetMutation.isPending || updateTimesheetMutation.isPending 
                  ? (editingTimesheet ? 'Updating...' : 'Saving...') 
                  : (editingTimesheet ? 'Update Timesheet' : 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timesheets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Clock className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : timesheets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No timesheet entries yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timesheets.map((timesheet: any) => (
            <Card 
              key={timesheet.id} 
              className="border-2 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/30 group-hover:border-primary/50 transition-all">
                    <Timer className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base font-semibold">{timesheet.employee_name || 'Unknown'}</p>
                          <Badge variant="outline" className="text-xs">
                            {timesheet.hours} {timesheet.hours === 1 ? 'hour' : 'hours'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{new Date(timesheet.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}</span>
                        </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                        setEditingTimesheet(timesheet.id);
                        // Convert date from ISO string to YYYY-MM-DD format
                        const dateValue = timesheet.date ? (timesheet.date.includes('T') ? timesheet.date.split('T')[0] : timesheet.date) : '';
                        setTimesheetForm({
                          date: dateValue,
                          hours: timesheet.hours.toString(),
                          notes: timesheet.notes || '',
                        });
                      }}
                    >
                          <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTimesheetToDelete(timesheet.id);
                            setShowDeleteTimesheetDialog(true);
                          }}
                    >
                          <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {timesheet.notes && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-muted">
                        <p className="text-sm text-foreground">{timesheet.notes}</p>
                      </div>
                )}
                {timesheet.approved_by_name && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
                          <CheckCircle className="mr-1 h-3 w-3" />
                    Approved by {timesheet.approved_by_name}
                        </Badge>
                      </div>
                )}
              </div>
            </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Timesheet Confirmation Dialog */}
      <AlertDialog open={showDeleteTimesheetDialog} onOpenChange={setShowDeleteTimesheetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timesheet Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this timesheet entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteTimesheetDialog(false);
              setTimesheetToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (timesheetToDelete) {
                  deleteTimesheetMutation.mutate(timesheetToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTimesheetMutation.isPending}
            >
              {deleteTimesheetMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
