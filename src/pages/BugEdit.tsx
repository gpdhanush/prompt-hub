import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { bugsApi } from "@/lib/api";
import { BugForm } from "@/components/bug/BugForm";
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

interface BugFormData {
  title: string;
  description: string;
  project_id: string;
  task_id: string;
  bug_type: string;
  priority: string;
  status: string;
  resolution_type: string;
  assigned_to: string;
  team_lead_id: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  browser: string;
  device: string;
  os: string;
  app_version: string;
  api_endpoint: string;
  target_fix_date: string;
  actual_fix_date: string;
  tags: string;
}

export default function BugEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<BugFormData>({
    title: "",
    description: "",
    project_id: "",
    task_id: "",
    bug_type: "Functional",
    priority: "P4",
    status: "Open",
    resolution_type: "",
    assigned_to: "",
    team_lead_id: "",
    steps_to_reproduce: "",
    expected_behavior: "",
    actual_behavior: "",
    browser: "",
    device: "",
    os: "",
    app_version: "",
    api_endpoint: "",
    target_fix_date: "",
    actual_fix_date: "",
    tags: "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [showDeleteAttachmentDialog, setShowDeleteAttachmentDialog] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<number | null>(null);

  // Fetch bug data
  const { data: bugData, isLoading, error } = useQuery({
    queryKey: ['bug', id],
    queryFn: () => bugsApi.getById(Number(id)),
    enabled: !!id,
  });

  const bug = bugData?.data;

  // Load bug data into form
  useEffect(() => {
    if (bug) {
      setFormData({
        title: bug.title || "",
        description: bug.description || "",
        project_id: bug.project_id?.toString() || "",
        task_id: bug.task_id?.toString() || "",
        bug_type: bug.bug_type || "Functional",
        priority: bug.priority || "P4",
        status: bug.status || "Open",
        resolution_type: bug.resolution_type || "",
        assigned_to: bug.assigned_to?.toString() || "",
        team_lead_id: bug.team_lead_id?.toString() || "",
        steps_to_reproduce: bug.steps_to_reproduce || "",
        expected_behavior: bug.expected_behavior || "",
        actual_behavior: bug.actual_behavior || "",
        browser: bug.browser || "",
        device: bug.device || "",
        os: bug.os || "",
        app_version: bug.app_version || "",
        api_endpoint: bug.api_endpoint || "",
        target_fix_date: bug.target_fix_date ? bug.target_fix_date.split('T')[0] : "",
        actual_fix_date: bug.actual_fix_date ? bug.actual_fix_date.split('T')[0] : "",
        tags: bug.tags || "",
      });
      
      // Load existing attachments
      if (bug.attachments && Array.isArray(bug.attachments)) {
        setExistingAttachments(bug.attachments);
      }
    }
  }, [bug]);

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => bugsApi.deleteAttachment(Number(id), attachmentId),
    onSuccess: (_, attachmentId) => {
      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
      queryClient.invalidateQueries({ queryKey: ['bug', id] });
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

  const updateMutation = useMutation({
    mutationFn: (data: any) => bugsApi.update(Number(id), data),
    onSuccess: async () => {
      // Upload attachments if any
      if (attachments.length > 0) {
        try {
          await bugsApi.uploadAttachments(Number(id), attachments);
        } catch (error: any) {
          toast({
            title: "Warning",
            description: "Bug updated but some attachments failed to upload: " + (error.message || "Unknown error"),
            variant: "destructive",
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      queryClient.invalidateQueries({ queryKey: ['bug', id] });
      toast({
        title: "Success",
        description: "Bug updated successfully.",
      });
      navigate(`/bugs/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bug.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Custom validation
    const errors: string[] = [];
    if (!formData.title || !formData.title.trim()) {
      errors.push("Bug Title is required");
    }
    if (!formData.description || !formData.description.trim()) {
      errors.push("Bug Description is required");
    }
    
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      title: formData.title,
      description: formData.description,
      bug_type: formData.bug_type,
      priority: formData.priority,
      status: formData.status,
      steps_to_reproduce: formData.steps_to_reproduce || '',
      expected_behavior: formData.expected_behavior || '',
      actual_behavior: formData.actual_behavior || '',
      browser: formData.browser || '',
      device: formData.device || '',
      os: formData.os || '',
      app_version: formData.app_version || '',
      api_endpoint: formData.api_endpoint || '',
      tags: formData.tags || '',
    };

    if (formData.project_id && formData.project_id !== "none") {
      updateData.project_id = parseInt(formData.project_id);
    } else {
      updateData.project_id = null;
    }

    if (formData.task_id && formData.task_id !== "none") {
      updateData.task_id = parseInt(formData.task_id);
    } else {
      updateData.task_id = null;
    }

    if (formData.resolution_type && formData.resolution_type !== "none") {
      updateData.resolution_type = formData.resolution_type;
    } else {
      updateData.resolution_type = null;
    }

    if (formData.assigned_to && formData.assigned_to !== "unassigned") {
      updateData.assigned_to = parseInt(formData.assigned_to);
    } else {
      updateData.assigned_to = null;
    }

    if (formData.team_lead_id && formData.team_lead_id !== "none") {
      updateData.team_lead_id = parseInt(formData.team_lead_id);
    } else {
      updateData.team_lead_id = null;
    }

    if (formData.target_fix_date) {
      updateData.target_fix_date = formData.target_fix_date;
    } else {
      updateData.target_fix_date = null;
    }

    if (formData.actual_fix_date) {
      updateData.actual_fix_date = formData.actual_fix_date;
    } else {
      updateData.actual_fix_date = null;
    }

    updateMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive">Error loading bug details.</div>
          <Button onClick={() => navigate('/bugs')} variant="outline">
            Back to Bugs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 space-y-6 ">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/bugs/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Bug</h1>
            <p className="text-muted-foreground">Bug ID: {bug.bug_code || `BG-${bug.id}`}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <BugForm
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
          <Button type="button" variant="outline" onClick={() => navigate(`/bugs/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Bug
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Delete Attachment Confirmation Dialog */}
      <AlertDialog open={showDeleteAttachmentDialog} onOpenChange={setShowDeleteAttachmentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
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
