import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bugsApi } from "@/features/bugs/api";
import { tasksApi } from "@/features/tasks/api";
import { usersApi } from "@/features/users/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { logger } from "@/lib/logger";
import { BugsHeader } from "../components/BugsHeader";
import { BugsFilters } from "../components/BugsFilters";
import { BugsTable } from "../components/BugsTable";
import { DeleteBugDialog } from "../components/DeleteBugDialog";
import { filterBugs } from "../utils/utils";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";
import type { Bug } from "../utils/utils";

export default function Bugs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [page, setPage] = useState(1);
  const limit = DEFAULT_PAGE_LIMIT;
  
  // Get current user info for role-based permissions
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const currentUserId = currentUser?.id;
  
  // Use permission-based checks instead of hardcoded roles
  const { hasPermission } = usePermissions();
  const canCreateBug = hasPermission('bugs.create');
  const canEditBug = hasPermission('bugs.edit');
  const canDeleteBug = hasPermission('bugs.delete');
  const canUpdateStatus = hasPermission('bugs.edit');

  // Fetch bugs from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['bugs', searchQuery, statusFilter, viewFilter, page],
    queryFn: () => bugsApi.getAll({ page, limit, my_bugs: viewFilter === 'my' ? currentUserId : undefined }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch tasks for dropdown (if needed in future)
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch assignable users for assignment dropdown
  const { data: assignableUsersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getAssignable(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const bugs = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 0 };

  // Fetch bug by ID if edit parameter is in URL
  const editBugId = searchParams.get('edit');
  const { data: editBugData } = useQuery({
    queryKey: ['bug', editBugId],
    queryFn: () => bugsApi.getById(Number(editBugId)),
    enabled: !!editBugId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Filter bugs based on search query and status filter (client-side)
  const filteredBugs = useMemo(
    () => filterBugs(bugs, searchQuery, statusFilter),
    [bugs, searchQuery, statusFilter]
  );

  // Delete bug mutation
  const deleteBugMutation = useMutation({
    mutationFn: bugsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      toast({ title: "Success", description: "Bug deleted successfully." });
      setShowDeleteDialog(false);
      setSelectedBug(null);
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
          description: "You don't have permission to delete bugs.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to delete bug." });
      }
    },
  });

  // Handlers with useCallback
  const handleView = useCallback((bug: Bug) => {
    navigate(`/bugs/${bug.id}`);
  }, [navigate]);

  const handleEdit = useCallback((bug: Bug) => {
    navigate(`/bugs/${bug.id}/edit`);
  }, [navigate]);

  const handleDelete = useCallback((bug: Bug) => {
    setSelectedBug(bug);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedBug) {
      deleteBugMutation.mutate(selectedBug.id);
    }
  }, [selectedBug, deleteBugMutation]);

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

  const handleTaskClick = useCallback((taskId: number) => {
    navigate(`/tasks?task=${taskId}`);
  }, [navigate]);

  // Handle edit parameter from URL
  useEffect(() => {
    if (editBugId && editBugData?.data) {
      const bug = editBugData.data;
      handleEdit(bug);
      // Remove edit parameter from URL
      setSearchParams((params) => {
        params.delete('edit');
        return params;
      });
    }
  }, [editBugId, editBugData, handleEdit, setSearchParams]);

  return (
    <div className="space-y-6">
      <BugsHeader canCreateBug={canCreateBug} userRole={userRole} />

      <BugsFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        viewFilter={viewFilter}
        onViewFilterChange={handleViewFilterChange}
      />

      <BugsTable
        bugs={filteredBugs}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        page={page}
        limit={limit}
        pagination={pagination}
        onPageChange={handlePageChange}
        canEditBug={canEditBug}
        canDeleteBug={canDeleteBug}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTaskClick={handleTaskClick}
      />

      <DeleteBugDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        bug={selectedBug}
        isDeleting={deleteBugMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
