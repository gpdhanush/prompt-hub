import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureInput } from "@/components/ui/secure-input";
import { Label } from "@/components/ui/label";
import { SecureTextarea } from "@/components/ui/secure-textarea";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast";
import { projectsApi } from "@/features/projects/api";
import { employeesApi } from "@/features/employees/api";
import { usersApi } from "@/features/users/api";
import { getCurrentUser } from "@/lib/auth";
import { TaskStatusDropdown } from "@/features/kanban/components/TaskStatusDropdown";

interface TaskFormData {
  project_id: string;
  title: string;
  description: string;
  priority: string;
  stage: string;
  status: string;
  assigned_to: string;
  developer_id: string;
  designer_id: string;
  tester_id: string;
  deadline: string;
}

interface TaskFormProps {
  formData: TaskFormData;
  onChange: (data: TaskFormData) => void;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  existingAttachments?: any[];
  onDeleteAttachment?: (attachmentId: number) => void;
  isEdit?: boolean;
}

export function TaskForm({ 
  formData, 
  onChange, 
  attachments, 
  onAttachmentsChange,
  existingAttachments = [],
  onDeleteAttachment,
  isEdit = false 
}: TaskFormProps) {
  const currentUser = getCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { securityAlertProps } = useSecurityValidation();

  // Fetch projects and users
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch assignable users using the dedicated endpoint (accessible to all users)
  // This includes Team Lead, Developer, Designer, Tester
  const { data: assignableUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getAssignable(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch all employees to get team hierarchy
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projects = projectsData?.data || [];
  const allUsers = assignableUsersData?.data || [];
  const allEmployees = employeesData?.data || [];

  // Filter team leaders only for "Assigned To" field
  const teamLeads = useMemo(() => 
    allUsers.filter((user: any) => 
      user.role === 'Team Lead' || user.role === 'Team Leader'
    ),
    [allUsers]
  );

  // Filter users based on selected team leader for Developer, Designer, Tester
  const developers = useMemo(() => {
    // Always show all users with role Developer (do not restrict by team lead)
    return allUsers.filter((user: any) => user.role === 'Developer');
  }, [allUsers, allEmployees, formData.assigned_to]);
  
  const designers = useMemo(() => {
    // Always show all users with role Designer (do not restrict by team lead)
    return allUsers.filter((user: any) => user.role === 'Designer');
  }, [allUsers, allEmployees, formData.assigned_to]);
  
  const testers = useMemo(() => {
    // Always show all users with role Tester (do not restrict by team lead)
    return allUsers.filter((user: any) => user.role === 'Tester');
  }, [allUsers, allEmployees, formData.assigned_to]);

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    // Normalize: convert "none" to empty string, but keep empty strings as-is for required fields
    // For optional fields (project_id, assigned_to, developer_id, designer_id, tester_id, deadline), 
    // convert empty string to "none" for display consistency
    const optionalFields = ['project_id', 'assigned_to', 'developer_id', 'designer_id', 'tester_id'];
    let normalizedValue: string;
    
    if (value === "none" || value === "__none__") {
      normalizedValue = "";
    } else if (optionalFields.includes(field) && value === "") {
      // Keep empty string for optional fields - will be handled in submit
      normalizedValue = "";
    } else {
      normalizedValue = value;
    }
    
    onChange({ ...formData, [field]: normalizedValue });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      // Check file size
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} - File too large (max 10MB)`);
        return;
      }
      
      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid Files",
        description: invalidFiles.join(', '),
        variant: "destructive",
      });
    }

    onAttachmentsChange([...attachments, ...validFiles]);
    
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="mx-auto space-y-6">
      {/* Basic Task Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Task Information</CardTitle>
          <CardDescription>Essential details about the task</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-red-500">Task Title *</Label>
              <SecureInput
                id="title"
                fieldName="Task Title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project_id" className="text-red-500">Project *</Label>
              <Select
                value={formData.project_id || "none"}
                onValueChange={(value) => handleInputChange("project_id", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
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
                onChange={(date) => handleInputChange("deadline", date || "")}
                placeholder="Select deadline"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-red-500">Task Description *</Label>
            <MarkdownEditor
              value={formData.description}
              onChange={(value) => handleInputChange("description", value)}
              placeholder="Describe the task in detail. You can use markdown formatting: headings, lists, code blocks, and images."
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Task Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Task Classification</CardTitle>
          <CardDescription>Priority, stage, and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority" className="text-red-500">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange("priority", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
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
                onValueChange={(value) => handleInputChange("stage", value)}
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
              <Label htmlFor="status" className="text-red-500">Status *</Label>
              <TaskStatusDropdown
                currentStatus={formData.status || "New"}
                onStatusChange={(value) => handleInputChange("status", value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
          <CardDescription>Assign team members to this task</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assigned_to">Assigned To (Team Lead)</Label>
              <Select
                value={formData.assigned_to || "none"}
                onValueChange={(value) => handleInputChange("assigned_to", value)}
                disabled={isLoadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select team lead"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {isLoadingUsers ? (
                    <SelectItem value="__loading__" disabled>Loading team leads...</SelectItem>
                  ) : teamLeads.length > 0 ? (
                    teamLeads.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_users__" disabled>No team leads available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="developer_id">Developer</Label>
              <Select
                value={formData.developer_id || "none"}
                onValueChange={(value) => handleInputChange("developer_id", value)}
                disabled={isLoadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select developer"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {isLoadingUsers ? (
                    <SelectItem value="__loading__" disabled>Loading developers...</SelectItem>
                  ) : developers.length > 0 ? (
                    developers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_developers__" disabled>No developers available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="designer_id">Designer</Label>
              <Select
                value={formData.designer_id || "none"}
                onValueChange={(value) => handleInputChange("designer_id", value)}
                disabled={isLoadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select designer"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {isLoadingUsers ? (
                    <SelectItem value="__loading__" disabled>Loading designers...</SelectItem>
                  ) : designers.length > 0 ? (
                    designers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_designers__" disabled>No designers available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tester_id">Tester</Label>
              <Select
                value={formData.tester_id || "none"}
                onValueChange={(value) => handleInputChange("tester_id", value)}
                disabled={isLoadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select tester"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {isLoadingUsers ? (
                    <SelectItem value="__loading__" disabled>Loading testers...</SelectItem>
                  ) : testers.length > 0 ? (
                    testers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_testers__" disabled>No testers available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Fields</CardTitle>
          <CardDescription>Screenshots / Attachments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Attachments (for edit mode) */}
          {isEdit && existingAttachments.length > 0 && (
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
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {onDeleteAttachment && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteAttachment(attachment.id);
                        }}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Attachments */}
          <div className="grid gap-2">
            <Label htmlFor="attachments">Screenshots / Attachments</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="attachments"
                type="file"
                multiple
                onChange={handleFileChange}
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/rtf,text/plain,.pdf,.doc,.docx,.ppt,.pptx,.rtf,.txt,.log"
                className="hidden"
              />
              <Button 
                variant="outline" 
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose Files
              </Button>
              <span className="text-sm text-muted-foreground">
                Max 10MB per file. Images, PDF, Word, PPT, RTF, videos, logs, and text files only.
              </span>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="text-sm">{file.name} ({formatFileSize(file.size)})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
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
      <SecurityAlertDialog {...securityAlertProps} />
    </div>
  );
}
