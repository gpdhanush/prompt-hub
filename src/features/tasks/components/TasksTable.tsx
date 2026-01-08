import { memo, useCallback } from "react";
import { MoreHorizontal, Edit, Trash2, Eye, CheckSquare, Loader2, AlertCircle } from "lucide-react";
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
import { StatusBadge, taskStageMap } from "@/components/ui/status-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaginationControls from "@/shared/components/PaginationControls";
import type { Task } from "../utils/utils";
import { formatDate } from "../utils/utils";
import { TASK_PAGE_LIMITS } from "../utils/constants";

interface TasksTableProps {
  tasks: Task[];
  isLoading: boolean;
  error: any;
  searchQuery: string;
  statusFilter: string;
  page: number;
  limit: number;
  pagination: { total: number; totalPages: number };
  onPageChange: (page: number) => void;
  canEditTask: boolean;
  canDeleteTask: boolean;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const TasksTable = memo(function TasksTable({
  tasks,
  isLoading,
  error,
  searchQuery,
  statusFilter,
  page,
  limit,
  pagination,
  onPageChange,
  canEditTask,
  canDeleteTask,
  onView,
  onEdit,
  onDelete,
}: TasksTableProps) {
  const handleRowClick = useCallback((task: Task) => {
    onView(task);
  }, [onView]);

  const handleViewClick = useCallback((e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onView(task);
  }, [onView]);

  const handleEditClick = useCallback((e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onEdit(task);
  }, [onEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    onDelete(task);
  }, [onDelete]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tasks...</p>
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
            <p className="text-destructive font-semibold mb-2">Error loading tasks</p>
            <p className="text-sm text-muted-foreground">Please check your database connection.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CheckSquare className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "All"
                ? 'Try adjusting your filters'
                : 'No tasks available'}
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
            <CardTitle>Tasks ({tasks.length})</CardTitle>
            <CardDescription>List of all tasks</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50 border-b-2 border-border border-primary">
              <TableRow>
                <TableHead className="w-[120px]">Task ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow 
                  key={task.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleRowClick(task)}
                >
                  <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                    <span className="font-mono text-sm">{task.task_code || `TASK-${task.id}`}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{task.title}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {task.project_name || 'No Project'}
                    </span>
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
                        <DropdownMenuItem onClick={(e) => handleViewClick(e, task)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {canEditTask && (
                          <DropdownMenuItem onClick={(e) => handleEditClick(e, task)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDeleteTask && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => handleDeleteClick(e, task)}
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

        {/* Pagination */}
        {tasks.length > 0 && pagination.totalPages > 1 && (
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
                  onValueChange={() => {
                    onPageChange(1);
                  }}
                >
                  <SelectTrigger className="w-20" id="page-limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PAGE_LIMITS.map((limitValue) => (
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

