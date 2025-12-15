import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { tasksApi } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { TaskForm } from "@/components/task/TaskForm";

export default function TaskCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canCreateTask = hasPermission('tasks.create');

  const [formData, setFormData] = useState({
    project_id: "none",
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

  const createMutation = useMutation({
    mutationFn: (formDataToSend: FormData) => tasksApi.createWithFiles(formDataToSend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Success",
        description: "Task created successfully.",
      });
      navigate('/tasks');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task.",
        variant: "destructive",
      });
    },
  });


  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
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

    const formDataToSend = new FormData();
    
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('priority', formData.priority);
    formDataToSend.append('stage', formData.stage);
    formDataToSend.append('status', formData.status);
    formDataToSend.append('project_id', formData.project_id);
    
    // Only append optional fields if they have values
    if (formData.assigned_to && formData.assigned_to !== "none" && formData.assigned_to.trim() !== "") {
      formDataToSend.append('assigned_to', formData.assigned_to);
    }
    if (formData.developer_id && formData.developer_id !== "none" && formData.developer_id.trim() !== "") {
      formDataToSend.append('developer_id', formData.developer_id);
    }
    if (formData.designer_id && formData.designer_id !== "none" && formData.designer_id.trim() !== "") {
      formDataToSend.append('designer_id', formData.designer_id);
    }
    if (formData.tester_id && formData.tester_id !== "none" && formData.tester_id.trim() !== "") {
      formDataToSend.append('tester_id', formData.tester_id);
    }
    if (formData.deadline && formData.deadline.trim() !== "") {
      formDataToSend.append('deadline', formData.deadline);
    }
    
    // Attachments
    attachments.forEach((file) => {
      formDataToSend.append('attachments', file);
    });

    createMutation.mutate(formDataToSend);
  };

  if (!canCreateTask) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">You don't have permission to create tasks.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/tasks')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Task</h1>
            <p className="text-muted-foreground">Add a new task to track work</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <TaskForm
          formData={formData}
          onChange={setFormData}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          isEdit={false}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/tasks')}>
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
                Create Task
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
