import { memo } from "react";
import ConfirmationDialog from "@/shared/components/ConfirmationDialog";
import type { Project } from "../utils/utils";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export const DeleteProjectDialog = memo(function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
  isDeleting,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Are you sure?"
      description={`This action cannot be undone. This will permanently delete the project ${project?.name || ''} and remove all associated data.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="destructive"
      isLoading={isDeleting}
      onConfirm={onConfirm}
    />
  );
});
