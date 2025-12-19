import { useState, useEffect } from "react";
import { Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { kanbanApi } from "../api";
import { TaskStatusDropdown } from "./TaskStatusDropdown";
import { TimeTracking } from "./TimeTracking";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";

interface TaskDetailDialogProps {
  task: any;
  boardId: number;
  columns: any[];
  users: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailDialog({
  task,
  boardId,
  columns,
  users,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "",
    priority: "Med",
    assigned_to: "",
    due_date: "",
    estimated_time: "",
  });

  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const { hasPermission } = usePermissions();
  const canEditTask = hasPermission('tasks.edit');
  const canDeleteTask = hasPermission('tasks.delete');

  // Load task data into form
  useEffect(() => {
    if (task) {
      setTaskForm({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "New",
        priority: task.priority === 'Med' ? 'Med' : (task.priority || 'Med'),
        assigned_to: task.assigned_to?.toString() || "",
        due_date: task.due_date ? task.due_date.split('T')[0] : "",
        estimated_time: task.estimated_time?.toString() || "",
      });
    }
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => kanbanApi.updateTask(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
      setIsEditing(false);
      onTaskUpdated?.();
      toast({
        title: "Success",
        description: "Task updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => kanbanApi.deleteTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
      setShowDeleteDialog(false);
      onOpenChange(false);
      onTaskUpdated?.();
      toast({
        title: "Success",
        description: "Task deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      title: taskForm.title.trim(),
      description: taskForm.description || undefined,
      status: taskForm.status,
      priority: taskForm.priority,
      assigned_to: taskForm.assigned_to ? parseInt(taskForm.assigned_to) : undefined,
      due_date: taskForm.due_date || undefined,
      estimated_time: taskForm.estimated_time ? parseFloat(taskForm.estimated_time) : undefined,
    });
  };

  const getPriorityColor = (priority: string) => {
    const map: Record<string, string> = {
      Low: "bg-blue-100 text-blue-800",
      Med: "bg-yellow-100 text-yellow-800",
      Medium: "bg-yellow-100 text-yellow-800",
      High: "bg-orange-100 text-orange-800",
      Critical: "bg-red-100 text-red-800",
    };
    return map[priority] || "bg-gray-100 text-gray-800";
  };

  const getPriorityDisplay = (priority: string) => {
    const map: Record<string, string> = {
      Low: "Low",
      Med: "Medium",
      Medium: "Medium",
      High: "High",
      Critical: "Critical",
    };
    return map[priority] || priority;
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">{task.task_code || `Task #${task.id}`}</DialogTitle>
                <DialogDescription>
                  {isEditing ? "Edit task details" : "View task details"}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {!isEditing && canEditTask && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {!isEditing && canDeleteTask && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form
                        if (task) {
                          setTaskForm({
                            title: task.title || "",
                            description: task.description || "",
                            status: task.status || "New",
                            priority: task.priority === 'Med' ? 'Med' : (task.priority || 'Med'),
                            assigned_to: task.assigned_to?.toString() || "",
                            due_date: task.due_date ? task.due_date.split('T')[0] : "",
                            estimated_time: task.estimated_time?.toString() || "",
                          });
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {isEditing ? (
              // Edit Mode
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-title">Title *</Label>
                  <Input
                    id="task-title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Enter task description"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task-status">Status</Label>
                    <TaskStatusDropdown
                      currentStatus={taskForm.status}
                      onStatusChange={(value) => setTaskForm({ ...taskForm, status: value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-priority">Priority</Label>
                    <Select
                      value={taskForm.priority}
                      onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                    >
                      <SelectTrigger id="task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Med">Med</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task-assigned">Assigned To</Label>
                    <Select
                      value={taskForm.assigned_to}
                      onValueChange={(value) => setTaskForm({ ...taskForm, assigned_to: value })}
                    >
                      <SelectTrigger id="task-assigned">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="task-due-date">Due Date</Label>
                    <Input
                      id="task-due-date"
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-estimated-time">Estimated Time (hours)</Label>
                  <Input
                    id="task-estimated-time"
                    type="number"
                    step="0.5"
                    min="0"
                    value={taskForm.estimated_time}
                    onChange={(e) => setTaskForm({ ...taskForm, estimated_time: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            ) : (
              // View Mode
              <div className="grid gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Title</Label>
                  <p className="text-lg font-semibold mt-1">{task.title}</p>
                </div>
                {task.description && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant="outline">{task.status || "New"}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Priority</Label>
                    <div className="mt-1">
                      <Badge className={getPriorityColor(task.priority || "Med")}>
                        {getPriorityDisplay(task.priority || "Med")}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Assigned To</Label>
                    <p className="text-sm mt-1">{task.assigned_to_name || "Unassigned"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Due Date</Label>
                    <p className="text-sm mt-1">{task.due_date ? new Date(task.due_date).toLocaleDateString() : "Not set"}</p>
                  </div>
                </div>
                {task.estimated_time !== null && task.estimated_time !== undefined && (
                  <TimeTracking
                    taskId={task.id}
                    boardId={boardId}
                    estimatedTime={task.estimated_time || 0}
                    actualTime={task.actual_time || 0}
                    timerStartedAt={task.timer_started_at}
                  />
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

