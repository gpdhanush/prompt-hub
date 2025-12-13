import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash2, Users, Calendar, User, FileText, Clock, CheckCircle2, Mail, Phone, AlertTriangle, Flag, Github, Link as LinkIcon, FileCheck, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, projectStatusMap } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { projectsApi, usersApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { ProjectTabs } from "@/components/project/ProjectTabs";

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get current user info for role-based permissions
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';

  // Permissions
  const canEditProject = ['Admin', 'Team Lead', 'Super Admin'].includes(userRole);
  const canDeleteProject = ['Super Admin', 'Team Lead'].includes(userRole);

  // Fetch project details
  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(Number(id)),
  });

  // Fetch users for member names
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  const project = projectData?.data;
  const allUsers = usersData?.data || [];

  const formatFullDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", { 
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", { 
      year: "numeric",
      month: "short", 
      day: "numeric"
    });
  };

  const calculateProgress = (project: any) => {
    if (!project.start_date || !project.end_date) return 0;
    const start = new Date(project.start_date).getTime();
    const end = new Date(project.end_date).getTime();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const handleEdit = () => {
    navigate(`/projects/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      await projectsApi.delete(Number(id));
      toast({
        title: "Success",
        description: "Project deleted successfully.",
      });
      navigate('/projects');
    } catch (error: any) {
      logger.error('Error deleting project:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      });
    }
  };

  // Get member names and roles from user IDs
  const getMemberDetails = () => {
    if (!project?.member_ids || !Array.isArray(project.member_ids)) return [];
    return project.member_ids
      .map((memberId: string | number) => {
        const userId = typeof memberId === 'string' ? parseInt(memberId) : memberId;
        const user = allUsers.find((u: any) => u.id === userId || u.id.toString() === memberId.toString());
        
        // Try both string and number keys for member_roles
        const role = project.member_roles?.[memberId] || 
                     project.member_roles?.[userId] || 
                     project.member_roles?.[memberId.toString()] || 
                     project.member_roles?.[userId.toString()] || 
                     'employee';
        
        // If user not found in allUsers, still return basic info
        if (!user) {
          return {
            id: userId,
            name: `User ${userId}`,
            email: '',
            role: role
          };
        }
        
        return { ...user, role };
      })
      .filter(Boolean);
  };

  const memberDetails = getMemberDetails();
  const progress = project?.progress || (project ? calculateProgress(project) : 0);
  
  const formatTime = (timeString?: string) => {
    if (!timeString) return "Not set";
    return timeString;
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

  if (error || !project) {
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="default"
            size="icon"
            onClick={() => navigate('/projects')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Project Details</h1>
            <p className="font-mono text-primary font-semibold text-xl">
              {project.project_code || `PRJ-${String(project.id).padStart(3, '0')}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditProject && (
            <Button onClick={handleEdit} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
          )}
          {canDeleteProject && (
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                {project.logo_url && (
                  <img src={project.logo_url} alt="Project Logo" className="h-16 w-16 rounded object-cover" />
                )}
                <div>
                  <CardTitle>{project.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {project.project_code || `PRJ-${String(project.id).padStart(3, '0')}`}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <Label className="text-muted-foreground text-sm">Description</Label>
                  <div className="text-sm whitespace-pre-wrap mt-1">
                    {project.description}
                  </div>
                </div>
              )}
              {project.estimated_delivery_plan && (
                <div>
                  <Label className="text-muted-foreground text-sm">Estimated Delivery Plan</Label>
                  <div className="text-sm whitespace-pre-wrap mt-1">
                    {project.estimated_delivery_plan}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Details */}
          {!project.is_internal && (project.client_name || project.client_email) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.client_name && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Client Name</Label>
                    <div className="text-sm font-medium mt-1">{project.client_name}</div>
                  </div>
                )}
                {project.client_contact_person && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Contact Person</Label>
                    <div className="text-sm font-medium mt-1">{project.client_contact_person}</div>
                  </div>
                )}
                {project.client_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground text-sm">Email</Label>
                      <div className="text-sm font-medium">{project.client_email}</div>
                    </div>
                  </div>
                )}
                {project.client_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground text-sm">Phone</Label>
                      <div className="text-sm font-medium">{project.client_phone}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline & Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline & Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Start Date</Label>
                  <div className="text-sm font-medium mt-1">
                    {formatDate(project.start_date)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Target End Date</Label>
                  <div className="text-sm font-medium mt-1">
                    {formatDate(project.end_date || project.target_end_date)}
                  </div>
                </div>
                {project.target_end_date && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Target End Date (Alt)</Label>
                    <div className="text-sm font-medium mt-1">
                      {formatDate(project.target_end_date)}
                    </div>
                  </div>
                )}
                {project.actual_end_date && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Actual End Date</Label>
                    <div className="text-sm font-medium mt-1">
                      {formatDate(project.actual_end_date)}
                    </div>
                  </div>
                )}
                {project.project_duration_days && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-sm">Project Duration</Label>
                    <div className="text-sm font-medium mt-1">
                      {project.project_duration_days} days
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          {project.milestones && project.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Milestones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.milestones.map((milestone: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{milestone.name}</h4>
                      <StatusBadge 
                        variant={milestone.status === 'Completed' ? 'success' : milestone.status === 'Delayed' ? 'warning' : 'neutral'}
                        className="text-xs"
                      >
                        {milestone.status}
                      </StatusBadge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground text-xs">Start Date</Label>
                        <div className="font-medium">{formatDate(milestone.start_date)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">End Date</Label>
                        <div className="font-medium">{formatDate(milestone.end_date)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Additional Notes */}
          {(project.internal_notes || project.client_notes || project.admin_remarks) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.internal_notes && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Internal Notes</Label>
                    <div className="text-sm whitespace-pre-wrap mt-1 p-3 bg-muted rounded">
                      {project.internal_notes}
                    </div>
                  </div>
                )}
                {project.client_notes && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Client Notes</Label>
                    <div className="text-sm whitespace-pre-wrap mt-1 p-3 bg-muted rounded">
                      {project.client_notes}
                    </div>
                  </div>
                )}
                {project.admin_remarks && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Admin Remarks</Label>
                    <div className="text-sm whitespace-pre-wrap mt-1 p-3 bg-muted rounded">
                      {project.admin_remarks}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Integrations */}
          {(project.github_repo_url || project.bitbucket_repo_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Integrations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {project.github_repo_url && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <a href={project.github_repo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      {project.github_repo_url}
                    </a>
                  </div>
                )}
                {project.bitbucket_repo_url && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <a href={project.bitbucket_repo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      {project.bitbucket_repo_url}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status & Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Status & Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div>
                  <StatusBadge 
                    variant={projectStatusMap[project.status as keyof typeof projectStatusMap] || 'neutral'}
                    className="text-xs px-2.5 py-0.5 w-fit"
                  >
                    {project.status || 'Not Started'}
                  </StatusBadge>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Progress</Label>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-xs font-medium">{progress}%</span>
                </div>
              </div>
              {project.risk_level && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Risk Level
                  </Label>
                  <div>
                    <StatusBadge 
                      variant={project.risk_level === 'High' ? 'error' : project.risk_level === 'Medium' ? 'warning' : 'success'}
                      className="text-xs"
                    >
                      {project.risk_level}
                    </StatusBadge>
                  </div>
                </div>
              )}
              {project.priority && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Priority
                  </Label>
                  <div>
                    <StatusBadge 
                      variant={(project.priority === 'Critical' ? 'error' : project.priority === 'High' ? 'warning' : 'neutral') as 'error' | 'warning' | 'neutral'}
                      className="text-xs"
                    >
                      {project.priority}
                    </StatusBadge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Task Reporting */}
          {project.daily_reporting_required && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Daily Reporting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Submission Time: </span>
                  <span className="font-medium">{formatTime(project.report_submission_time)}</span>
                </div>
                {project.auto_reminder_notifications && (
                  <div className="text-sm text-muted-foreground">
                    Auto-reminders enabled
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Team Lead */}
          <Card>
            <CardHeader>
              <CardTitle>Team Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{project.team_lead_name || 'Unassigned'}</div>
                  {project.team_lead_email && (
                    <div className="text-xs text-muted-foreground">{project.team_lead_email}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members - Always visible to all users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({memberDetails.length > 0 ? memberDetails.length : (project?.member_ids?.length || 0)})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memberDetails.length > 0 ? (
                <div className="space-y-2">
                  {memberDetails.map((member: any, index: number) => (
                    <div key={member.id || index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          {member.email && (
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          )}
                        </div>
                      </div>
                      <StatusBadge variant="neutral" className="text-xs">
                        {member.role === 'tl' ? 'TL' : member.role === 'developer' ? 'Dev' : member.role === 'qa' ? 'QA' : member.role === 'designer' ? 'Designer' : 'Employee'}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              ) : project?.member_ids && project.member_ids.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  {project.member_ids.length} member(s) assigned, but user details are not available.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No members assigned</div>
              )}
            </CardContent>
          </Card>

          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-sm">Created By</Label>
                <div className="text-sm">{project.created_by_name || 'N/A'}</div>
                {project.created_at && (
                  <div className="text-xs text-muted-foreground">
                    {formatFullDate(project.created_at)}
                  </div>
                )}
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label className="text-muted-foreground text-sm">Last Updated By</Label>
                <div className="text-sm">
                  {project.updated_by_name || project.created_by_name || 'N/A'}
                </div>
                {project.updated_at && (
                  <div className="text-xs text-muted-foreground">
                    {formatFullDate(project.updated_at)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Tabs for Advanced Features */}
      <ProjectTabs projectId={Number(id)} project={project} canEdit={canEditProject} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              {project.project_code && ` ${project.project_code}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
