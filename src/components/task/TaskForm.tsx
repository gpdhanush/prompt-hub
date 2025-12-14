import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { projectsApi, usersApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

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

  // Fetch projects and users
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
  });

  // Fetch assignable users using the dedicated endpoint (accessible to all users)
  // This includes Team Lead, Developer, Designer, Tester
  const { data: assignableUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getAssignable(),
  });

  const projects = projectsData?.data || [];
  const allUsers = assignableUsersData?.data || [];

  // Filter users by role
  const developers = useMemo(() => 
    allUsers.filter((user: any) => user.role === 'Developer'),
    [allUsers]
  );
  
  const designers = useMemo(() => 
    allUsers.filter((user: any) => user.role === 'Designer'),
    [allUsers]
  );
  
  const testers = useMemo(() => 
    allUsers.filter((user: any) => user.role === 'Tester'),
    [allUsers]
  );
  
  const assignableUsers = useMemo(() => 
    allUsers
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
      }),
    [allUsers]
  );

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
    <div className="space-y-6">
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
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project_id">Project</Label>
              <Select
                value={formData.project_id || "none"}
                onValueChange={(value) => handleInputChange("project_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the task in detail"
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
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange("priority", value)}
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
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

      {/* Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
          <CardDescription>Assign team members to this task</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Select
                value={formData.assigned_to || "none"}
                onValueChange={(value) => handleInputChange("assigned_to", value)}
                disabled={isLoadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select user"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {isLoadingUsers ? (
                    <SelectItem value="__loading__" disabled>Loading users...</SelectItem>
                  ) : assignableUsers.length > 0 ? (
                    assignableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_users__" disabled>No users available</SelectItem>
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
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteAttachment(attachment.id)}
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
              <Input
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
    </div>
  );
}
