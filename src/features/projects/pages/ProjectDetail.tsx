import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash2, Users, Calendar, User, FileText, Clock, CheckCircle2, Mail, Phone, AlertTriangle, Github, Link as LinkIcon, FileCheck, MessageSquare, Upload, X, MoreHorizontal, Eye, EyeOff, Pencil, Trash, Calendar as CalendarIcon } from "lucide-react";
import { AttachmentList } from "@/components/ui/attachment-list";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge, projectStatusMap } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { projectsApi } from "@/features/projects/api";
import { ProjectCommentsSection } from "@/features/projects/components/ProjectCommentsSection";
import { usersApi } from "@/features/users/api";
import { employeesApi } from "@/features/employees/api";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { getImageUrl, getProfilePhotoUrl } from "@/lib/imageUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logger } from "@/lib/logger";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
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

// Comment Item Component
function CommentItem({ comment, projectId }: { comment: any; projectId: number }) {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState(comment.comment);
  const [editCommentType, setEditCommentType] = useState(comment.comment_type);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const canEdit = currentUser?.id === comment.user_id || ['Admin', 'Super Admin', 'Team Lead'].includes(currentUser?.role || '');
  
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
  
  return (
    <div className="p-3 border rounded">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium">{comment.user_name || 'Unknown User'}</div>
          <div className="text-sm text-muted-foreground">
            {comment.created_at ? formatFullDate(comment.created_at) : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant="neutral">{comment.comment_type}</StatusBadge>
          {canEdit && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-2 mt-2">
          <Select value={editCommentType} onValueChange={setEditCommentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Developer">Developer</SelectItem>
              <SelectItem value="Tester">Tester</SelectItem>
              <SelectItem value="Designer">Designer</SelectItem>
              <SelectItem value="Team Lead">Team Lead</SelectItem>
              <SelectItem value="Client">Client</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                try {
                  await projectsApi.updateComment(projectId, comment.id, {
                    comment: editComment,
                    comment_type: editCommentType
                  });
                  toast({
                    title: "Success",
                    description: "Comment updated successfully.",
                  });
                  setIsEditing(false);
                  queryClient.invalidateQueries({ queryKey: ['project-comments', projectId] });
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to update comment.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setEditComment(comment.comment);
                setEditCommentType(comment.comment_type);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm">{comment.comment}</p>
      )}
      
      {/* Delete Comment Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await projectsApi.deleteComment(projectId, comment.id);
                  toast({
                    title: "Success",
                    description: "Comment deleted successfully.",
                  });
                  queryClient.invalidateQueries({ queryKey: ['project-comments', projectId] });
                  setShowDeleteDialog(false);
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to delete comment.",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeDescriptionTab, setActiveDescriptionTab] = useState("description");

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Get current user info
  const currentUser = getCurrentUser();
  const isClient = currentUser?.role === 'CLIENT' || currentUser?.role === 'Client';
  
  // Use permission-based checks instead of role-based checks
  const { hasPermission } = usePermissions();
  const canEditProject = hasPermission('projects.edit');
  const canDeleteProject = hasPermission('projects.delete');

  // Check if id is UUID or numeric
  const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const projectId = isUUID ? id : (id ? Number(id) : null);
  
  // Fetch project details
  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => {
      if (!projectId) {
        throw new Error('Invalid project ID');
      }
      return projectsApi.getById(projectId);
    },
    enabled: !!projectId && (isUUID || !isNaN(Number(id))),
    staleTime: 0, // Always refetch when query is invalidated
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Get numeric project ID from project data (for API calls that need numeric ID)
  // If UUID was used, get numeric ID from fetched project data
  const numericProjectId = projectData?.data?.id || (isUUID ? null : projectId);

  // Fetch users for member names - use for-dropdown endpoint which doesn't require full permission
  const { data: usersData } = useQuery({
    queryKey: ['users-for-dropdown'],
    queryFn: () => usersApi.getForDropdown({ limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch employees to get profile photos
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-project'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000, include_all: 'true' }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch additional project data (only after project is loaded and we have numeric ID)
  const { data: filesData } = useQuery({
    queryKey: ['project-files', numericProjectId],
    queryFn: () => {
      if (!numericProjectId) {
        throw new Error('Project ID not available');
      }
      return projectsApi.getFiles(numericProjectId);
    },
    enabled: !!numericProjectId && !!projectData?.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: workedTimeData } = useQuery({
    queryKey: ['project-worked-time', numericProjectId],
    queryFn: () => {
      if (!numericProjectId) {
        throw new Error('Project ID not available');
      }
      return projectsApi.getTotalWorkedTime(numericProjectId);
    },
    enabled: !!numericProjectId && !!projectData?.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['project-comments', numericProjectId],
    queryFn: () => {
      if (!numericProjectId) {
        throw new Error('Project ID not available');
      }
      return projectsApi.getComments(numericProjectId);
    },
    enabled: !!numericProjectId && !!projectData?.data,
    staleTime: 1000 * 60 * 2, // 2 minutes (comments may change more frequently)
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const { data: callNotesData } = useQuery({
    queryKey: ['project-call-notes', numericProjectId],
    queryFn: () => {
      if (!numericProjectId) {
        throw new Error('Project ID not available');
      }
      return projectsApi.getCallNotes(numericProjectId);
    },
    enabled: !!numericProjectId && !!projectData?.data,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const project = projectData?.data;
  const allUsers = usersData?.data || [];
  const allEmployees = employeesData?.data || [];
  const files = filesData?.data || [];
  const callNotes = callNotesData?.data || [];
  const workedTime = workedTimeData?.data 
    ? {
        total_hours: typeof workedTimeData.data.total_hours === 'number' 
          ? workedTimeData.data.total_hours 
          : parseFloat(workedTimeData.data.total_hours) || 0,
        total_minutes: typeof workedTimeData.data.total_minutes === 'number'
          ? workedTimeData.data.total_minutes
          : parseInt(workedTimeData.data.total_minutes) || 0,
        unique_contributors: typeof workedTimeData.data.unique_contributors === 'number'
          ? workedTimeData.data.unique_contributors
          : parseInt(workedTimeData.data.unique_contributors) || 0,
      }
    : { total_hours: 0, total_minutes: 0, unique_contributors: 0 };

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

  const handleEdit = () => {
    const basePath = currentUser?.role === 'CLIENT' || currentUser?.role === 'Client' ? '/client/projects' : '/projects';
    navigate(`${basePath}/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      if (!numericProjectId) {
        throw new Error('Project ID not available');
      }
      await projectsApi.delete(numericProjectId);
      // Invalidate and refetch all project queries to immediately reflect changes
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.refetchQueries({ queryKey: ['projects'] });
      toast({
        title: "Success",
        description: "Project deleted successfully.",
      });
      const basePath = currentUser?.role === 'CLIENT' || currentUser?.role === 'Client' ? '/client/projects' : '/projects';
      navigate(basePath);
    } catch (error: any) {
      logger.error('Error deleting project:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      });
    }
  };

  // Get member names and roles from user IDs, including profile photos
  const getMemberDetails = () => {
    if (!project?.member_ids || !Array.isArray(project.member_ids)) return [];
    return project.member_ids
      .map((memberId: string | number) => {
        const userId = typeof memberId === 'string' ? parseInt(memberId) : memberId;
        const user = allUsers.find((u: any) => u.id === userId || u.id.toString() === memberId.toString());
        
        // Find employee record to get profile photo
        const employee = allEmployees.find((emp: any) => emp.user_id === userId);
        
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
            role: role,
            profile_photo_url: employee?.profile_photo_url || null
          };
        }
        
        return { 
          ...user, 
          role,
          profile_photo_url: employee?.profile_photo_url || null
        };
      })
      .filter(Boolean);
  };

  const memberDetails = getMemberDetails();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project details...</p>
          </div>
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
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="default"
            size="icon"
            onClick={() => navigate("/projects")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {project.logo_url && getImageUrl(project.logo_url) && (
            <img
              src={getImageUrl(project.logo_url)!}
              alt="Project Logo"
              className="h-12 w-12 rounded object-cover border"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="font-mono text-primary font-semibold text-md">
              {project.project_code ||
                `PRJ-${String(project.id).padStart(3, "0")}`}
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
              <CardTitle>{project.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* First Row: Priority, Status, Risk Level, Technologies in 4 columns */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Priority
                  </Label>
                  <div className="mt-1">
                    {project.priority ? (
                      <StatusBadge
                        variant={
                          (project.priority === "Critical"
                            ? "error"
                            : project.priority === "High"
                            ? "warning"
                            : "neutral") as "error" | "warning" | "neutral"
                        }
                        className="text-xs"
                      >
                        {project.priority}
                      </StatusBadge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not set
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Project Status
                  </Label>
                  <div className="mt-1">
                    <StatusBadge
                      variant={
                        projectStatusMap[
                          project.status as keyof typeof projectStatusMap
                        ] || "neutral"
                      }
                      className="text-xs"
                    >
                      {project.status || "Not Started"}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Risk Level
                  </Label>
                  <div className="mt-1">
                    {project.risk_level ? (
                      <StatusBadge
                        variant={
                          project.risk_level === "High"
                            ? "error"
                            : project.risk_level === "Medium"
                            ? "warning"
                            : "success"
                        }
                        className="text-xs"
                      >
                        {project.risk_level}
                      </StatusBadge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not set
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Technologies Used
                  </Label>
                  <div className="mt-1">
                    {project.technologies_used ? (
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(project.technologies_used)
                          ? project.technologies_used
                          : typeof project.technologies_used === "string"
                          ? JSON.parse(project.technologies_used || "[]")
                          : []
                        ).map((tech: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not set
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {project.estimated_delivery_plan && (
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Estimated Delivery Plan
                  </Label>
                  <div className="text-sm whitespace-pre-wrap mt-1">
                    {project.estimated_delivery_plan}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description Section with Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeDescriptionTab}
                onValueChange={setActiveDescriptionTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4 bg-muted/50">
                  <TabsTrigger
                    value="description"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Description
                  </TabsTrigger>
                  <TabsTrigger
                    value="files"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Project Files ({files.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="call-notes"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Client Call Notes ({callNotes.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="comments"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Comments
                  </TabsTrigger>
                </TabsList>

                {/* Description Tab */}
                <TabsContent value="description" className="mt-4">
                  {project.description ? (
                    <div className="text-sm p-4 bg-muted/30 rounded-md border max-h-[600px] overflow-y-auto">
                      <MarkdownRenderer content={project.description} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No description provided
                    </p>
                  )}
                </TabsContent>

                {/* Project Files Tab */}
                <TabsContent value="files" className="mt-4">
                  {files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No files uploaded yet
                    </p>
                  ) : (
                    <AttachmentList
                      attachments={files.map((file: any) => ({
                        id: file.id,
                        original_filename: file.file_name,
                        filename: file.file_name,
                        path: file.file_url,
                        url: file.file_url,
                        file_url: file.file_url,
                        size: 0,
                      }))}
                      showLabel={false}
                    />
                  )}
                </TabsContent>

                {/* Client Call Notes Tab */}
                <TabsContent value="call-notes" className="mt-4">
                  {numericProjectId ? (
                    callNotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No call notes recorded
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {callNotes.map((note: any) => (
                          <Card key={note.id}>
                            <CardContent className="pt-6">
                              <div className="mb-3">
                                <div className="text-base font-semibold">
                                  {note.call_date
                                    ? new Date(note.call_date).toLocaleString()
                                    : "No date"}
                                </div>
                                {note.participants && (
                                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <User className="h-3 w-3" />
                                    Participants: {note.participants}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {note.follow_up_required
                                    ? note.follow_up_date
                                      ? `Follow-up Date: ${new Date(
                                          note.follow_up_date
                                        ).toLocaleDateString()}`
                                      : "Follow-up required"
                                    : "Follow-up: No need"}
                                </div>
                              </div>
                              {note.notes && (
                                <p className="text-sm mb-2">{note.notes}</p>
                              )}
                              {note.action_items && (
                                <div className="text-sm">
                                  <span className="font-medium">
                                    Action Items:{" "}
                                  </span>
                                  {note.action_items}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Project ID not available
                    </p>
                  )}
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="mt-4">
                  {numericProjectId ? (
                    <ProjectCommentsSection projectId={numericProjectId} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Project ID not available
                    </p>
                  )}
                </TabsContent>
              </Tabs>
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
                        variant={
                          milestone.status === "Completed"
                            ? "success"
                            : milestone.status === "Delayed"
                            ? "warning"
                            : "neutral"
                        }
                        className="text-xs"
                      >
                        {milestone.status}
                      </StatusBadge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Start Date
                        </Label>
                        <div className="font-medium">
                          {formatDate(milestone.start_date)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          End Date
                        </Label>
                        <div className="font-medium">
                          {formatDate(milestone.end_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Additional Notes */}
          {(project.internal_notes ||
            project.client_notes ||
            project.admin_remarks) && (
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
                    <Label className="text-muted-foreground text-sm">
                      Internal Notes
                    </Label>
                    <div className="text-sm whitespace-pre-wrap mt-1 p-3 bg-muted rounded">
                      {project.internal_notes}
                    </div>
                  </div>
                )}
                {project.client_notes && (
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Client Notes
                    </Label>
                    <div className="text-sm whitespace-pre-wrap mt-1 p-3 bg-muted rounded">
                      {project.client_notes}
                    </div>
                  </div>
                )}
                {project.admin_remarks && (
                  <div>
                    <Label className="text-muted-foreground text-sm">
                      Admin Remarks
                    </Label>
                    <div className="text-sm whitespace-pre-wrap mt-1 p-3 bg-muted rounded">
                      {project.admin_remarks}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Client Details - First Card */}
          {!project.is_internal &&
            (project.client_name || project.client_email) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Client Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.client_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground text-sm">
                          Client Name
                        </Label>
                        <div className="text-sm font-medium mt-1">
                          {project.client_name}
                        </div>
                      </div>
                    </div>
                  )}
                  {project.client_contact_person && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground text-sm">
                          Contact Person
                        </Label>
                        <div className="text-sm font-medium mt-1">
                          {project.client_contact_person}
                        </div>
                      </div>
                    </div>
                  )}
                  {project.client_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground text-sm">
                          Email
                        </Label>
                        <div className="text-sm font-medium">
                          {project.client_email}
                        </div>
                      </div>
                    </div>
                  )}
                  {project.client_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground text-sm">
                          Phone
                        </Label>
                        <div className="text-sm font-medium">
                          {project.client_phone}
                        </div>
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
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-sm">
                  Start Date
                </Label>
                <div className="text-sm font-medium mt-1">
                  {formatDate(project.start_date)}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">
                  End Date
                </Label>
                <div className="text-sm font-medium mt-1">
                  {formatDate(project.end_date || project.target_end_date)}
                </div>
              </div>
              {project.target_end_date && (
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Target End Date (Alt)
                  </Label>
                  <div className="text-sm font-medium mt-1">
                    {formatDate(project.target_end_date)}
                  </div>
                </div>
              )}
              {project.actual_end_date && (
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Actual End Date
                  </Label>
                  <div className="text-sm font-medium mt-1">
                    {formatDate(project.actual_end_date)}
                  </div>
                </div>
              )}
              {project.project_duration_days && (
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Project Duration
                  </Label>
                  <div className="text-sm font-medium mt-1">
                    {project.project_duration_days} days
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                    <a
                      href={project.github_repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {project.github_repo_url}
                    </a>
                  </div>
                )}
                {project.bitbucket_repo_url && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={project.bitbucket_repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {project.bitbucket_repo_url}
                    </a>
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
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={getProfilePhotoUrl(
                      project.team_lead_photo_url || null
                    )}
                    alt={project.team_lead_name || "Team Lead"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {project.team_lead_name
                      ? project.team_lead_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "TL"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">
                    {project.team_lead_name || "Unassigned"}
                  </div>
                  {project.team_lead_email && (
                    <div className="text-xs text-muted-foreground">
                      {project.team_lead_email}
                    </div>
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
                Team Members (
                {memberDetails.length > 0
                  ? memberDetails.length
                  : project?.member_ids?.length || 0}
                )
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memberDetails.length > 0 ? (
                <div className="space-y-2">
                  {memberDetails.map((member: any, index: number) => (
                    <div
                      key={member.id || index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={getProfilePhotoUrl(
                              member.profile_photo_url || null
                            )}
                            alt={member.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {member.name
                              ? member.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "E"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          {member.email && (
                            <div className="text-xs text-muted-foreground">
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <StatusBadge variant="neutral" className="text-xs">
                        {member.role === "tl"
                          ? "TL"
                          : member.role === "developer"
                          ? "Dev"
                          : member.role === "qa"
                          ? "QA"
                          : member.role === "designer"
                          ? "Designer"
                          : "Employee"}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              ) : project?.member_ids && project.member_ids.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  {project.member_ids.length} member(s) assigned, but user
                  details are not available.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No members assigned
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Project Information - Container Sections */}
      <div className="space-y-6">
        {/* Total Worked Time */}
        {(workedTime.total_hours > 0 || workedTime.total_minutes > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Total Worked Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Total Hours
                  </Label>
                  <div className="text-2xl font-bold">
                    {typeof workedTime.total_hours === "number"
                      ? workedTime.total_hours.toFixed(2)
                      : (
                          parseFloat(String(workedTime.total_hours)) || 0
                        ).toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Total Minutes
                  </Label>
                  <div className="text-2xl font-bold">
                    {typeof workedTime.total_minutes === "number"
                      ? workedTime.total_minutes
                      : parseInt(String(workedTime.total_minutes)) || 0}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Contributors
                  </Label>
                  <div className="text-2xl font-bold">
                    {typeof workedTime.unique_contributors === "number"
                      ? workedTime.unique_contributors
                      : parseInt(String(workedTime.unique_contributors)) || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              project
              {project.project_code && ` ${project.project_code}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
