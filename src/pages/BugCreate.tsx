import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { bugsApi } from "@/lib/api";
import { BugForm } from "@/components/bug/BugForm";

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

export default function BugCreate() {
  const navigate = useNavigate();
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

  const createMutation = useMutation({
    mutationFn: (formDataToSend: FormData) => bugsApi.create(formDataToSend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      toast({
        title: "Success",
        description: "Bug created successfully.",
      });
      navigate('/bugs');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bug.",
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

    const formDataToSend = new FormData();
    
    // Basic Information
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    if (formData.project_id && formData.project_id !== "none") {
      formDataToSend.append('project_id', formData.project_id);
    }
    if (formData.task_id && formData.task_id !== "none") {
      formDataToSend.append('task_id', formData.task_id);
    }
    
    // Bug Type & Classification
    formDataToSend.append('bug_type', formData.bug_type);
    formDataToSend.append('priority', formData.priority);
    formDataToSend.append('status', formData.status);
    if (formData.resolution_type && formData.resolution_type !== "none") {
      formDataToSend.append('resolution_type', formData.resolution_type);
    }
    
    // Assignment
    if (formData.assigned_to && formData.assigned_to !== "unassigned") {
      formDataToSend.append('assigned_to', formData.assigned_to);
    }
    if (formData.team_lead_id && formData.team_lead_id !== "none") {
      formDataToSend.append('team_lead_id', formData.team_lead_id);
    }
    
    // Steps & Reproduction - always send these fields
    formDataToSend.append('steps_to_reproduce', formData.steps_to_reproduce || '');
    formDataToSend.append('expected_behavior', formData.expected_behavior || '');
    formDataToSend.append('actual_behavior', formData.actual_behavior || '');
    
    // Environment Details
    if (formData.browser) {
      formDataToSend.append('browser', formData.browser);
    }
    if (formData.device && formData.device !== "none") {
      formDataToSend.append('device', formData.device);
    }
    if (formData.os) {
      formDataToSend.append('os', formData.os);
    }
    if (formData.app_version) {
      formDataToSend.append('app_version', formData.app_version);
    }
    if (formData.api_endpoint) {
      formDataToSend.append('api_endpoint', formData.api_endpoint);
    }
    
    // Timeline
    if (formData.target_fix_date) {
      formDataToSend.append('target_fix_date', formData.target_fix_date);
    }
    
    // Additional Fields
    if (formData.tags) {
      formDataToSend.append('tags', formData.tags);
    }
    
    // Attachments
    attachments.forEach((file) => {
      formDataToSend.append('attachments', file);
    });

    createMutation.mutate(formDataToSend);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/bugs')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Bug</h1>
            <p className="text-muted-foreground">Report a new bug</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <BugForm
          formData={formData}
          onChange={setFormData}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          isEdit={false}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/bugs')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Bug
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
