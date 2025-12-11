import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, X, Save } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { bugsApi, projectsApi, tasksApi, usersApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default function BugEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Get current user
  const currentUser = getCurrentUser();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "",
    task_id: "",
    bug_type: "Functional",
    severity: "Low",
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
        severity: bug.severity || "Low",
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
    }
  }, [bug]);

  // Fetch projects, tasks, and users
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100 }),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll({ page: 1, limit: 100 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  const projects = projectsData?.data || [];
  const tasks = tasksData?.data || [];
  const allUsers = usersData?.data || [];

  // Filter tasks by selected project
  const filteredTasks = formData.project_id
    ? tasks.filter((task: any) => task.project_id?.toString() === formData.project_id)
    : tasks;

  // Filter team leads
  const teamLeads = allUsers.filter((user: any) => user.role === 'Team Lead');
  
  // Assignable users (Developers, Designers, Testers, Team Leads)
  const assignableUsers = allUsers.filter((user: any) =>
    ['Developer', 'Designer', 'Tester', 'Team Lead'].includes(user.role)
  );

  const updateMutation = useMutation({
    mutationFn: (data: any) => bugsApi.update(Number(id), data),
    onSuccess: () => {
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear task_id if project changes
    if (field === 'project_id') {
      setFormData((prev) => ({ ...prev, task_id: "" }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
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

    const updateData: any = {
      title: formData.title,
      description: formData.description,
      bug_type: formData.bug_type,
      severity: formData.severity,
      priority: formData.priority,
      status: formData.status,
      steps_to_reproduce: formData.steps_to_reproduce || null,
      expected_behavior: formData.expected_behavior || null,
      actual_behavior: formData.actual_behavior || null,
      browser: formData.browser || null,
      device: formData.device || null,
      os: formData.os || null,
      app_version: formData.app_version || null,
      api_endpoint: formData.api_endpoint || null,
      tags: formData.tags || null,
    };

    if (formData.project_id) {
      updateData.project_id = parseInt(formData.project_id);
    } else {
      updateData.project_id = null;
    }

    if (formData.task_id) {
      updateData.task_id = parseInt(formData.task_id);
    } else {
      updateData.task_id = null;
    }

    if (formData.resolution_type) {
      updateData.resolution_type = formData.resolution_type;
    } else {
      updateData.resolution_type = null;
    }

    if (formData.assigned_to) {
      updateData.assigned_to = parseInt(formData.assigned_to);
    } else {
      updateData.assigned_to = null;
    }

    if (formData.team_lead_id) {
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
          <div className="text-muted-foreground">Loading bug details...</div>
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/bugs/${id}`)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? "Updating..." : "Update Bug"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="reproduction">Reproduction</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="additional">Additional</TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Bug Information</CardTitle>
              <CardDescription>Essential details about the bug</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project_id">Project</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => handleInputChange("project_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
                    value={formData.task_id}
                    onValueChange={(value) => handleInputChange("task_id", value)}
                    disabled={!formData.project_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {filteredTasks.map((task: any) => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          {task.title || task.task_code || `Task #${task.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classification */}
        <TabsContent value="classification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bug Classification</CardTitle>
              <CardDescription>Type, severity, priority, and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="P1">P1 – Immediate</SelectItem>
                      <SelectItem value="P2">P2 – High</SelectItem>
                      <SelectItem value="P3">P3 – Normal</SelectItem>
                      <SelectItem value="P4">P4 – Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Reopened">Reopened</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                      <SelectItem value="Fixed">Fixed</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="resolution_type">Resolution Type</Label>
                  <Select
                    value={formData.resolution_type}
                    onValueChange={(value) => handleInputChange("resolution_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="Fixed">Fixed</SelectItem>
                      <SelectItem value="Duplicate">Duplicate</SelectItem>
                      <SelectItem value="Not a Bug">Not a Bug</SelectItem>
                      <SelectItem value="Won't Fix">Won't Fix</SelectItem>
                      <SelectItem value="Cannot Reproduce">Cannot Reproduce</SelectItem>
                      <SelectItem value="Deferred">Deferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignment */}
        <TabsContent value="assignment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
              <CardDescription>Assign bug to team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => handleInputChange("assigned_to", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {assignableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team_lead_id">Team Lead</Label>
                <Select
                  value={formData.team_lead_id}
                  onValueChange={(value) => handleInputChange("team_lead_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {teamLeads.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Reported By: {bug.reported_by_name || 'N/A'}</p>
                <p>Reported Date: {bug.created_at ? new Date(bug.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reproduction */}
        <TabsContent value="reproduction" className="space-y-6">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Environment */}
        <TabsContent value="environment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environment Details</CardTitle>
              <CardDescription>Where the bug was found</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  value={formData.device}
                  onValueChange={(value) => handleInputChange("device", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Additional */}
        <TabsContent value="additional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Additional Fields</CardTitle>
              <CardDescription>Timeline, tags, and attachments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="target_fix_date">Target Fix Date</Label>
                  <Input
                    id="target_fix_date"
                    type="date"
                    value={formData.target_fix_date}
                    onChange={(e) => handleInputChange("target_fix_date", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="actual_fix_date">Actual Fix Date</Label>
                  <Input
                    id="actual_fix_date"
                    type="date"
                    value={formData.actual_fix_date}
                    onChange={(e) => handleInputChange("actual_fix_date", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">Tags / Labels</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange("tags", e.target.value)}
                  placeholder="e.g., UI, backend, urgent (comma-separated)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attachments">Add New Attachments</Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*,video/*,.log,.txt"
                />
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span className="text-sm">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {bug.reopened_count !== undefined && (
                <div className="text-sm text-muted-foreground">
                  <p>Reopened Count: {bug.reopened_count || 0}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
