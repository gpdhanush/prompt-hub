import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useKanbanStore } from "../store/kanbanStore";
import { subscribeToKanbanBoard } from "@/lib/socket";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Plus, MoreVertical, Calendar, User, AlertCircle, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { kanbanApi } from "../api";
import { projectsApi } from "@/features/projects/api";
import { usersApi } from "@/features/users/api";
import { toast } from "@/hooks/use-toast";
import { ColumnHeader } from "../components/ColumnHeader";
import { TaskDetailDialog } from "../components/TaskDetailDialog";
// Date formatting utility
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
};

export default function KanbanBoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState({
    project_id: "",
    title: "",
    description: "",
    column_id: "",
    priority: "Med",
    assigned_to: "",
    due_date: "",
    estimated_time: "",
  });

  const boardId = id ? parseInt(id, 10) : null;

  // Zustand store
  const {
    boards,
    setBoard,
    updateTask,
    moveTask: moveTaskInStore,
    addTask,
    removeTask,
    updateColumn,
    removeColumn,
    reorderColumns,
    setCurrentBoard,
    clearBoard,
  } = useKanbanStore();

  // Get board from store or fetch
  const storeBoard = boardId ? boards[boardId] : null;

  // Fetch board with columns and tasks
  const { data: boardData, isLoading, error } = useQuery({
    queryKey: ['kanban-board', boardId],
    queryFn: () => kanbanApi.getBoard(boardId!),
    enabled: !!boardId && !storeBoard,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false, // Disable auto-refetch, use Socket.IO instead
  });

  // Sync fetched data to store
  useEffect(() => {
    if (boardData?.data && boardId) {
      setBoard(boardData.data);
      setCurrentBoard(boardId);
    }
  }, [boardData, boardId, setBoard, setCurrentBoard]);

  // Use board from store or fetched data
  const board = storeBoard || boardData?.data;
  const columns = board?.columns || [];
  const [activeTask, setActiveTask] = useState<any>(null);
  const [activeColumn, setActiveColumn] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  // Fetch projects for task creation
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const projects = projectsData?.data || [];
  const users = usersData?.data || [];

  // Auto-populate project TL and default status when project is selected
  useEffect(() => {
    if (taskForm.project_id && taskForm.project_id !== "none") {
      const selectedProject = projects.find((p: any) => p.id.toString() === taskForm.project_id);
      if (selectedProject) {
        // Auto-populate team lead if available
        if (selectedProject.team_lead_id && !taskForm.assigned_to) {
          setTaskForm(prev => ({ ...prev, assigned_to: selectedProject.team_lead_id.toString() }));
        }
        // Set default status to "New" if not set
        if (!taskForm.column_id && columns.length > 0) {
          const newColumn = columns.find((col: any) => col.status === 'New' || col.name.toLowerCase().includes('new') || col.name.toLowerCase().includes('to do'));
          if (newColumn) {
            setTaskForm(prev => ({ ...prev, column_id: newColumn.id.toString() }));
          } else if (columns.length > 0) {
            // Fallback to first column
            setTaskForm(prev => ({ ...prev, column_id: columns[0].id.toString() }));
          }
        }
      }
    }
  }, [taskForm.project_id, projects, columns]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!boardId) return;

    const cleanup = subscribeToKanbanBoard(boardId, {
      onTaskCreated: (data) => {
        if (data.task && data.boardId === boardId) {
          addTask(boardId, data.task.column_id, data.task);
          queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
          toast({
            title: "New Task",
            description: `Task ${data.task.task_code || data.task.title} created.`,
          });
        }
      },
      onTaskMoved: (data) => {
        if (data.boardId === boardId && data.taskId) {
          // Task was moved - update store
          const task = data.task;
          if (task) {
            moveTaskInStore(boardId, data.taskId, task.column_id, task.position);
            queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
          }
        }
      },
      onTaskUpdated: (data) => {
        if (data.boardId === boardId && data.taskId) {
          // Task was updated (e.g., via GitHub)
          const task = data.task;
          if (task) {
            updateTask(boardId, data.taskId, task);
            queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
            
            // Show notification if updated via GitHub
            if (data.source === 'github') {
              toast({
                title: "Task Updated",
                description: `Task ${data.taskCode || data.taskId} moved to ${data.newStatus} via GitHub commit.`,
              });
            }
          }
        }
      },
      onTaskDeleted: (data) => {
        if (data.boardId === boardId && data.taskId) {
          removeTask(boardId, data.taskId);
          queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
        }
      },
      onListUpdated: (data) => {
        if (data.boardId === boardId) {
          if (data.action === 'update' && data.column) {
            updateColumn(boardId, data.columnId!, data.column);
          } else if (data.action === 'delete' && data.columnId) {
            removeColumn(boardId, data.columnId);
          } else if (data.action === 'reorder' && data.columns) {
            reorderColumns(boardId, data.columns);
          }
          queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
          toast({
            title: "List Updated",
            description: `Column ${data.action === 'delete' ? 'deleted' : data.action === 'update' ? 'updated' : 'reordered'}.`,
          });
        }
      },
      onBulkUpdate: (data) => {
        if (data.boardId === boardId) {
          queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
        }
      },
    });

    return cleanup;
  }, [boardId, addTask, updateTask, moveTaskInStore, removeTask, updateColumn, removeColumn, reorderColumns, queryClient]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Move task mutation
  const moveTaskMutation = useMutation({
    mutationFn: (data: {
      taskId: number;
      column_id: number;
      position: number;
      old_column_id?: number;
      old_position?: number;
    }) => kanbanApi.moveTask(data.taskId, {
      column_id: data.column_id,
      position: data.position,
      old_column_id: data.old_column_id,
      old_position: data.old_position,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-boards'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move task.",
        variant: "destructive",
      });
    },
  });

  // Reorder columns mutation
  const reorderColumnsMutation = useMutation({
    mutationFn: (columnIds: number[]) => kanbanApi.reorderColumns(boardId!, columnIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reorder columns.",
        variant: "destructive",
      });
    },
  });

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    // Check if it's a column
    const column = columns.find((col: any) => col.id.toString() === activeId);
    if (column) {
      setActiveColumn(column);
      return;
    }
    
    // Otherwise it's a task
    for (const col of columns) {
      const task = col.tasks?.find((t: any) => t.id.toString() === activeId);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  }, [columns]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dragging a column
    const activeColumnId = columns.find((col: any) => col.id.toString() === activeId);
    if (activeColumnId) {
      // Handle column reordering
      const overColumnId = columns.find((col: any) => col.id.toString() === overId);
      if (!overColumnId || activeId === overId) return;

      const currentOrder = columns.map((col: any) => col.id);
      const activeIndex = currentOrder.indexOf(parseInt(activeId, 10));
      const overIndex = currentOrder.indexOf(parseInt(overId, 10));

      const newOrder = [...currentOrder];
      newOrder.splice(activeIndex, 1);
      newOrder.splice(overIndex, 0, parseInt(activeId, 10));

      // Optimistically update store
      reorderColumns(boardId!, newOrder);

      // Update via API
      reorderColumnsMutation.mutate(newOrder);
      return;
    }

    // Handle task movement
    const taskId = parseInt(activeId, 10);

    // Find the task and its current column
    let currentColumn: any = null;
    let currentTask: any = null;
    let currentPosition = 0;

    for (const column of columns) {
      const task = column.tasks?.find((t: any) => t.id === taskId);
      if (task) {
        currentColumn = column;
        currentTask = task;
        currentPosition = task.position || 0;
        break;
      }
    }

    if (!currentTask || !currentColumn) return;

    // Determine target column
    let newColumnId: number;
    
    // Check if dropped directly on a column
    const targetColumn = columns.find((col: any) => col.id.toString() === overId);
    if (targetColumn) {
      newColumnId = targetColumn.id;
    } else {
      // Dropped on another task - find that task's column
      let targetTaskColumn: any = null;
      for (const column of columns) {
        const task = column.tasks?.find((t: any) => t.id.toString() === overId);
        if (task) {
          targetTaskColumn = column;
          break;
        }
      }
      if (!targetTaskColumn) return;
      newColumnId = targetTaskColumn.id;
    }

    // If dropped in the same column, don't do anything
    if (currentColumn.id === newColumnId) return;

    // Calculate new position (at the end of the target column)
    const targetColumnObj = columns.find((col: any) => col.id === newColumnId);
    if (!targetColumnObj) return;
    
    const targetTasks = targetColumnObj.tasks || [];
    const newPosition = targetTasks.length > 0 
      ? Math.max(...targetTasks.map((t: any) => t.position || 0)) + 1 
      : 1;

    // Optimistically update store
    moveTaskInStore(boardId!, taskId, newColumnId, newPosition);

    // Move the task via API
    moveTaskMutation.mutate({
      taskId,
      column_id: newColumnId,
      position: newPosition,
      old_column_id: currentColumn.id,
      old_position: currentPosition,
    });
  }, [columns, moveTaskMutation, boardId, moveTaskInStore]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      column_id: number;
      priority?: string;
      assigned_to?: number;
      due_date?: string;
      project_id?: number;
    }) => kanbanApi.createTask(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-boards'] });
      setShowCreateTaskDialog(false);
      setTaskForm({
        project_id: "",
        title: "",
        description: "",
        column_id: "",
        priority: "Med",
        assigned_to: "",
        due_date: "",
        estimated_time: "",
      });
      toast({
        title: "Success",
        description: "Task created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = useCallback(() => {
    if (!taskForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required.",
        variant: "destructive",
      });
      return;
    }

    if (!taskForm.project_id || taskForm.project_id === "none") {
      toast({
        title: "Validation Error",
        description: "Please select a project.",
        variant: "destructive",
      });
      return;
    }

    if (!taskForm.column_id) {
      toast({
        title: "Validation Error",
        description: "Please select a column.",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate({
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || undefined,
      column_id: parseInt(taskForm.column_id),
      priority: taskForm.priority || undefined,
      assigned_to: taskForm.assigned_to ? parseInt(taskForm.assigned_to) : undefined,
      due_date: taskForm.due_date || undefined,
      project_id: taskForm.project_id ? parseInt(taskForm.project_id) : undefined,
      estimated_time: taskForm.estimated_time ? parseFloat(taskForm.estimated_time) : undefined,
    }, {
      onSuccess: (data) => {
        // Task will be added via Socket.IO event, but we can also add it optimistically
        if (data.data && boardId) {
          addTask(boardId, parseInt(taskForm.column_id), data.data);
        }
      },
    });
  }, [taskForm, createTaskMutation, boardId, addTask]);

  const getPriorityColor = (priority: string) => {
    // Normalize priority value (handle both "Med" and "Medium")
    const normalizedPriority = priority === "Medium" ? "Med" : priority;
    switch (normalizedPriority) {
      case "Critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "High":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "Med":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityDisplay = (priority: string) => {
    // Display "Med" for "Medium" to keep UI consistent
    return priority === "Medium" ? "Med" : (priority || "Med");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading board...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-semibold mb-2">Board not found</p>
              <p className="text-muted-foreground mb-4">
                The board you're looking for doesn't exist or has been deleted.
              </p>
              <Button onClick={() => navigate('/kanban')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Boards
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/kanban')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{board.name}</h1>
            {board.description && (
              <p className="text-muted-foreground mt-1">{board.description}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowCreateTaskDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Columns */}
      {columns.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No columns found. Please add columns to this board.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={columns.map((col: any) => col.id.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {columns.map((column: any) => {
                const columnTasks = column.tasks || [];
                const taskIds = columnTasks.map((t: any) => t.id.toString());
                
                return (
                  <SortableContext
                    key={column.id}
                    id={column.id.toString()}
                    items={taskIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn
                      column={column}
                      tasks={columnTasks}
                      getPriorityColor={getPriorityColor}
                      getPriorityDisplay={getPriorityDisplay}
                      formatDate={formatDate}
                      onTaskClick={(task) => {
                        setSelectedTask(task);
                        setShowTaskDialog(true);
                      }}
                    />
                  </SortableContext>
                );
              })}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeColumn ? (
              <Card className="opacity-90 rotate-2 shadow-lg w-64">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{activeColumn.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {(activeColumn.tasks || []).length}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            ) : activeTask ? (
              <Card className="opacity-90 rotate-2 shadow-lg">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium line-clamp-2">{activeTask.title}</p>
                      <Badge className={getPriorityColor(activeTask.priority || "Med")}>
                        {getPriorityDisplay(activeTask.priority || "Med")}
                      </Badge>
                    </div>
                    {activeTask.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {activeTask.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to this Kanban board.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-project">Project *</Label>
              <Select
                value={taskForm.project_id}
                onValueChange={(value) => setTaskForm({ ...taskForm, project_id: value, assigned_to: "", column_id: "" })}
              >
                <SelectTrigger id="task-project">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-title">Title *</Label>
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
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task-column">Column *</Label>
                <Select
                  value={taskForm.column_id}
                  onValueChange={(value) => setTaskForm({ ...taskForm, column_id: value })}
                  disabled={!taskForm.project_id || taskForm.project_id === "none"}
                >
                  <SelectTrigger id="task-column">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column: any) => (
                      <SelectItem key={column.id} value={String(column.id)}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateTaskDialog(false);
                setTaskForm({
                  project_id: "",
                  title: "",
                  description: "",
                  column_id: "",
                  priority: "Med",
                  assigned_to: "",
                  due_date: "",
                  estimated_time: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending || !taskForm.title.trim() || !taskForm.project_id || taskForm.project_id === "none" || !taskForm.column_id}
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail/Edit Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          boardId={boardId!}
          columns={columns}
          users={users}
          open={showTaskDialog}
          onOpenChange={(open) => {
            setShowTaskDialog(open);
            if (!open) {
              setSelectedTask(null);
            }
          }}
          onTaskUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['kanban-board', boardId] });
          }}
        />
      )}
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({
  column,
  tasks,
  getPriorityColor,
  getPriorityDisplay,
  formatDate,
  onTaskClick,
}: {
  column: any;
  tasks: any[];
  getPriorityColor: (priority: string) => string;
  getPriorityDisplay: (priority: string) => string;
  formatDate: (date: string | null | undefined) => string;
  onTaskClick?: (task: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id.toString(),
    data: {
      type: "column",
      column,
    },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id.toString(),
    data: {
      type: "column",
      column,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Combine refs
  const setRefs = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  return (
    <Card
      ref={setRefs}
      style={style}
      className={`flex flex-col ${isOver ? "ring-2 ring-primary" : ""} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <CardHeader 
        className="pb-3 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <ColumnHeader
          column={column}
          taskCount={tasks.length}
          onUpdate={() => {
            // Column updated - will be handled by Socket.IO
          }}
        />
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[600px]">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tasks
          </div>
        ) : (
          tasks.map((task: any) => (
            <DraggableTask
              key={task.id}
              task={task}
              getPriorityColor={getPriorityColor}
              getPriorityDisplay={getPriorityDisplay}
              formatDate={formatDate}
              onTaskClick={onTaskClick}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Draggable Task Component
function DraggableTask({
  task,
  getPriorityColor,
  getPriorityDisplay,
  formatDate,
  onTaskClick,
}: {
  task: any;
  getPriorityColor: (priority: string) => string;
  getPriorityDisplay: (priority: string) => string;
  formatDate: (date: string | null | undefined) => string;
  onTaskClick?: (task: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id.toString(),
    data: {
      type: "task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={(e) => {
        // Don't open dialog if clicking on drag handle
        if ((e.target as HTMLElement).closest('.cursor-grab')) {
          return;
        }
        onTaskClick?.(task);
      }}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium line-clamp-2 flex-1">{task.title}</p>
            </div>
            <Badge className={getPriorityColor(task.priority || "Med")}>
              {getPriorityDisplay(task.priority || "Med")}
            </Badge>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.assigned_to_name && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{task.assigned_to_name}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

