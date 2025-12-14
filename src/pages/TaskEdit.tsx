import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, X, Save, CheckSquare, FileText, Users, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast";
import { tasksApi, projectsApi, usersApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";

export default function TaskEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canEditTask = hasPermission('tasks.edit');

  const currentUser = getCurrentUser();

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

  // Fetch projects and users
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  const projects = projectsData?.data || [];
  const allUsers = usersData?.data || [];

  const developers = allUsers.filter((user: any) => user.role === 'Developer');
  const designers = allUsers.filter((user: any) => user.role === 'Designer');
  const testers = allUsers.filter((user: any) => user.role === 'Tester');
  const assignableUsers = allUsers
    .filter((user: any) => 
      ['Developer', 'Designer', 'Tester', 'Team Lead'].includes(user.role)
    )
    .sort((a: any, b: any) => {
      const roleOrder: { [key: string]: number } = {
        'Team Lead': 1,
        'Developer': 2,
        'Designer': 3,
        'Tester': 4,
      };
      return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
    });

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
    onSuccess: () => {
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

  const handleInputChange = (field: string, value: string) => {
    const normalizedValue = (value === "none" || value === "__none__") ? "" : value;
    setFormData((prev) => ({ ...prev, [field]: normalizedValue }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(formData);
    
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
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      {/* Header */}
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
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CheckSquare className="h-8 w-8 text-primary" />
              Edit Task
            </h1>
            <p className="text-muted-foreground mt-1">Update task information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/tasks/${id}`)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Task Details
              </CardTitle>
              <CardDescription>Update the basic information for this task</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the task in detail"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={6}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project">Project</Label>
                  <Select
                    value={formData.project_id || undefined}
                    onValueChange={(value) => handleInputChange('project_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <DatePicker
                    value={formData.deadline}
                    onChange={(date) => handleInputChange('deadline', date || '')}
                    placeholder="Select deadline"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Med">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value) => handleInputChange('stage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Analysis">Analysis</SelectItem>
                      <SelectItem value="Documentation">Documentation</SelectItem>
                      <SelectItem value="Development">Development</SelectItem>
                      <SelectItem value="Testing">Testing</SelectItem>
                      <SelectItem value="Pre-Prod">Pre-Prod</SelectItem>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Ready for Testing">Ready for Testing</SelectItem>
                      <SelectItem value="Testing">Testing</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Not a Bug">Not a Bug</SelectItem>
                      <SelectItem value="Production Bug">Production Bug</SelectItem>
                      <SelectItem value="TBD">TBD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Assignment
              </CardTitle>
              <CardDescription>Update team member assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Select
                    value={formData.assigned_to || undefined}
                    onValueChange={(value) => handleInputChange('assigned_to', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {assignableUsers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="developer">Developer</Label>
                  <Select
                    value={formData.developer_id || undefined}
                    onValueChange={(value) => handleInputChange('developer_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select developer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {developers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="designer">Designer</Label>
                  <Select
                    value={formData.designer_id || undefined}
                    onValueChange={(value) => handleInputChange('designer_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select designer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {designers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tester">Tester</Label>
                  <Select
                    value={formData.tester_id || undefined}
                    onValueChange={(value) => handleInputChange('tester_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {testers.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Attachments
              </CardTitle>
              <CardDescription>Manage files related to this task (max 10MB per file)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Attachments */}
              {existingAttachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Existing Files</Label>
                  {existingAttachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.original_filename}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(attachment.path, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this file?')) {
                              deleteAttachmentMutation.mutate(attachment.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New Attachments */}
              <div className="grid gap-2">
                <Label htmlFor="attachments">Add New Files</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Label htmlFor="attachments" asChild>
                    <Button variant="outline" type="button">
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Files
                    </Button>
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    Images, PDF, Word, Excel, PowerPoint, Text files
                  </span>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
