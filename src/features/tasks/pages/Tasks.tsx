import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/features/tasks/api";
import { projectsApi } from "@/features/projects/api";
import { usersApi } from "@/features/users/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { TasksHeader } from "../components/TasksHeader";
import { TasksFilters } from "../components/TasksFilters";
import { TasksTable } from "../components/TasksTable";
import { DeleteTaskDialog } from "../components/DeleteTaskDialog";
import { filterTasks } from "../utils/utils";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";
import type { Task } from "../utils/utils";

export default function Tasks() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const limit = DEFAULT_PAGE_LIMIT;
  
  // Get current user info for role-based permissions
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const currentUserId = currentUser?.id;
  
  // Use permission-based checks instead of hardcoded roles
  const { hasPermission } = usePermissions();
  const canCreateTask = hasPermission('tasks.create');
  const canEditTask = hasPermission('tasks.edit');
  const canDeleteTask = hasPermission('tasks.delete');

  // Fetch tasks from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', searchQuery, statusFilter, viewFilter, page],
    queryFn: () => tasksApi.getAll({ page, limit, my_tasks: viewFilter === 'my' ? currentUserId : undefined }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const tasks = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 0 };

  // Fetch projects for dropdown (if needed in future)
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch users for assignment dropdown
  const { data: usersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getAssignable(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Filter tasks based on search query and status filter (client-side)
  const filteredTasks = useMemo(
    () => filterTasks(tasks, searchQuery, statusFilter),
    [tasks, searchQuery, statusFilter]
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: async () => {
      // Invalidate and refetch to immediately show changes
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.refetchQueries({ queryKey: ['tasks'] });
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

  // Handlers with useCallback
  const handleView = useCallback((task: Task) => {
    // Use client route if user is CLIENT
    const basePath = userRole === 'CLIENT' || userRole === 'Client' ? '/client/tasks' : '/tasks';
    // Use UUID if available, otherwise use numeric ID
    const taskIdentifier = task.uuid || task.id;
    navigate(`${basePath}/${taskIdentifier}`);
  }, [navigate, userRole]);

  const handleEdit = useCallback((task: Task) => {
    // CLIENT users can't edit, but keep route for other users
    const basePath = userRole === 'CLIENT' || userRole === 'Client' ? '/client/tasks' : '/tasks';
    // Use UUID if available, otherwise use numeric ID
    const taskIdentifier = task.uuid || task.id;
    navigate(`${basePath}/${taskIdentifier}/edit`);
  }, [navigate, userRole]);

  const handleDelete = useCallback((task: Task) => {
    setSelectedTask(task);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedTask) {
      deleteMutation.mutate(selectedTask.id);
    }
  }, [selectedTask, deleteMutation]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
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

  // Handle task query parameter to navigate to view page
  const taskIdParam = searchParams.get('task');
  useEffect(() => {
    if (taskIdParam && tasks.length > 0) {
      const task = tasks.find((t: Task) => t.id.toString() === taskIdParam || t.task_code === taskIdParam);
      if (task) {
        const basePath = userRole === 'CLIENT' || userRole === 'Client' ? '/client/tasks' : '/tasks';
        navigate(`${basePath}/${task.id}`);
        // Remove task parameter from URL
        setSearchParams((params) => {
          params.delete('task');
          return params;
        });
      }
    }
  }, [taskIdParam, tasks, setSearchParams, navigate, userRole]);

  return (
    <div className="space-y-6">
      <TasksHeader canCreateTask={canCreateTask} userRole={userRole} />

      <TasksFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        viewFilter={viewFilter}
        onViewFilterChange={handleViewFilterChange}
      />

      <TasksTable
        tasks={filteredTasks}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        page={page}
        limit={limit}
        pagination={pagination}
        onPageChange={handlePageChange}
        canEditTask={canEditTask}
        canDeleteTask={canDeleteTask}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DeleteTaskDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        task={selectedTask}
        isDeleting={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
