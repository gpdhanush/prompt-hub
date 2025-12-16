import { memo } from "react";
import ConfirmationDialog from "@/shared/components/ConfirmationDialog";
import type { Task } from "../utils/utils";

interface DeleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteTaskDialog = memo(function DeleteTaskDialog({
  open,
  onOpenChange,
  task,
  isDeleting,
  onConfirm,
}: DeleteTaskDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Are you sure?"
      description={`This action cannot be undone. This will permanently delete the task ${task?.title || ''} and remove all associated data.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="destructive"
      isLoading={isDeleting}
      onConfirm={onConfirm}
    />
  );
});

