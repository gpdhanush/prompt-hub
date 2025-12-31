import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureInput } from "@/components/ui/secure-input";
import { Label } from "@/components/ui/label";
import { SecureTextarea } from "@/components/ui/secure-textarea";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { tasksApi } from "@/features/tasks/api";
import { projectsApi } from "@/features/projects/api";
import { employeesApi } from "@/features/employees/api";
import { usersApi } from "@/features/users/api";
import { getCurrentUser } from "@/lib/auth";
import { BugStatusDropdown } from "./BugStatusDropdown";

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
  target_fix_date: string;
  actual_fix_date: string;
  tags: string;
}

interface BugFormProps {
  formData: BugFormData;
  onChange: (data: BugFormData) => void;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  existingAttachments?: any[];
  onDeleteAttachment?: (attachmentId: number) => void;
  isEdit?: boolean;
}

export function BugForm({ formData, onChange, attachments, onAttachmentsChange, existingAttachments = [], onDeleteAttachment, isEdit = false }: BugFormProps) {
  // Get current user to exclude from assignable list
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;
  
  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { securityAlertProps } = useSecurityValidation();

  // Fetch projects, tasks, and users
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll({ page: 1, limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch assignable users using the dedicated endpoint (accessible to all users)
  // This includes Team Lead, Developer, Designer, Tester
  const { data: assignableUsersData, isLoading: isLoadingAssignable } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getAssignable(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projects = projectsData?.data || [];
  const tasks = tasksData?.data || [];
  const allEmployees = employeesData?.data || [];
  const assignableUsersFromAPI = assignableUsersData?.data || [];
  
  // Use assignable users as the source for all user operations
  const allUsers = assignableUsersFromAPI;

  // Filter tasks by selected project
  const filteredTasks = formData.project_id
    ? tasks.filter((task: any) => task.project_id?.toString() === formData.project_id)
    : tasks;

  // Filter Level 1 users (Team Leads) from assignable users
  // The assignable endpoint includes Team Lead and Team Leader
  const teamLeads = useMemo(() => {
    if (!assignableUsersFromAPI || assignableUsersFromAPI.length === 0) {
      return [];
    }
    // Filter for Team Lead and Team Leader roles from assignable users
    return assignableUsersFromAPI.filter((user: any) => {
      const userRole = user.role;
      if (!userRole) return false;
      // Check for Team Lead roles (case-insensitive)
      const roleLower = userRole.toLowerCase();
      return roleLower === 'team lead' || 
             roleLower === 'team leader' ||
             userRole === 'Team Lead' ||
             userRole === 'Team Leader';
    });
  }, [assignableUsersFromAPI]);
  
  // Filter Level 2 users (Testers, Developers, Designers) who are under Level 1 users
  // Use assignable users from API as base, then filter by hierarchy if employees data is available
  const assignableUsers = useMemo(() => {
    // Always show all Level 2 users (Tester, Developer, Designer)
    const baseLevel2Users = assignableUsersFromAPI.filter((user: any) =>
      ['Tester', 'Developer', 'Designer'].includes(user.role)
    );

    // Exclude current user from the list
    return baseLevel2Users.filter((user: any) => user.id !== currentUserId);
  }, [assignableUsersFromAPI, currentUserId]);

  const handleInputChange = (field: keyof BugFormData, value: string) => {
    const normalizedValue = (value === "none" || value === "unassigned" || value === "all") ? "" : value;
    const newData = { ...formData, [field]: normalizedValue };
    
    // Clear task_id if project changes
    if (field === 'project_id') {
      newData.task_id = "";
    }
    
    onChange(newData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    // Allowed MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/rtf',
      'text/rtf',
      'text/plain', // .txt
    ];
    
    // Allowed file extensions (for files that might not have proper MIME types)
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.ppt', '.pptx', '.rtf', '.txt', '.log'];
    
    // Check if file type starts with these prefixes
    const allowedTypePrefixes = ['image/', 'video/'];
    
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      // Check file size first
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} - File too large (max 10MB)`);
        return;
      }
      
      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidMimeType = allowedMimeTypes.includes(file.type);
      const isValidExtension = allowedExtensions.includes(fileExtension);
      const isValidTypePrefix = allowedTypePrefixes.some(prefix => file.type.startsWith(prefix));
      
      if (!isValidMimeType && !isValidExtension && !isValidTypePrefix) {
        invalidFiles.push(`${file.name} - Invalid file type`);
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

  return (
    <div className="space-y-6">
      {/* Basic Bug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Bug Information</CardTitle>
          <CardDescription>Essential details about the bug</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* First row: Bug Title, Bug Type, Project, Task (Optional) */}
          <div className="grid grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-red-500">Bug Title *</Label>
              <SecureInput
                id="title"
                fieldName="Bug Title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter bug title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bug_type">Bug Type</Label>
              <Select
                value={formData.bug_type}
                onValueChange={(value) => handleInputChange("bug_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Functional">Functional</SelectItem>
                  <SelectItem value="UI/UX">UI/UX</SelectItem>
                  <SelectItem value="Performance">Performance</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="Integration">Integration</SelectItem>
                  <SelectItem value="Crash">Crash</SelectItem>
                  <SelectItem value="Data Issue">Data Issue</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="task_id">Task (Optional)</Label>
              <Select
                value={formData.task_id || "none"}
                onValueChange={(value) => handleInputChange("task_id", value)}
                disabled={!formData.project_id || formData.project_id === "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredTasks.map((task: any) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.title || task.task_code || `Task #${task.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Second row: Priority, Bug Status, Team Lead, Assigned To */}
          <div className="grid grid-cols-4 gap-4">
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
                  <SelectItem value="P1">P1 - Critical</SelectItem>
                  <SelectItem value="P2">P2 - High</SelectItem>
                  <SelectItem value="P3">P3 - Medium</SelectItem>
                  <SelectItem value="P4">P4 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Bug Status</Label>
              <BugStatusDropdown
                currentStatus={formData.status || "Open"}
                onStatusChange={(value) => handleInputChange("status", value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team_lead_id">Team Lead</Label>
              <Select
                value={formData.team_lead_id || "none"}
                onValueChange={(value) => handleInputChange("team_lead_id", value)}
                disabled={isLoadingAssignable}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingAssignable ? "Loading..." : "Select team lead"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {isLoadingAssignable ? (
                    <SelectItem value="loading" disabled>Loading team leads...</SelectItem>
                  ) : teamLeads.length > 0 ? (
                    teamLeads.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-options" disabled>No team leads available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Select
                value={formData.assigned_to || "unassigned"}
                onValueChange={(value) => handleInputChange("assigned_to", value)}
                disabled={isLoadingAssignable}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingAssignable ? "Loading users..." : "Select assignee"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {isLoadingAssignable ? (
                    <SelectItem value="loading" disabled>Loading users...</SelectItem>
                  ) : assignableUsers.length > 0 ? (
                    assignableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-options" disabled>
                      No Level 2 users available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-red-500">Bug Description *</Label>
            <MarkdownEditor
              value={formData.description}
              onChange={(value) => handleInputChange("description", value)}
              placeholder="Describe the bug in detail. You can use markdown formatting: headings, lists, code blocks, and images."
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps & Reproduction */}
      <Card>
        <CardHeader>
          <CardTitle>Steps & Reproduction</CardTitle>
          <CardDescription>How to reproduce the bug</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="steps_to_reproduce">Steps to Reproduce</Label>
            <SecureTextarea
              id="steps_to_reproduce"
              fieldName="Steps to Reproduce"
              value={formData.steps_to_reproduce}
              onChange={(e) => handleInputChange("steps_to_reproduce", e.target.value)}
              placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
              rows={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="actual_behavior">Actual Result</Label>
              <SecureTextarea
                id="actual_behavior"
                fieldName="Actual Result"
                value={formData.actual_behavior}
                onChange={(e) => handleInputChange("actual_behavior", e.target.value)}
                placeholder="What actually happens"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expected_behavior">Expected Result</Label>
              <SecureTextarea
                id="expected_behavior"
                fieldName="Expected Result"
                value={formData.expected_behavior}
                onChange={(e) => handleInputChange("expected_behavior", e.target.value)}
                placeholder="What should happen"
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Details</CardTitle>
          <CardDescription>Where the bug was found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="device">Device</Label>
              <Select
                value={formData.device || "none"}
                onValueChange={(value) => handleInputChange("device", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Mobile">Mobile</SelectItem>
                  <SelectItem value="Desktop">Desktop</SelectItem>
                  <SelectItem value="Tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="browser">Browser</Label>
              <SecureInput
                id="browser"
                fieldName="Browser"
                value={formData.browser}
                onChange={(e) => handleInputChange("browser", e.target.value)}
                placeholder="e.g., Chrome, Firefox, Safari"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="os">Operating System</Label>
              <SecureInput
                id="os"
                fieldName="Operating System"
                value={formData.os}
                onChange={(e) => handleInputChange("os", e.target.value)}
                placeholder="e.g., Android, iOS, Windows, Mac"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app_version">App Version</Label>
              <SecureInput
                id="app_version"
                fieldName="App Version"
                value={formData.app_version}
                onChange={(e) => handleInputChange("app_version", e.target.value)}
                placeholder="e.g., 1.0.0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Fields</CardTitle>
          <CardDescription>Screenshots and attachments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="attachments">Screenshots / Attachments</Label>
            
            {/* Existing Attachments (for edit mode) */}
            {isEdit && existingAttachments.length > 0 && (
              <div className="space-y-2 mb-4">
                <Label className="text-sm font-semibold">Existing Files</Label>
                {existingAttachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.original_filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                        </p>
                      </div>
                    </div>
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
                ))}
              </div>
            )}
            
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
                    <span className="text-sm">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
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
