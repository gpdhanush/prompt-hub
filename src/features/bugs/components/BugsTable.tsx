import { memo, useCallback } from "react";
import { MoreHorizontal, Edit, Trash2, Eye, AlertCircle, Loader2 } from "lucide-react";
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
import { StatusBadge, bugStatusMap } from "@/components/ui/status-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaginationControls from "@/shared/components/PaginationControls";
import type { Bug } from "../utils/utils";
import { BUG_PAGE_LIMITS } from "../utils/constants";

interface BugsTableProps {
  bugs: Bug[];
  isLoading: boolean;
  error: any;
  searchQuery: string;
  statusFilter: string;
  page: number;
  limit: number;
  pagination: { total: number; totalPages: number };
  onPageChange: (page: number) => void;
  canEditBug: boolean;
  canDeleteBug: boolean;
  onView: (bug: Bug) => void;
  onEdit: (bug: Bug) => void;
  onDelete: (bug: Bug) => void;
  onTaskClick: (taskId: number) => void;
}

export const BugsTable = memo(function BugsTable({
  bugs,
  isLoading,
  error,
  searchQuery,
  statusFilter,
  page,
  limit,
  pagination,
  onPageChange,
  canEditBug,
  canDeleteBug,
  onView,
  onEdit,
  onDelete,
  onTaskClick,
}: BugsTableProps) {
  const handleRowClick = useCallback((bug: Bug) => {
    onView(bug);
  }, [onView]);

  const handleViewClick = useCallback((e: React.MouseEvent, bug: Bug) => {
    e.stopPropagation();
    onView(bug);
  }, [onView]);

  const handleEditClick = useCallback((e: React.MouseEvent, bug: Bug) => {
    e.stopPropagation();
    onEdit(bug);
  }, [onEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, bug: Bug) => {
    e.stopPropagation();
    onDelete(bug);
  }, [onDelete]);

  const handleTaskClick = useCallback((e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    onTaskClick(taskId);
  }, [onTaskClick]);

  const getSeverityVariant = useCallback((severity?: string) => {
    if (severity === 'Critical') return 'error';
    if (severity === 'High') return 'warning';
    if (severity === 'Medium') return 'info';
    return 'neutral';
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading bugs...</p>
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
            <p className="text-destructive font-semibold mb-2">Error loading bugs</p>
            <p className="text-sm text-muted-foreground">Please check your database connection.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bugs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No bugs found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "All"
                ? 'Try adjusting your filters'
                : 'No bugs available'}
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
            <CardTitle>Bugs ({bugs.length})</CardTitle>
            <CardDescription>List of all bugs</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Bug ID</TableHead>
                <TableHead>Task ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bugs.map((bug) => (
                <TableRow 
                  key={bug.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleRowClick(bug)}
                >
                  <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                    <span className="font-mono text-sm">{bug.bug_code || `BG-${bug.id}`}</span>
                  </TableCell>
                  <TableCell>
                    {bug.task_id ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto font-mono text-sm text-primary hover:underline"
                        onClick={(e) => handleTaskClick(e, bug.task_id!)}
                      >
                        #{bug.task_id}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{bug.title || (bug.description ? bug.description.charAt(0).toUpperCase() + bug.description.slice(1) : '-')}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={getSeverityVariant(bug.severity)}>
                      {bug.severity || 'Low'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={bugStatusMap[bug.status || 'Open'] || 'default'}>
                      {bug.status || 'Open'}
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
                        <DropdownMenuItem onClick={(e) => handleViewClick(e, bug)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {canEditBug && (
                          <DropdownMenuItem onClick={(e) => handleEditClick(e, bug)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDeleteBug && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => handleDeleteClick(e, bug)}
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
        {bugs.length > 0 && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} bugs
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
                    {BUG_PAGE_LIMITS.map((limitValue) => (
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

