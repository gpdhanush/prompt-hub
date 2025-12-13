import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, Upload, Trash2, FileText, MessageSquare, AlertCircle, Phone, Key, Clock, Save, Download, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Separator } from "@/components/ui/separator";
import { projectsApi, usersApi, employeesApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";

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

export default function ProjectCreate() {
  const navigate = useNavigate();
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
    // Additional features - only saved items
    files: [] as Array<{ file: File; type: string; category?: string; description?: string }>,
    comments: [] as Array<{ comment: string; comment_type: string; is_internal: boolean }>,
    change_requests: [] as Array<{ title: string; description: string; priority: string; impact?: string; estimated_effort_hours?: string }>,
    call_notes: [] as Array<{ call_date: string; call_duration_minutes: string; participants: string; notes: string; action_items?: string }>,
    credentials: [] as Array<{ credential_type: string; service_name: string; username?: string; password?: string; url?: string; api_key?: string; notes?: string }>,
    daily_status: [] as Array<{ work_date: string; hours_worked: string; minutes_worked: string; work_description: string; tasks_completed?: string; blockers?: string }>,
  });

  // Separate state for form visibility and temporary form data
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentForm, setCommentForm] = useState({ comment: '', comment_type: 'General', is_internal: true });

  const [showChangeRequestForm, setShowChangeRequestForm] = useState(false);
  const [changeRequestForm, setChangeRequestForm] = useState({ title: '', description: '', priority: 'Medium', impact: '', estimated_effort_hours: '' });

  const [showCallNoteForm, setShowCallNoteForm] = useState(false);
  const [callNoteForm, setCallNoteForm] = useState({ call_date: '', call_duration_minutes: '', participants: '', notes: '', action_items: '' });

  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [credentialForm, setCredentialForm] = useState({ credential_type: 'Login', service_name: '', username: '', password: '', url: '', api_key: '', notes: '' });

  const [showDailyStatusForm, setShowDailyStatusForm] = useState(false);
  const [dailyStatusForm, setDailyStatusForm] = useState({ work_date: new Date().toISOString().split('T')[0], hours_worked: '', minutes_worked: '', work_description: '', tasks_completed: '', blockers: '' });

  // State for showing credential details
  const [visibleCredentials, setVisibleCredentials] = useState<Record<number, boolean>>({});

  // Simple encryption/decryption functions (Note: For production, use proper encryption libraries)
  const encryptCredential = (text: string): string => {
    if (!text) return '';
    // Simple base64 encoding (in production, use proper encryption with keys)
    try {
      return btoa(unescape(encodeURIComponent(text)));
    } catch (e) {
      return text;
    }
  };

  const decryptCredential = (encrypted: string): string => {
    if (!encrypted) return '';
    try {
      return decodeURIComponent(escape(atob(encrypted)));
    } catch (e) {
      return encrypted;
    }
  };

  const toggleCredentialVisibility = (index: number) => {
    setVisibleCredentials(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Fetch users for dropdowns
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  // Fetch employees to get team lead relationships
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000 }),
  });

  const allUsers = usersData?.data || [];
  const allEmployees = employeesData?.data || [];
  const teamLeads = allUsers.filter((user: any) => user.role === 'Team Lead');
  
  // Filter assignable users based on selected team lead
  const assignableUsers = useMemo(() => {
    // If no team lead selected, don't show any employees
    if (!formData.team_lead_id) {
      return [];
    }
    
    // Find the selected team lead user
    const selectedTeamLeadUser = allUsers.find((u: any) => u.id.toString() === formData.team_lead_id);
    if (!selectedTeamLeadUser) {
      return [];
    }
    
    // Find the employee record for the selected team lead (by user_id)
    const teamLeadEmployee = allEmployees.find((emp: any) => 
      emp.user_id === selectedTeamLeadUser.id
    );
    
    if (!teamLeadEmployee) {
      // If team lead doesn't have an employee record, return empty
      return [];
    }
    
    // Find all employees under this team lead (using team_lead_id which references employee.id)
    const teamEmployees = allEmployees.filter((emp: any) => 
      emp.team_lead_id && emp.team_lead_id === teamLeadEmployee.id
    );
    
    // Get user IDs of employees under this team lead
    const teamEmployeeUserIds = teamEmployees.map((emp: any) => emp.user_id).filter(Boolean);
    
    // Filter users who are employees under this team lead
    return allUsers.filter((user: any) => 
      teamEmployeeUserIds.includes(user.id) && 
      ['Developer', 'Designer', 'Tester'].includes(user.role)
    );
  }, [formData.team_lead_id, allUsers, allEmployees]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create project first
      const projectResponse = await projectsApi.create(data);
      const projectId = projectResponse.data.id;
      
      // Then create additional items
      const promises = [];
      
      // Upload files
      for (const fileItem of data.files || []) {
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('file_type', fileItem.type);
        if (fileItem.category) formData.append('file_category', fileItem.category);
        if (fileItem.description) formData.append('description', fileItem.description);
        promises.push(projectsApi.uploadFile(projectId, formData).catch(err => logger.error('File upload error:', err)));
      }
      
      // Create comments
      for (const comment of data.comments || []) {
        if (comment.comment.trim()) {
          promises.push(projectsApi.createComment(projectId, comment).catch(err => logger.error('Comment error:', err)));
        }
      }
      
      // Create change requests
      for (const cr of data.change_requests || []) {
        if (cr.title.trim()) {
          promises.push(projectsApi.createChangeRequest(projectId, cr).catch(err => logger.error('Change request error:', err)));
        }
      }
      
      // Create call notes
      for (const note of data.call_notes || []) {
        if (note.call_date && note.notes.trim()) {
          promises.push(projectsApi.createCallNote(projectId, note).catch(err => logger.error('Call note error:', err)));
        }
      }
      
      // Create credentials
      for (const cred of data.credentials || []) {
        if (cred.service_name.trim()) {
          promises.push(projectsApi.createCredential(projectId, cred).catch(err => logger.error('Credential error:', err)));
        }
      }
      
      // Create daily status entries
      for (const status of data.daily_status || []) {
        if (status.work_date && (status.hours_worked || status.minutes_worked)) {
          promises.push(projectsApi.createDailyStatus(projectId, status).catch(err => logger.error('Daily status error:', err)));
        }
      }
      
      // Wait for all additional items to be created
      await Promise.all(promises);
      
      return projectResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project created successfully with all details." });
      navigate('/projects');
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create project.",
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

    createMutation.mutate(submitData);
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

  const toggleMember = (userId: string, userRole: string) => {
    const memberIds = formData.member_ids.includes(userId)
      ? formData.member_ids.filter(id => id !== userId)
      : [...formData.member_ids, userId];

    // Map user role to project role
    const roleMap: Record<string, string> = {
      'Team Lead': 'tl',
      'Developer': 'developer',
      'Tester': 'qa',
      'Designer': 'designer',
    };
    const projectRole = roleMap[userRole] || 'employee';

    const memberRoles = { ...formData.member_roles };
    if (memberIds.includes(userId)) {
      memberRoles[userId] = projectRole;
    } else {
      delete memberRoles[userId];
    }

    setFormData({ ...formData, member_ids: memberIds, member_roles: memberRoles });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Project</h1>
            <p className="text-muted-foreground">Fill in all project details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="team">Team & Status</TabsTrigger>
            <TabsTrigger value="additional">Additional</TabsTrigger>
            <TabsTrigger value="notes">Notes & Tech</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
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
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
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
          </TabsContent>

          {/* Team & Status Tab */}
          <TabsContent value="team" className="space-y-6">
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
                onValueChange={(value) => {
                  // Clear member selections when team lead changes
                  setFormData({ 
                    ...formData, 
                    team_lead_id: value,
                    member_ids: [],
                    member_roles: {}
                  });
                }}
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
                {assignableUsers.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {formData.team_lead_id 
                      ? "No employees available for the selected team lead. Please assign employees to this team lead first."
                      : "Please select a team lead to see available employees."}
                  </div>
                ) : (
                  assignableUsers.map((user: any) => {
                    const isSelected = formData.member_ids.includes(user.id.toString());
                    const roleMap: Record<string, string> = {
                      'Team Lead': 'TL',
                      'Developer': 'Developer',
                      'Tester': 'QA',
                      'Designer': 'Designer',
                    };
                    const displayRole = roleMap[user.role] || user.role;
                    return (
                      <div 
                        key={user.id} 
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-muted border border-transparent'
                        }`}
                        onClick={() => toggleMember(user.id.toString(), user.role)}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                          }`}>
                            {isSelected && (
                              <svg className="h-3 w-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({user.email})</span>
                            <span className="text-xs text-muted-foreground ml-2">• {displayRole}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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
          </TabsContent>

          {/* Additional Features Tab */}
          <TabsContent value="additional" className="space-y-6">
        {/* File Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Files ({formData.files.length})
            </CardTitle>
            <CardDescription>Upload project-related files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.files.length > 0 && (
              <div className="space-y-2">
                {formData.files.map((fileItem, index) => {
                  const isImage = fileItem.file.type.startsWith('image/');
                  return (
                    <div key={index} className={`flex items-center gap-3 p-3 border rounded ${isImage ? 'border-primary/20 bg-primary/5' : ''}`}>
                      {isImage ? (
                        <div className="h-12 w-12 rounded border overflow-hidden flex-shrink-0">
                          <img 
                            src={URL.createObjectURL(fileItem.file)} 
                            alt={fileItem.file.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded border flex items-center justify-center flex-shrink-0">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{fileItem.file.name}</div>
                        <div className="text-xs text-muted-foreground">{fileItem.type} {fileItem.category && `• ${fileItem.category}`}</div>
                        <div className="text-xs text-muted-foreground">{(fileItem.file.size / 1024).toFixed(2)} KB</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const url = URL.createObjectURL(fileItem.file);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileItem.file.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
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
                    </div>
                  );
                })}
              </div>
            )}
            
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
                      <SelectItem value="Document">Document</SelectItem>
                      <SelectItem value="Image">Image</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Code">Code</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category (Optional)</Label>
                  <Input
                    placeholder="e.g., Requirements, Mockups"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="File description"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({formData.comments.length})
            </CardTitle>
            <CardDescription>Add project comments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.comments.length > 0 && (
              <div className="space-y-2">
                {formData.comments.map((comment, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{comment.comment_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {comment.is_internal ? 'Internal' : 'Client Visible'}
                        </div>
                      </div>
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
              </div>
            )}
            
            {!showCommentForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCommentForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Comment
              </Button>
            ) : (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Comment Type</Label>
                    <Select
                      value={commentForm.comment_type}
                      onValueChange={(value) => setCommentForm({ ...commentForm, comment_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Issue">Issue</SelectItem>
                        <SelectItem value="Update">Update</SelectItem>
                        <SelectItem value="Question">Question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      id="is_internal_comment"
                      checked={commentForm.is_internal}
                      onCheckedChange={(checked) => setCommentForm({ ...commentForm, is_internal: checked })}
                    />
                    <Label htmlFor="is_internal_comment">Internal Only</Label>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Comment</Label>
                  <Textarea
                    value={commentForm.comment}
                    onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })}
                    rows={4}
                    placeholder="Enter comment..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCommentForm(false);
                      setCommentForm({ comment: '', comment_type: 'General', is_internal: true });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (commentForm.comment.trim()) {
                        setFormData({
                          ...formData,
                          comments: [...formData.comments, { ...commentForm }]
                        });
                        setCommentForm({ comment: '', comment_type: 'General', is_internal: true });
                        setShowCommentForm(false);
                      }
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Add Comment
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Change Requests ({formData.change_requests.length})
            </CardTitle>
            <CardDescription>Track project change requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.change_requests.length > 0 && (
              <div className="space-y-2">
                {formData.change_requests.map((cr, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{cr.title}</div>
                        <div className="text-xs text-muted-foreground">Priority: {cr.priority}</div>
                      </div>
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
                    <p className="text-sm">{cr.description}</p>
                  </div>
                ))}
              </div>
            )}
            
            {!showChangeRequestForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChangeRequestForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Change Request
              </Button>
            ) : (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input
                    value={changeRequestForm.title}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, title: e.target.value })}
                    placeholder="Enter change request title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={changeRequestForm.description}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, description: e.target.value })}
                    rows={4}
                    placeholder="Describe the change request..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select
                      value={changeRequestForm.priority}
                      onValueChange={(value) => setChangeRequestForm({ ...changeRequestForm, priority: value })}
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
                    <Label>Impact</Label>
                    <Input
                      value={changeRequestForm.impact}
                      onChange={(e) => setChangeRequestForm({ ...changeRequestForm, impact: e.target.value })}
                      placeholder="Impact assessment"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Estimated Effort (Hours)</Label>
                  <Input
                    type="number"
                    value={changeRequestForm.estimated_effort_hours}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, estimated_effort_hours: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowChangeRequestForm(false);
                      setChangeRequestForm({ title: '', description: '', priority: 'Medium', impact: '', estimated_effort_hours: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (changeRequestForm.title.trim() && changeRequestForm.description.trim()) {
                        setFormData({
                          ...formData,
                          change_requests: [...formData.change_requests, { ...changeRequestForm }]
                        });
                        setChangeRequestForm({ title: '', description: '', priority: 'Medium', impact: '', estimated_effort_hours: '' });
                        setShowChangeRequestForm(false);
                      }
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Add Change Request
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Client Call Notes ({formData.call_notes.length})
            </CardTitle>
            <CardDescription>Record client call information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.call_notes.length > 0 && (
              <div className="space-y-2">
                {formData.call_notes.map((note, index) => {
                  const formatDateTime = (dateTimeStr: string) => {
                    if (!dateTimeStr) return 'Not set';
                    try {
                      const dt = new Date(dateTimeStr.includes('T') ? dateTimeStr : dateTimeStr.replace(' ', 'T'));
                      if (!isNaN(dt.getTime())) {
                        return dt.toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      }
                    } catch (e) {
                      return dateTimeStr;
                    }
                    return dateTimeStr;
                  };
                  return (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{formatDateTime(note.call_date)}</div>
                        <div className="text-xs text-muted-foreground">
                          Duration: {note.call_duration_minutes} minutes
                        </div>
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
                  );
                })}
              </div>
            )}
            
            {!showCallNoteForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCallNoteForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Call Note
              </Button>
            ) : (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Call Date & Time</Label>
                    <DateTimePicker
                      value={callNoteForm.call_date}
                      onChange={(datetime) => setCallNoteForm({ ...callNoteForm, call_date: datetime })}
                      placeholder="Select date and time"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Duration (Minutes)</Label>
                    <Input
                      type="number"
                      value={callNoteForm.call_duration_minutes}
                      onChange={(e) => setCallNoteForm({ ...callNoteForm, call_duration_minutes: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Participants</Label>
                  <Input
                    value={callNoteForm.participants}
                    onChange={(e) => setCallNoteForm({ ...callNoteForm, participants: e.target.value })}
                    placeholder="List participants"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Notes *</Label>
                  <Textarea
                    value={callNoteForm.notes}
                    onChange={(e) => setCallNoteForm({ ...callNoteForm, notes: e.target.value })}
                    rows={4}
                    placeholder="Call notes..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Action Items</Label>
                  <Textarea
                    value={callNoteForm.action_items}
                    onChange={(e) => setCallNoteForm({ ...callNoteForm, action_items: e.target.value })}
                    rows={2}
                    placeholder="Action items from the call"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCallNoteForm(false);
                      setCallNoteForm({ call_date: '', call_duration_minutes: '', participants: '', notes: '', action_items: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (callNoteForm.call_date && callNoteForm.notes.trim()) {
                        setFormData({
                          ...formData,
                          call_notes: [...formData.call_notes, { ...callNoteForm }]
                        });
                        setCallNoteForm({ call_date: '', call_duration_minutes: '', participants: '', notes: '', action_items: '' });
                        setShowCallNoteForm(false);
                      }
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Add Call Note
                  </Button>
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
              Credentials Management ({formData.credentials.length})
            </CardTitle>
            <CardDescription>Store login info, API keys, and credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.credentials.length > 0 && (
              <div className="space-y-2">
                {formData.credentials.map((cred, index) => {
                  const isVisible = visibleCredentials[index];
                  return (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{cred.service_name}</div>
                          <div className="text-xs text-muted-foreground">{cred.credential_type}</div>
                          {cred.url && <div className="text-xs text-muted-foreground">{cred.url}</div>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCredentialVisibility(index)}
                            title={isVisible ? "Hide details" : "Show details"}
                          >
                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newCreds = [...formData.credentials];
                              newCreds.splice(index, 1);
                              setFormData({ ...formData, credentials: newCreds });
                              const newVisible = { ...visibleCredentials };
                              delete newVisible[index];
                              setVisibleCredentials(newVisible);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {isVisible && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {cred.username && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Username</Label>
                              <div className="text-sm font-mono bg-muted p-2 rounded">{cred.username}</div>
                            </div>
                          )}
                          {cred.password && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Password</Label>
                              <div className="text-sm font-mono bg-muted p-2 rounded">
                                {decryptCredential(cred.password)}
                              </div>
                            </div>
                          )}
                          {cred.api_key && (
                            <div>
                              <Label className="text-xs text-muted-foreground">API Key</Label>
                              <div className="text-sm font-mono bg-muted p-2 rounded break-all">
                                {decryptCredential(cred.api_key)}
                              </div>
                            </div>
                          )}
                          {cred.notes && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Notes</Label>
                              <div className="text-sm bg-muted p-2 rounded">{cred.notes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {!showCredentialForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCredentialForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Credential
              </Button>
            ) : (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Credential Type</Label>
                    <Select
                      value={credentialForm.credential_type}
                      onValueChange={(value) => setCredentialForm({ ...credentialForm, credential_type: value })}
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
                      value={credentialForm.service_name}
                      onChange={(e) => setCredentialForm({ ...credentialForm, service_name: e.target.value })}
                      placeholder="Enter service name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Username</Label>
                    <Input
                      value={credentialForm.username}
                      onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={credentialForm.password}
                      onChange={(e) => setCredentialForm({ ...credentialForm, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>URL</Label>
                  <Input
                    value={credentialForm.url}
                    onChange={(e) => setCredentialForm({ ...credentialForm, url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={credentialForm.api_key}
                    onChange={(e) => setCredentialForm({ ...credentialForm, api_key: e.target.value })}
                    placeholder="Enter API key"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={credentialForm.notes}
                    onChange={(e) => setCredentialForm({ ...credentialForm, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCredentialForm(false);
                      setCredentialForm({ credential_type: 'Login', service_name: '', username: '', password: '', url: '', api_key: '', notes: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (credentialForm.service_name.trim()) {
                        // Encrypt sensitive fields before storing
                        const encryptedCred = {
                          ...credentialForm,
                          password: credentialForm.password ? encryptCredential(credentialForm.password) : '',
                          api_key: credentialForm.api_key ? encryptCredential(credentialForm.api_key) : '',
                        };
                        setFormData({
                          ...formData,
                          credentials: [...formData.credentials, encryptedCred]
                        });
                        setCredentialForm({ credential_type: 'Login', service_name: '', username: '', password: '', url: '', api_key: '', notes: '' });
                        setShowCredentialForm(false);
                      } else {
                        toast({
                          title: "Validation Error",
                          description: "Service name is required",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Credential
                  </Button>
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
              Daily Status Entry ({formData.daily_status.length})
            </CardTitle>
            <CardDescription>Track daily work hours and minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.daily_status.length > 0 && (
              <div className="space-y-2">
                {formData.daily_status.map((status, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{status.work_date ? formatDate(status.work_date) : 'No date'}</div>
                        <div className="text-xs text-muted-foreground">
                          {status.hours_worked || 0}h {status.minutes_worked || 0}m
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
                    {status.tasks_completed && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Tasks: </span>
                        <span className="text-muted-foreground">{status.tasks_completed}</span>
                      </div>
                    )}
                    {status.blockers && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-destructive">Blockers: </span>
                        <span className="text-muted-foreground">{status.blockers}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {!showDailyStatusForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDailyStatusForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Daily Status
              </Button>
            ) : (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Work Date</Label>
                    <DatePicker
                      value={dailyStatusForm.work_date}
                      onChange={(date) => setDailyStatusForm({ ...dailyStatusForm, work_date: date })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      value={dailyStatusForm.hours_worked}
                      onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, hours_worked: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={dailyStatusForm.minutes_worked}
                      onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, minutes_worked: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Work Description</Label>
                  <Textarea
                    value={dailyStatusForm.work_description}
                    onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, work_description: e.target.value })}
                    rows={3}
                    placeholder="Describe the work done..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tasks Completed</Label>
                  <Textarea
                    value={dailyStatusForm.tasks_completed}
                    onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, tasks_completed: e.target.value })}
                    rows={2}
                    placeholder="List completed tasks..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Blockers</Label>
                  <Textarea
                    value={dailyStatusForm.blockers}
                    onChange={(e) => setDailyStatusForm({ ...dailyStatusForm, blockers: e.target.value })}
                    rows={2}
                    placeholder="List any blockers..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDailyStatusForm(false);
                      setDailyStatusForm({ work_date: new Date().toISOString().split('T')[0], hours_worked: '', minutes_worked: '', work_description: '', tasks_completed: '', blockers: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (dailyStatusForm.work_date && (dailyStatusForm.hours_worked || dailyStatusForm.minutes_worked)) {
                        setFormData({
                          ...formData,
                          daily_status: [...formData.daily_status, { ...dailyStatusForm }]
                        });
                        setDailyStatusForm({ work_date: new Date().toISOString().split('T')[0], hours_worked: '', minutes_worked: '', work_description: '', tasks_completed: '', blockers: '' });
                        setShowDailyStatusForm(false);
                      } else {
                        toast({
                          title: "Validation Error",
                          description: "Work date and at least hours or minutes are required",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Daily Status
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Notes & Technology Tab */}
          <TabsContent value="notes" className="space-y-6">
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
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/projects')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
