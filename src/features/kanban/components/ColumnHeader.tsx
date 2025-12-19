import { useState } from "react";
import { Edit, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { kanbanApi } from "../api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

interface ColumnHeaderProps {
  column: any;
  taskCount: number;
  onUpdate: () => void;
}

export function ColumnHeader({ column, taskCount, onUpdate }: ColumnHeaderProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [columnName, setColumnName] = useState(column.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const canEditColumn = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Team Leader' || userRole === 'Team Lead';

  const handleEdit = async () => {
    if (!columnName.trim()) {
      toast({
        title: "Validation Error",
        description: "Column name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      await kanbanApi.updateColumn(column.id, { name: columnName.trim() });
      toast({
        title: "Success",
        description: "Column updated successfully.",
      });
      setShowEditDialog(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update column.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await kanbanApi.deleteColumn(column.id);
      toast({
        title: "Success",
        description: "Column deleted successfully.",
      });
      setShowDeleteDialog(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete column.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canEditColumn) {
    return (
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{column.name}</h3>
        <span className="text-sm text-muted-foreground">{taskCount}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{column.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{taskCount}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setColumnName(column.name);
                setShowEditDialog(true);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
            <DialogDescription>
              Update the column name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="column-name">Column Name</Label>
              <Input
                id="column-name"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                placeholder="Enter column name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating || !columnName.trim()}>
              {isUpdating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{column.name}"? This action cannot be undone.
              {taskCount > 0 && (
                <span className="block mt-2 text-destructive">
                  This column has {taskCount} task(s). Please move or delete them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || taskCount > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

