import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { tasksApi } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { TaskForm } from "@/components/task/TaskForm";
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

export default function TaskEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canEditTask = hasPermission('tasks.edit');

  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: "",
    priority: "Med",
    stage: "Analysis",
    status: "Open",
    assigned_to: "",
    developer_id: "",
    designer_id: "",
    tester_id: "",
    deadline: "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [showDeleteAttachmentDialog, setShowDeleteAttachmentDialog] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<number | null>(null);

  // Fetch task data
  const { data: taskData, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getById(Number(id)),
    enabled: !!id,
  });

  const task = taskData?.data;

  // Load task data into form
  useEffect(() => {
    if (task) {
      setFormData({
        project_id: task.project_id?.toString() || "",
        title: task.title || "",
        description: task.description || "",
        priority: task.priority === 'Med' ? 'Med' : (task.priority || 'Med'),
        stage: task.stage || "Analysis",
        status: task.status || "Open",
        assigned_to: task.assigned_to?.toString() || "",
        developer_id: task.developer_id?.toString() || "",
        designer_id: task.designer_id?.toString() || "",
        tester_id: task.tester_id?.toString() || "",
        deadline: task.deadline ? task.deadline.split('T')[0] : "",
      });
      
      // Load existing attachments if available
      if (task.attachments) {
        setExistingAttachments(task.attachments);
      }
    }
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => tasksApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast({
        title: "Success",
        description: "Task updated successfully.",
      });
      navigate(`/tasks/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task.",
        variant: "destructive",
      });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: (files: File[]) => tasksApi.uploadAttachments(Number(id), files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast({
        title: "Success",
        description: "Files uploaded successfully.",
      });
      setAttachments([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload files.",
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => tasksApi.deleteAttachment(Number(id), attachmentId),
    onSuccess: (_, attachmentId) => {
      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast({
        title: "Success",
        description: "Attachment deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attachment.",
        variant: "destructive",
      });
    },
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.project_id || formData.project_id === "none") {
      toast({
        title: "Validation Error",
        description: "Project is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.priority) {
      toast({
        title: "Validation Error",
        description: "Priority is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.status) {
      toast({
        title: "Validation Error",
        description: "Status is required.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      stage: formData.stage,
      status: formData.status,
      project_id: parseInt(formData.project_id),
    };

    if (formData.assigned_to && formData.assigned_to !== "none") {
      updateData.assigned_to = parseInt(formData.assigned_to);
    } else {
      updateData.assigned_to = null;
    }

    if (formData.developer_id && formData.developer_id !== "none") {
      updateData.developer_id = parseInt(formData.developer_id);
    } else {
      updateData.developer_id = null;
    }

    if (formData.designer_id && formData.designer_id !== "none") {
      updateData.designer_id = parseInt(formData.designer_id);
    } else {
      updateData.designer_id = null;
    }

    if (formData.tester_id && formData.tester_id !== "none") {
      updateData.tester_id = parseInt(formData.tester_id);
    } else {
      updateData.tester_id = null;
    }

    if (formData.deadline) {
      updateData.deadline = formData.deadline;
    } else {
      updateData.deadline = null;
    }

    updateMutation.mutate(updateData);
    
    // Upload new attachments if any
    if (attachments.length > 0) {
      uploadFilesMutation.mutate(attachments);
    }
  };

  if (!canEditTask) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">You don't have permission to edit tasks.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Loading task...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Task not found or error loading task.</p>
              <Button onClick={() => navigate('/tasks')} className="mt-4">
                Back to Tasks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/tasks/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Task</h1>
            <p className="text-muted-foreground">Update task information</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <TaskForm
          formData={formData}
          onChange={setFormData}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          existingAttachments={existingAttachments}
          onDeleteAttachment={(attachmentId) => {
            setAttachmentToDelete(attachmentId);
            setShowDeleteAttachmentDialog(true);
          }}
          isEdit={true}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(`/tasks/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending || uploadFilesMutation.isPending}>
            {updateMutation.isPending || uploadFilesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Delete Attachment Confirmation Dialog */}
      <AlertDialog open={showDeleteAttachmentDialog} onOpenChange={setShowDeleteAttachmentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteAttachmentDialog(false);
              setAttachmentToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (attachmentToDelete) {
                  deleteAttachmentMutation.mutate(attachmentToDelete);
                  setShowDeleteAttachmentDialog(false);
                  setAttachmentToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAttachmentMutation.isPending}
            >
              {deleteAttachmentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
