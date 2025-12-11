import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, FileText, MessageSquare, AlertCircle, Phone, Key, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { projectsApi, usersApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formatDate = (dateString?: string) => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", { 
    year: "numeric",
    month: "short", 
    day: "numeric"
  });
};

type Milestone = {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

export default function ProjectEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    estimated_delivery_plan: "",
    logo_url: "",
    is_internal: false,
    client_name: "",
    client_contact_person: "",
    client_email: "",
    client_phone: "",
    start_date: "",
    end_date: "",
    target_end_date: "",
    actual_end_date: "",
    status: "Not Started",
    progress: 0,
    risk_level: "",
    priority: "",
    daily_reporting_required: false,
    report_submission_time: "",
    auto_reminder_notifications: false,
    internal_notes: "",
    client_notes: "",
    admin_remarks: "",
    github_repo_url: "",
    bitbucket_repo_url: "",
    technologies_used: [] as string[],
    team_lead_id: "",
    member_ids: [] as string[],
    member_roles: {} as Record<string, string>,
    milestones: [] as Milestone[],
    // Additional features (for display/managing existing items)
    files: [] as Array<{ file: File; type: string; category?: string; description?: string }>,
    comments: [] as Array<{ comment: string; comment_type: string; is_internal: boolean }>,
    change_requests: [] as Array<{ title: string; description: string; priority: string; impact?: string; estimated_effort_hours?: string }>,
    call_notes: [] as Array<{ call_date: string; call_duration_minutes: string; participants: string; notes: string; action_items?: string }>,
    credentials: [] as Array<{ credential_type: string; service_name: string; username?: string; password?: string; url?: string; api_key?: string; notes?: string }>,
    daily_status: [] as Array<{ work_date: string; hours_worked: string; minutes_worked: string; work_description: string; tasks_completed?: string; blockers?: string }>,
  });

  // Fetch project data
  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(Number(id)),
    enabled: !!id,
  });

  // Fetch users for dropdowns
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  const allUsers = usersData?.data || [];
  const teamLeads = allUsers.filter((user: any) => user.role === 'Team Lead');
  const assignableUsers = allUsers.filter((user: any) => 
    ['Developer', 'Designer', 'Tester', 'Team Lead'].includes(user.role)
  );

  // Load project data into form
  useEffect(() => {
    if (projectData?.data) {
      const project = projectData.data;
      setFormData({
        name: project.name || "",
        description: project.description || "",
        estimated_delivery_plan: project.estimated_delivery_plan || "",
        logo_url: project.logo_url || "",
        is_internal: project.is_internal || false,
        client_name: project.client_name || "",
        client_contact_person: project.client_contact_person || "",
        client_email: project.client_email || "",
        client_phone: project.client_phone || "",
        start_date: project.start_date ? project.start_date.split('T')[0] : "",
        end_date: project.end_date ? project.end_date.split('T')[0] : "",
        target_end_date: project.target_end_date ? project.target_end_date.split('T')[0] : "",
        actual_end_date: project.actual_end_date ? project.actual_end_date.split('T')[0] : "",
        status: project.status || "Not Started",
        progress: project.progress || 0,
        risk_level: project.risk_level || "",
        priority: project.priority || "",
        daily_reporting_required: project.daily_reporting_required || false,
        report_submission_time: project.report_submission_time || "",
        auto_reminder_notifications: project.auto_reminder_notifications || false,
        internal_notes: project.internal_notes || "",
        client_notes: project.client_notes || "",
        admin_remarks: project.admin_remarks || "",
        github_repo_url: project.github_repo_url || "",
        bitbucket_repo_url: project.bitbucket_repo_url || "",
        technologies_used: project.technologies_used ? (Array.isArray(project.technologies_used) ? project.technologies_used : JSON.parse(project.technologies_used)) : [],
        team_lead_id: project.team_lead_id?.toString() || "",
        member_ids: project.member_ids || [],
        member_roles: project.member_roles || {},
        milestones: project.milestones || [],
        // Initialize additional features arrays (existing items loaded via ProjectTabs)
        files: [],
        comments: [],
        change_requests: [],
        call_notes: [],
        credentials: [],
        daily_status: [],
      });
    }
  }, [projectData]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      // Update project first
      const projectResponse = await projectsApi.update(id, data);
      
      // Then create/update additional items
      const promises = [];
      
      // Upload files
      for (const fileItem of data.files || []) {
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('file_type', fileItem.type);
        if (fileItem.category) formData.append('file_category', fileItem.category);
        if (fileItem.description) formData.append('description', fileItem.description);
        promises.push(projectsApi.uploadFile(id, formData).catch(err => console.error('File upload error:', err)));
      }
      
      // Create comments
      for (const comment of data.comments || []) {
        if (comment.comment.trim()) {
          promises.push(projectsApi.createComment(id, comment).catch(err => console.error('Comment error:', err)));
        }
      }
      
      // Create change requests
      for (const cr of data.change_requests || []) {
        if (cr.title.trim()) {
          promises.push(projectsApi.createChangeRequest(id, cr).catch(err => console.error('Change request error:', err)));
        }
      }
      
      // Create call notes
      for (const note of data.call_notes || []) {
        if (note.call_date && note.notes.trim()) {
          promises.push(projectsApi.createCallNote(id, note).catch(err => console.error('Call note error:', err)));
        }
      }
      
      // Create credentials
      for (const cred of data.credentials || []) {
        if (cred.service_name.trim()) {
          promises.push(projectsApi.createCredential(id, cred).catch(err => console.error('Credential error:', err)));
        }
      }
      
      // Create daily status entries
      for (const status of data.daily_status || []) {
        if (status.work_date && (status.hours_worked || status.minutes_worked)) {
          promises.push(projectsApi.createDailyStatus(id, status).catch(err => console.error('Daily status error:', err)));
        }
      }
      
      // Wait for all additional items to be created
      await Promise.all(promises);
      
      return projectResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast({ title: "Success", description: "Project updated successfully with all details." });
      navigate(`/projects/${id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update project.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      member_ids: formData.member_ids.filter(id => id),
      milestones: formData.milestones.filter(m => m.name),
      technologies_used: formData.technologies_used,
      // Include all additional features
      files: formData.files,
      comments: formData.comments.filter(c => c.comment.trim()),
      change_requests: formData.change_requests.filter(cr => cr.title.trim()),
      call_notes: formData.call_notes.filter(note => note.call_date && note.notes.trim()),
      credentials: formData.credentials.filter(cred => cred.service_name.trim()),
      daily_status: formData.daily_status.filter(status => status.work_date && (status.hours_worked || status.minutes_worked)),
    };

    updateMutation.mutate({ id: Number(id), data: submitData });
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones,
        { name: "", start_date: "", end_date: "", status: "Not Started" }
      ]
    });
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    const updated = [...formData.milestones];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, milestones: updated });
  };

  const removeMilestone = (index: number) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index)
    });
  };

  const toggleMember = (userId: string) => {
    const memberIds = formData.member_ids.includes(userId)
      ? formData.member_ids.filter(id => id !== userId)
      : [...formData.member_ids, userId];
    
    setFormData({ ...formData, member_ids: memberIds });
  };

  const updateMemberRole = (userId: string, role: string) => {
    setFormData({
      ...formData,
      member_roles: { ...formData.member_roles, [userId]: role }
    });
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

  if (error || !projectData?.data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive">Error loading project details.</div>
          <Button onClick={() => navigate('/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(`/projects/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Project</h1>
            <p className="text-muted-foreground">Update project details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Project name, description, and logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter project description"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimated_delivery_plan">Estimated Delivery Plan</Label>
              <Textarea
                id="estimated_delivery_plan"
                value={formData.estimated_delivery_plan}
                onChange={(e) => setFormData({ ...formData, estimated_delivery_plan: e.target.value })}
                placeholder="Describe the estimated delivery plan"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </CardContent>
        </Card>

        {/* Client Details */}
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>Optional if internal project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_internal"
                checked={formData.is_internal}
                onCheckedChange={(checked) => setFormData({ ...formData, is_internal: checked })}
              />
              <Label htmlFor="is_internal">Internal Project</Label>
            </div>
            {!formData.is_internal && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client_contact_person">Client Contact Person</Label>
                  <Input
                    id="client_contact_person"
                    value={formData.client_contact_person}
                    onChange={(e) => setFormData({ ...formData, client_contact_person: e.target.value })}
                    placeholder="Enter contact person name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client_email">Client Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    placeholder="client@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client_phone">Client Phone</Label>
                  <Input
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline & Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline & Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <DatePicker
                  id="start_date"
                  value={formData.start_date}
                  onChange={(date) => setFormData({ ...formData, start_date: date })}
                  placeholder="Select start date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">Target End Date</Label>
                <DatePicker
                  id="end_date"
                  value={formData.end_date}
                  onChange={(date) => setFormData({ ...formData, end_date: date })}
                  placeholder="Select target end date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="target_end_date">Target End Date (Alternative)</Label>
                <DatePicker
                  id="target_end_date"
                  value={formData.target_end_date}
                  onChange={(date) => setFormData({ ...formData, target_end_date: date })}
                  placeholder="Select target end date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="actual_end_date">Actual End Date</Label>
                <DatePicker
                  id="actual_end_date"
                  value={formData.actual_end_date}
                  onChange={(date) => setFormData({ ...formData, actual_end_date: date })}
                  placeholder="Select actual end date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Milestones</CardTitle>
                <CardDescription>Add project milestones</CardDescription>
              </div>
              <Button type="button" onClick={addMilestone} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No milestones added yet</p>
            ) : (
              formData.milestones.map((milestone, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Milestone {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMilestone(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Milestone Name</Label>
                      <Input
                        value={milestone.name}
                        onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                        placeholder="Enter milestone name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Start Date</Label>
                        <DatePicker
                          value={milestone.start_date}
                          onChange={(date) => updateMilestone(index, 'start_date', date)}
                          placeholder="Select start date"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>End Date</Label>
                        <DatePicker
                          value={milestone.end_date}
                          onChange={(date) => updateMilestone(index, 'end_date', date)}
                          placeholder="Select end date"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={milestone.status}
                        onValueChange={(value) => updateMilestone(index, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Not Started">Not Started</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Delayed">Delayed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Resource Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="team_lead_id">Assigned Team Lead</Label>
              <Select
                value={formData.team_lead_id}
                onValueChange={(value) => setFormData({ ...formData, team_lead_id: value })}
              >
                <SelectTrigger id="team_lead_id">
                  <SelectValue placeholder="Select team lead" />
                </SelectTrigger>
                <SelectContent>
                  {teamLeads.map((lead: any) => (
                    <SelectItem key={lead.id} value={lead.id.toString()}>
                      {lead.name} ({lead.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Assigned Employees</Label>
              <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                {assignableUsers.map((user: any) => {
                  const isSelected = formData.member_ids.includes(user.id.toString());
                  return (
                    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMember(user.id.toString())}
                          className="rounded"
                        />
                        <span className="text-sm">{user.name} ({user.email})</span>
                      </div>
                      {isSelected && (
                        <Select
                          value={formData.member_roles[user.id] || 'employee'}
                          onValueChange={(value) => updateMemberRole(user.id.toString(), value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tl">Team Lead</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="qa">QA</SelectItem>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Status Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Current Project Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Pre-Prod">Pre-Prod</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="progress">Progress (%)</Label>
                <div className="space-y-2">
                  <Input
                    id="progress"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                  />
                  <Progress value={formData.progress} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="risk_level">Risk Level</Label>
                <Select
                  value={formData.risk_level}
                  onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
                >
                  <SelectTrigger id="risk_level">
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Task Reporting Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Task Reporting Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="daily_reporting_required"
                checked={formData.daily_reporting_required}
                onCheckedChange={(checked) => setFormData({ ...formData, daily_reporting_required: checked })}
              />
              <Label htmlFor="daily_reporting_required">Daily Reporting Required?</Label>
            </div>
            {formData.daily_reporting_required && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="report_submission_time">Report Submission Time</Label>
                  <TimePicker
                    id="report_submission_time"
                    value={formData.report_submission_time}
                    onChange={(time) => setFormData({ ...formData, report_submission_time: time })}
                    placeholder="Select time (e.g., before 7 PM)"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto_reminder_notifications"
                    checked={formData.auto_reminder_notifications}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_reminder_notifications: checked })}
                  />
                  <Label htmlFor="auto_reminder_notifications">Auto-Reminder Notifications</Label>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="internal_notes">Internal Notes</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                placeholder="Internal notes (not visible to client)"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client_notes">Client Notes</Label>
              <Textarea
                id="client_notes"
                value={formData.client_notes}
                onChange={(e) => setFormData({ ...formData, client_notes: e.target.value })}
                placeholder="Notes visible to client"
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin_remarks">Admin Remarks</Label>
              <Textarea
                id="admin_remarks"
                value={formData.admin_remarks}
                onChange={(e) => setFormData({ ...formData, admin_remarks: e.target.value })}
                placeholder="Admin-only remarks"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Technologies Used */}
        <Card>
          <CardHeader>
            <CardTitle>Technologies Used</CardTitle>
            <CardDescription>Select technologies used in this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Technologies</Label>
              <div className="flex flex-wrap gap-2">
                {['Flutter', 'React', 'Node.js', 'MySQL', 'PostgreSQL', 'MongoDB', 'Python', 'Java', 'PHP', 'Vue.js', 'Angular', 'TypeScript', 'Docker', 'AWS', 'Azure', 'Git', 'Redis', 'Elasticsearch', 'GraphQL', 'REST API'].map((tech) => (
                  <div key={tech} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`tech-${tech}`}
                      checked={formData.technologies_used.includes(tech)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, technologies_used: [...formData.technologies_used, tech] });
                        } else {
                          setFormData({ ...formData, technologies_used: formData.technologies_used.filter(t => t !== tech) });
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={`tech-${tech}`} className="text-sm font-normal cursor-pointer">{tech}</Label>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Input
                  placeholder="Add custom technology (press Enter)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !formData.technologies_used.includes(value)) {
                        setFormData({ ...formData, technologies_used: [...formData.technologies_used, value] });
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>
              {formData.technologies_used.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.technologies_used.map((tech) => (
                    <span key={tech} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm flex items-center gap-1">
                      {tech}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, technologies_used: formData.technologies_used.filter(t => t !== tech) })}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="github_repo_url">GitHub/Bitbucket Repo URL</Label>
              <Input
                id="github_repo_url"
                value={formData.github_repo_url}
                onChange={(e) => setFormData({ ...formData, github_repo_url: e.target.value })}
                placeholder="https://github.com/username/repo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bitbucket_repo_url">Bitbucket Repo URL</Label>
              <Input
                id="bitbucket_repo_url"
                value={formData.bitbucket_repo_url}
                onChange={(e) => setFormData({ ...formData, bitbucket_repo_url: e.target.value })}
                placeholder="https://bitbucket.org/username/repo"
              />
            </div>
          </CardContent>
        </Card>

        {/* File Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Files
            </CardTitle>
            <CardDescription>Upload project-related files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.files.map((fileItem, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{fileItem.file.name}</div>
                  <div className="text-xs text-muted-foreground">{fileItem.type} {fileItem.category && `• ${fileItem.category}`}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newFiles = [...formData.files];
                    newFiles.splice(index, 1);
                    setFormData({ ...formData, files: newFiles });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="grid gap-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>File Type</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({
                            ...formData,
                            files: [...formData.files, { file, type: value, category: '', description: '' }]
                          });
                        }
                      };
                      fileInput.click();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select file type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOW">SOW</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Design Document">Design Document</SelectItem>
                      <SelectItem value="Requirement Doc">Requirement Doc</SelectItem>
                      <SelectItem value="Change Request">Change Request</SelectItem>
                      <SelectItem value="Meeting Notes">Meeting Notes</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Project Comments
            </CardTitle>
            <CardDescription>Add comments by role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.comments.map((comment, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge variant="neutral">{comment.comment_type}</StatusBadge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newComments = [...formData.comments];
                      newComments.splice(index, 1);
                      setFormData({ ...formData, comments: newComments });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm">{comment.comment}</p>
              </div>
            ))}
            <div className="grid gap-4 border-t pt-4">
              <div className="grid gap-2">
                <Label>Comment Type</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      comments: [...formData.comments, { comment: '', comment_type: value, is_internal: true }]
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select comment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Developer">Developer</SelectItem>
                    <SelectItem value="Tester">Tester</SelectItem>
                    <SelectItem value="Designer">Designer</SelectItem>
                    <SelectItem value="Team Lead">Team Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.comments.length > 0 && formData.comments[formData.comments.length - 1]?.comment === '' && (
                <div className="grid gap-2">
                  <Label>Comment</Label>
                  <Textarea
                    value={formData.comments[formData.comments.length - 1].comment}
                    onChange={(e) => {
                      const newComments = [...formData.comments];
                      newComments[newComments.length - 1].comment = e.target.value;
                      setFormData({ ...formData, comments: newComments });
                    }}
                    rows={3}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Change Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Change Requests
            </CardTitle>
            <CardDescription>Add change requests for this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.change_requests.map((cr, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{cr.title}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newCRs = [...formData.change_requests];
                      newCRs.splice(index, 1);
                      setFormData({ ...formData, change_requests: newCRs });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{cr.description}</p>
                <div className="text-xs text-muted-foreground">Priority: {cr.priority}</div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  ...formData,
                  change_requests: [...formData.change_requests, { title: '', description: '', priority: 'Medium', impact: '', estimated_effort_hours: '' }]
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Change Request
            </Button>
            {formData.change_requests.length > 0 && formData.change_requests[formData.change_requests.length - 1]?.title === '' && (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.change_requests[formData.change_requests.length - 1].title}
                    onChange={(e) => {
                      const newCRs = [...formData.change_requests];
                      newCRs[newCRs.length - 1].title = e.target.value;
                      setFormData({ ...formData, change_requests: newCRs });
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.change_requests[formData.change_requests.length - 1].description}
                    onChange={(e) => {
                      const newCRs = [...formData.change_requests];
                      newCRs[newCRs.length - 1].description = e.target.value;
                      setFormData({ ...formData, change_requests: newCRs });
                    }}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.change_requests[formData.change_requests.length - 1].priority}
                      onValueChange={(value) => {
                        const newCRs = [...formData.change_requests];
                        newCRs[newCRs.length - 1].priority = value;
                        setFormData({ ...formData, change_requests: newCRs });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Estimated Effort (Hours)</Label>
                    <Input
                      type="number"
                      value={formData.change_requests[formData.change_requests.length - 1].estimated_effort_hours}
                      onChange={(e) => {
                        const newCRs = [...formData.change_requests];
                        newCRs[newCRs.length - 1].estimated_effort_hours = e.target.value;
                        setFormData({ ...formData, change_requests: newCRs });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Call Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Client Call Notes
            </CardTitle>
            <CardDescription>Record client call notes with date/time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.call_notes.map((note, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{note.call_date ? new Date(note.call_date).toLocaleString() : 'No date'}</div>
                    {note.call_duration_minutes && (
                      <div className="text-xs text-muted-foreground">Duration: {note.call_duration_minutes} minutes</div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newNotes = [...formData.call_notes];
                      newNotes.splice(index, 1);
                      setFormData({ ...formData, call_notes: newNotes });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm">{note.notes}</p>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  ...formData,
                  call_notes: [...formData.call_notes, { call_date: '', call_duration_minutes: '', participants: '', notes: '', action_items: '' }]
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Call Note
            </Button>
            {formData.call_notes.length > 0 && formData.call_notes[formData.call_notes.length - 1]?.call_date === '' && (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Call Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.call_notes[formData.call_notes.length - 1].call_date}
                      onChange={(e) => {
                        const newNotes = [...formData.call_notes];
                        newNotes[newNotes.length - 1].call_date = e.target.value;
                        setFormData({ ...formData, call_notes: newNotes });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Duration (Minutes)</Label>
                    <Input
                      type="number"
                      value={formData.call_notes[formData.call_notes.length - 1].call_duration_minutes}
                      onChange={(e) => {
                        const newNotes = [...formData.call_notes];
                        newNotes[newNotes.length - 1].call_duration_minutes = e.target.value;
                        setFormData({ ...formData, call_notes: newNotes });
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Participants</Label>
                  <Input
                    value={formData.call_notes[formData.call_notes.length - 1].participants}
                    onChange={(e) => {
                      const newNotes = [...formData.call_notes];
                      newNotes[newNotes.length - 1].participants = e.target.value;
                      setFormData({ ...formData, call_notes: newNotes });
                    }}
                    placeholder="Comma-separated list"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Notes *</Label>
                  <Textarea
                    value={formData.call_notes[formData.call_notes.length - 1].notes}
                    onChange={(e) => {
                      const newNotes = [...formData.call_notes];
                      newNotes[newNotes.length - 1].notes = e.target.value;
                      setFormData({ ...formData, call_notes: newNotes });
                    }}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Action Items</Label>
                  <Textarea
                    value={formData.call_notes[formData.call_notes.length - 1].action_items}
                    onChange={(e) => {
                      const newNotes = [...formData.call_notes];
                      newNotes[newNotes.length - 1].action_items = e.target.value;
                      setFormData({ ...formData, call_notes: newNotes });
                    }}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Credentials Management
            </CardTitle>
            <CardDescription>Store login info, API keys, and credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.credentials.map((cred, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{cred.service_name}</div>
                    <div className="text-xs text-muted-foreground">{cred.credential_type}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newCreds = [...formData.credentials];
                      newCreds.splice(index, 1);
                      setFormData({ ...formData, credentials: newCreds });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  ...formData,
                  credentials: [...formData.credentials, { credential_type: 'Login', service_name: '', username: '', password: '', url: '', api_key: '', notes: '' }]
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
            {formData.credentials.length > 0 && formData.credentials[formData.credentials.length - 1]?.service_name === '' && (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Credential Type</Label>
                    <Select
                      value={formData.credentials[formData.credentials.length - 1].credential_type}
                      onValueChange={(value) => {
                        const newCreds = [...formData.credentials];
                        newCreds[newCreds.length - 1].credential_type = value;
                        setFormData({ ...formData, credentials: newCreds });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Login">Login</SelectItem>
                        <SelectItem value="API Key">API Key</SelectItem>
                        <SelectItem value="Database">Database</SelectItem>
                        <SelectItem value="Server">Server</SelectItem>
                        <SelectItem value="Third-party Service">Third-party Service</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Service Name *</Label>
                    <Input
                      value={formData.credentials[formData.credentials.length - 1].service_name}
                      onChange={(e) => {
                        const newCreds = [...formData.credentials];
                        newCreds[newCreds.length - 1].service_name = e.target.value;
                        setFormData({ ...formData, credentials: newCreds });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Username</Label>
                    <Input
                      value={formData.credentials[formData.credentials.length - 1].username}
                      onChange={(e) => {
                        const newCreds = [...formData.credentials];
                        newCreds[newCreds.length - 1].username = e.target.value;
                        setFormData({ ...formData, credentials: newCreds });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={formData.credentials[formData.credentials.length - 1].password}
                      onChange={(e) => {
                        const newCreds = [...formData.credentials];
                        newCreds[newCreds.length - 1].password = e.target.value;
                        setFormData({ ...formData, credentials: newCreds });
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>URL</Label>
                  <Input
                    value={formData.credentials[formData.credentials.length - 1].url}
                    onChange={(e) => {
                      const newCreds = [...formData.credentials];
                      newCreds[newCreds.length - 1].url = e.target.value;
                      setFormData({ ...formData, credentials: newCreds });
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Status Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daily Status Entry
            </CardTitle>
            <CardDescription>Track daily work hours and minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.daily_status.map((status, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{status.work_date ? formatDate(status.work_date) : 'No date'}</div>
                    <div className="text-xs text-muted-foreground">
                      {status.hours_worked}h {status.minutes_worked}m
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newStatus = [...formData.daily_status];
                      newStatus.splice(index, 1);
                      setFormData({ ...formData, daily_status: newStatus });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {status.work_description && <p className="text-sm">{status.work_description}</p>}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  ...formData,
                  daily_status: [...formData.daily_status, { work_date: new Date().toISOString().split('T')[0], hours_worked: '', minutes_worked: '', work_description: '', tasks_completed: '', blockers: '' }]
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Daily Status
            </Button>
            {formData.daily_status.length > 0 && formData.daily_status[formData.daily_status.length - 1]?.hours_worked === '' && (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Work Date</Label>
                    <DatePicker
                      value={formData.daily_status[formData.daily_status.length - 1].work_date}
                      onChange={(date) => {
                        const newStatus = [...formData.daily_status];
                        newStatus[newStatus.length - 1].work_date = date;
                        setFormData({ ...formData, daily_status: newStatus });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      value={formData.daily_status[formData.daily_status.length - 1].hours_worked}
                      onChange={(e) => {
                        const newStatus = [...formData.daily_status];
                        newStatus[newStatus.length - 1].hours_worked = e.target.value;
                        setFormData({ ...formData, daily_status: newStatus });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.daily_status[formData.daily_status.length - 1].minutes_worked}
                      onChange={(e) => {
                        const newStatus = [...formData.daily_status];
                        newStatus[newStatus.length - 1].minutes_worked = e.target.value;
                        setFormData({ ...formData, daily_status: newStatus });
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Work Description</Label>
                  <Textarea
                    value={formData.daily_status[formData.daily_status.length - 1].work_description}
                    onChange={(e) => {
                      const newStatus = [...formData.daily_status];
                      newStatus[newStatus.length - 1].work_description = e.target.value;
                      setFormData({ ...formData, daily_status: newStatus });
                    }}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tasks Completed</Label>
                  <Textarea
                    value={formData.daily_status[formData.daily_status.length - 1].tasks_completed}
                    onChange={(e) => {
                      const newStatus = [...formData.daily_status];
                      newStatus[newStatus.length - 1].tasks_completed = e.target.value;
                      setFormData({ ...formData, daily_status: newStatus });
                    }}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Blockers</Label>
                  <Textarea
                    value={formData.daily_status[formData.daily_status.length - 1].blockers}
                    onChange={(e) => {
                      const newStatus = [...formData.daily_status];
                      newStatus[newStatus.length - 1].blockers = e.target.value;
                      setFormData({ ...formData, daily_status: newStatus });
                    }}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(`/projects/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
