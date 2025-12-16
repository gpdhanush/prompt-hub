import { memo } from "react";
import ConfirmationDialog from "@/shared/components/ConfirmationDialog";
import type { Employee } from "../utils/utils";

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteEmployeeDialog = memo(function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employee,
  isDeleting,
  onConfirm,
}: DeleteEmployeeDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Are you sure?"
      description={`This will permanently delete employee ${employee?.name || ''}. This action cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="destructive"
      isLoading={isDeleting}
      onConfirm={onConfirm}
    />
  );
});

