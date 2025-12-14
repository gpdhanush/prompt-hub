import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { projectsApi, tasksApi, usersApi, employeesApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

interface BugFormData {
  title: string;
  description: string;
  project_id: string;
  task_id: string;
  bug_type: string;
  severity: string;
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

interface BugFormProps {
  formData: BugFormData;
  onChange: (data: BugFormData) => void;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  isEdit?: boolean;
}

export function BugForm({ formData, onChange, attachments, onAttachmentsChange, isEdit = false }: BugFormProps) {
  // Get current user to exclude from assignable list
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;
  
  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch projects, tasks, and users
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll({ page: 1, limit: 100 }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000 }),
  });

  // Fetch assignable users using the dedicated endpoint (accessible to all users)
  // This includes Team Lead, Developer, Designer, Tester
  const { data: assignableUsersData, isLoading: isLoadingAssignable } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getAssignable(),
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
    // Use assignable users from API (includes Tester, Developer, Designer, Team Lead)
    // Filter to only Level 2 users (Tester, Developer, Designer)
    const baseLevel2Users = assignableUsersFromAPI.filter((user: any) => 
      ['Tester', 'Developer', 'Designer'].includes(user.role)
    );

    // If no employees data or no team lead selected, return all Level 2 users
    if (!allEmployees.length || !formData.team_lead_id || formData.team_lead_id === "none") {
      return baseLevel2Users.length > 0 ? baseLevel2Users : [];
    }

    // If a team lead is selected, filter to show only users under that team lead
    const selectedTeamLeadUser = assignableUsersFromAPI.find((u: any) => u.id.toString() === formData.team_lead_id);
    if (!selectedTeamLeadUser) {
      return baseLevel2Users.length > 0 ? baseLevel2Users : [];
    }

    // Find the employee record for the selected team lead
    const teamLeadEmployee = allEmployees.find((emp: any) => 
      emp.user_id === selectedTeamLeadUser.id
    );
    
    if (!teamLeadEmployee) {
      return baseLevel2Users.length > 0 ? baseLevel2Users : 
        allUsers.filter((user: any) => ['Tester', 'Developer', 'Designer'].includes(user.role));
    }

    // Find all employees under this team lead
    const teamEmployees = allEmployees.filter((emp: any) => 
      emp.team_lead_id && emp.team_lead_id === teamLeadEmployee.id
    );
    
    // Get user IDs of employees under this team lead
    const teamEmployeeUserIds = teamEmployees.map((emp: any) => emp.user_id).filter(Boolean);
    
    // Filter to show only Level 2 users under this team lead
    const filtered = baseLevel2Users.filter((user: any) => 
      teamEmployeeUserIds.includes(user.id)
    );

    // If filtered list is empty, return all Level 2 users as fallback
    const result = filtered.length > 0 ? filtered : baseLevel2Users;
    
    // Exclude current user from the list
    return result.filter((user: any) => user.id !== currentUserId);
  }, [assignableUsersFromAPI, allEmployees, formData.team_lead_id, currentUserId]);

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
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Bug Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter bug title"
                required
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
          <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="" disabled>Loading team leads...</SelectItem>
                  ) : teamLeads.length > 0 ? (
                    teamLeads.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No team leads available</SelectItem>
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
                    <SelectItem value="" disabled>Loading users...</SelectItem>
                  ) : assignableUsers.length > 0 ? (
                    assignableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No Level 2 users available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Bug Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the bug in detail"
              rows={6}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Bug Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Bug Classification</CardTitle>
          <CardDescription>Type, severity, and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => handleInputChange("severity", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">Critical (application down)</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Bug Status</Label>
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
                <SelectItem value="Fixed">Fixed</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
                <SelectItem value="Reopened">Reopened</SelectItem>
              </SelectContent>
            </Select>
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
            <Textarea
              id="steps_to_reproduce"
              value={formData.steps_to_reproduce}
              onChange={(e) => handleInputChange("steps_to_reproduce", e.target.value)}
              placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
              rows={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="actual_behavior">Actual Result</Label>
              <Textarea
                id="actual_behavior"
                value={formData.actual_behavior}
                onChange={(e) => handleInputChange("actual_behavior", e.target.value)}
                placeholder="What actually happens"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expected_behavior">Expected Result</Label>
              <Textarea
                id="expected_behavior"
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
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="browser">Browser</Label>
              <Input
                id="browser"
                value={formData.browser}
                onChange={(e) => handleInputChange("browser", e.target.value)}
                placeholder="e.g., Chrome, Firefox, Safari"
              />
            </div>
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
              <Label htmlFor="os">Operating System</Label>
              <Input
                id="os"
                value={formData.os}
                onChange={(e) => handleInputChange("os", e.target.value)}
                placeholder="e.g., Android, iOS, Windows, Mac"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="app_version">App Version</Label>
              <Input
                id="app_version"
                value={formData.app_version}
                onChange={(e) => handleInputChange("app_version", e.target.value)}
                placeholder="e.g., 1.0.0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="api_endpoint">API Endpoint (if applicable)</Label>
              <Input
                id="api_endpoint"
                value={formData.api_endpoint}
                onChange={(e) => handleInputChange("api_endpoint", e.target.value)}
                placeholder="e.g., /api/users/123"
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
    </div>
  );
}
