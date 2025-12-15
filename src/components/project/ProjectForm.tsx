import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, MessageSquare, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { projectsApi, usersApi, employeesApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { Loader2 } from "lucide-react";

type Milestone = {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

interface ProjectFormProps {
  projectId?: number;
  mode: 'create' | 'edit';
}

interface ProjectFormData {
  name: string;
  description: string;
  estimated_delivery_plan: string;
  logo_url: string;
  is_internal: boolean;
  client_name: string;
  client_contact_person: string;
  client_email: string;
  client_phone: string;
  start_date: string;
  end_date: string;
  status: string;
  risk_level: string;
  priority: string;
  technologies_used: string[];
  team_lead_id: string;
  member_ids: string[];
  member_roles: Record<string, string>;
  milestones: Milestone[];
  comments: Array<{ comment: string; comment_type: string; is_internal: boolean }>;
  github_repo_url: string;
  bitbucket_repo_url: string;
}

interface ValidationErrors {
  [key: string]: string;
}

// Mandatory field label component
const MandatoryLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
  <Label htmlFor={htmlFor} className="text-red-500">
    {children} *
  </Label>
);

export default function ProjectForm({ projectId, mode }: ProjectFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ProjectFormData>({
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
    status: "Not Started",
    risk_level: "",
    priority: "",
    technologies_used: [],
    team_lead_id: "",
    member_ids: [],
    member_roles: {},
    milestones: [],
    comments: [],
    github_repo_url: "",
    bitbucket_repo_url: "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentForm, setCommentForm] = useState({ comment: '', comment_type: 'General', is_internal: true });

  // Fetch project data for edit mode
  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(Number(projectId)),
    enabled: mode === 'edit' && !!projectId && !isNaN(Number(projectId)) && Number(projectId) > 0,
  });

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
    if (!formData.team_lead_id) {
      return [];
    }
    
    const selectedTeamLeadUser = allUsers.find((u: any) => u.id.toString() === formData.team_lead_id);
    if (!selectedTeamLeadUser) {
      return [];
    }
    
    const teamLeadEmployee = allEmployees.find((emp: any) => 
      emp.user_id === selectedTeamLeadUser.id
    );
    
    if (!teamLeadEmployee) {
      return [];
    }
    
    const teamEmployees = allEmployees.filter((emp: any) => 
      emp.team_lead_id && emp.team_lead_id === teamLeadEmployee.id
    );
    
    const teamEmployeeUserIds = teamEmployees.map((emp: any) => emp.user_id).filter(Boolean);
    
    return allUsers.filter((user: any) => 
      teamEmployeeUserIds.includes(user.id) && 
      ['Developer', 'Designer', 'Tester'].includes(user.role)
    );
  }, [formData.team_lead_id, allUsers, allEmployees]);

  // Load project data into form for edit mode
  useEffect(() => {
    if (mode === 'edit' && projectData?.data) {
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
        status: project.status || "Not Started",
        risk_level: project.risk_level || "",
        priority: project.priority || "",
        technologies_used: project.technologies_used ? (Array.isArray(project.technologies_used) ? project.technologies_used : JSON.parse(project.technologies_used)) : [],
        team_lead_id: project.team_lead_id?.toString() || "",
        member_ids: project.member_ids || [],
        member_roles: project.member_roles || {},
        milestones: project.milestones || [],
        comments: [],
        github_repo_url: project.github_repo_url || "",
        bitbucket_repo_url: project.bitbucket_repo_url || "",
      });
    }
  }, [projectData, mode]);

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    }

    if (mode === 'create' && !formData.is_internal) {
      if (!formData.client_name.trim()) {
        newErrors.client_name = "Client name is required for external projects";
      }
      if (!formData.client_contact_person.trim()) {
        newErrors.client_contact_person = "Client contact person is required";
      }
      if (!formData.client_email.trim()) {
        newErrors.client_email = "Client email is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await projectsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: "Success", description: "Project created successfully." });
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await projectsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast({ title: "Success", description: "Project updated successfully." });
      navigate(`/projects/${projectId}`);
    },
    onError: (error: any) => {
      logger.error('Project update error:', error);
      const errorMessage = error?.response?.data?.error || 
                          error?.response?.data?.message || 
                          error?.message || 
                          "Failed to update project.";
      const errorDetails = error?.response?.data?.details || '';
      toast({ 
        title: "Error", 
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Convert member_ids from strings to numbers for API
    const memberIds = formData.member_ids
      .filter(id => id && id !== '')
      .map(id => Number(id))
      .filter(id => !isNaN(id));

    // Ensure member_roles has both string and number keys for compatibility
    const memberRoles: Record<string, string> = {};
    memberIds.forEach(userId => {
      const userIdStr = userId.toString();
      const role = formData.member_roles[userIdStr] || formData.member_roles[userId] || 'employee';
      // Store with both string and number keys
      memberRoles[userIdStr] = role;
      memberRoles[userId] = role;
    });

    const submitData: any = {
      ...formData,
      team_lead_id: formData.team_lead_id && formData.team_lead_id.trim() !== '' 
        ? Number(formData.team_lead_id) 
        : null,
      member_ids: memberIds,
      member_roles: memberRoles,
      milestones: formData.milestones.filter(m => m.name),
      technologies_used: formData.technologies_used,
    };
    
    // Remove comments as they're not part of project update
    delete submitData.comments;

    if (mode === 'create') {
      createMutation.mutate(submitData);
    } else {
      updateMutation.mutate({ id: Number(projectId), data: submitData });
    }
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

  if (mode === 'edit') {
    // Check if projectId is valid
    if (!projectId || isNaN(Number(projectId)) || Number(projectId) <= 0) {
      return (
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="text-destructive">Invalid project ID.</div>
            <Button onClick={() => navigate('/projects')} variant="outline">
              Back to Projects
            </Button>
          </div>
        </div>
      );
    }
    
    // Check for loading state
    if (isLoading) {
      return (
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      );
    }
    
    // Check for error state
    if (error || !projectData?.data) {
      return (
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="text-destructive">
              {error ? `Error loading project details: ${error instanceof Error ? error.message : 'Unknown error'}` : 'Project not found.'}
            </div>
            <Button onClick={() => navigate('/projects')} variant="outline">
              Back to Projects
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {mode === 'create' ? 'Create New Project' : 'Edit Project'}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'create' ? 'Fill in all project details' : 'Update project information'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Project name, description, and logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              {mode === 'create' ? (
                <MandatoryLabel htmlFor="name">Project Name</MandatoryLabel>
              ) : (
                <Label htmlFor="name">Project Name</Label>
              )}
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) {
                    const newErrors = { ...errors };
                    delete newErrors.name;
                    setErrors(newErrors);
                  }
                }}
                onBlur={() => {
                  if (!formData.name.trim() && mode === 'create') {
                    setErrors({ ...errors, name: "Project name is required" });
                  }
                }}
                placeholder="Enter project name"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
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
            <CardDescription>Client information (optional if internal project)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_internal"
                checked={formData.is_internal}
                onChange={(e) => setFormData({ ...formData, is_internal: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_internal">Internal Project</Label>
            </div>
            {!formData.is_internal && (
              <>
                <div className="grid gap-2">
                  {mode === 'create' ? (
                    <MandatoryLabel htmlFor="client_name">Client Name</MandatoryLabel>
                  ) : (
                    <Label htmlFor="client_name">Client Name</Label>
                  )}
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => {
                      setFormData({ ...formData, client_name: e.target.value });
                      if (errors.client_name) {
                        const newErrors = { ...errors };
                        delete newErrors.client_name;
                        setErrors(newErrors);
                      }
                    }}
                    onBlur={() => {
                      if (!formData.client_name.trim() && mode === 'create' && !formData.is_internal) {
                        setErrors({ ...errors, client_name: "Client name is required" });
                      }
                    }}
                    placeholder="Enter client name"
                    className={errors.client_name ? "border-destructive" : ""}
                  />
                  {errors.client_name && (
                    <p className="text-sm text-destructive">{errors.client_name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  {mode === 'create' ? (
                    <MandatoryLabel htmlFor="client_contact_person">Client Contact Person</MandatoryLabel>
                  ) : (
                    <Label htmlFor="client_contact_person">Client Contact Person</Label>
                  )}
                  <Input
                    id="client_contact_person"
                    value={formData.client_contact_person}
                    onChange={(e) => {
                      setFormData({ ...formData, client_contact_person: e.target.value });
                      if (errors.client_contact_person) {
                        const newErrors = { ...errors };
                        delete newErrors.client_contact_person;
                        setErrors(newErrors);
                      }
                    }}
                    onBlur={() => {
                      if (!formData.client_contact_person.trim() && mode === 'create' && !formData.is_internal) {
                        setErrors({ ...errors, client_contact_person: "Client contact person is required" });
                      }
                    }}
                    placeholder="Enter contact person name"
                    className={errors.client_contact_person ? "border-destructive" : ""}
                  />
                  {errors.client_contact_person && (
                    <p className="text-sm text-destructive">{errors.client_contact_person}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  {mode === 'create' ? (
                    <MandatoryLabel htmlFor="client_email">Client Email</MandatoryLabel>
                  ) : (
                    <Label htmlFor="client_email">Client Email</Label>
                  )}
                  <Input
                    id="client_email"
                    type="text"
                    value={formData.client_email}
                    onChange={(e) => {
                      setFormData({ ...formData, client_email: e.target.value });
                      if (errors.client_email) {
                        const newErrors = { ...errors };
                        delete newErrors.client_email;
                        setErrors(newErrors);
                      }
                    }}
                    onBlur={() => {
                      if (!formData.client_email.trim() && mode === 'create' && !formData.is_internal) {
                        setErrors({ ...errors, client_email: "Client email is required" });
                      }
                    }}
                    placeholder="client@example.com"
                    className={errors.client_email ? "border-destructive" : ""}
                  />
                  {errors.client_email && (
                    <p className="text-sm text-destructive">{errors.client_email}</p>
                  )}
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

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
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
                onValueChange={(value) => {
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
                    <input
                      type="checkbox"
                      id="is_internal_comment"
                      checked={commentForm.is_internal}
                      onChange={(e) => setCommentForm({ ...commentForm, is_internal: e.target.checked })}
                      className="rounded"
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

        {/* Technologies Used */}
        <Card>
          <CardHeader>
            <CardTitle>Technologies Used</CardTitle>
            <CardDescription>Select technologies used in this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Technologies</Label>
              <div className="mt-2">
                <Input
                  placeholder="Enter technologies used (press Enter to add each technology)"
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
              <Label htmlFor="github_repo_url">Code Repo URL (Frontend)</Label>
              <Input
                id="github_repo_url"
                value={formData.github_repo_url}
                onChange={(e) => setFormData({ ...formData, github_repo_url: e.target.value })}
                placeholder="https://github.com/username/repo or https://bitbucket.org/username/repo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bitbucket_repo_url">Code Repo URL (Backend)</Label>
              <Input
                id="bitbucket_repo_url"
                value={formData.bitbucket_repo_url}
                onChange={(e) => setFormData({ ...formData, bitbucket_repo_url: e.target.value })}
                placeholder="https://github.com/username/repo or https://bitbucket.org/username/repo"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/projects')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending 
              ? (mode === 'create' ? "Creating..." : "Saving...") 
              : (mode === 'create' ? "Create Project" : "Save Changes")}
          </Button>
        </div>
      </form>
    </div>
  );
}
