import { memo } from "react";
import ConfirmationDialog from "@/shared/components/ConfirmationDialog";
import type { Bug } from "../utils/utils";

interface DeleteBugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bug: Bug | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteBugDialog = memo(function DeleteBugDialog({
  open,
  onOpenChange,
  bug,
  isDeleting,
  onConfirm,
}: DeleteBugDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Are you sure?"
      description={`This action cannot be undone. This will permanently delete the bug ${bug?.bug_code || bug?.id || ''} and remove all associated data.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="destructive"
      isLoading={isDeleting}
      onConfirm={onConfirm}
    />
  );
});

