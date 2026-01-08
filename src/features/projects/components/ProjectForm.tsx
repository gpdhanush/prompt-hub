import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X, MessageSquare, Save, Upload, FileText, Edit, Download, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureInput } from "@/components/ui/secure-input";
import { Label } from "@/components/ui/label";
import { SecureTextarea } from "@/components/ui/secure-textarea";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Separator } from "@/components/ui/separator";
import { projectsApi } from "@/features/projects/api";
import { employeesApi } from "@/features/employees/api";
import { usersApi } from "@/features/users/api";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { Loader2 } from "lucide-react";
import { ProjectLogoUpload } from "@/components/ui/project-logo-upload";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getImageUrl } from "@/lib/imageUtils";
import { toTitleCase } from "@/lib/utils";

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

// Comment Item Component for Edit Mode
function CommentItemEdit({ comment, projectId, queryClient }: { comment: any; projectId: number; queryClient: any }) {
  const currentUser = getCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState(comment.comment);
  const [editCommentType, setEditCommentType] = useState(comment.comment_type);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const canEdit = currentUser?.id === comment.user_id || ['Admin', 'Super Admin', 'Team Lead'].includes(currentUser?.role || '');
  
  return (
    <div className="p-3 border rounded">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium">{comment.user_name || 'Unknown User'}</div>
          <div className="text-xs text-muted-foreground">
            {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge variant="neutral">{comment.comment_type}</StatusBadge>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-7 w-7 p-1"
                aria-label="Edit comment"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-7 w-7 p-1"
                aria-label="Delete comment"
                onClick={() => setShowDeleteDialog(true)}
              >
                <X className="h-4 w-4" />
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
          <SecureTextarea
            fieldName="Comment"
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

export default function ProjectForm({ projectId: propProjectId, mode }: ProjectFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams<{ id?: string }>();
  const currentUser = getCurrentUser();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { securityAlertProps } = useSecurityValidation();
  
  // Fallback: Try to get projectId from route params if not provided as prop
  // This handles cases where the prop might be undefined; projectId may be a number or a UUID string
  const routeProjectId = params.id ?? undefined;
  const projectId = propProjectId ?? routeProjectId; // number | string | undefined
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = typeof projectId === 'string' && uuidRegex.test(projectId);

  logger.debug('ProjectForm - propProjectId:', propProjectId, 'params.id:', params.id, 'routeProjectId:', routeProjectId, 'final projectId:', projectId, 'isUUID:', isUUID);

  // Early validation for edit mode - allow UUID strings or positive numbers
  if (
    mode === 'edit' && (
      projectId === undefined || projectId === null ||
      (typeof projectId === 'string' && projectId.trim() === '') ||
      (typeof projectId === 'string' && !isUUID && (isNaN(Number(projectId)) || Number(projectId) <= 0)) ||
      (typeof projectId === 'number' && projectId <= 0)
    )
  ) {
    logger.error('ProjectForm - Invalid projectId early check:', projectId);
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive text-lg font-semibold">
            Invalid project ID: {projectId === 0 ? '0 (Project ID cannot be 0)' : projectId || 'undefined'}
          </div>
          <div className="text-sm text-muted-foreground max-w-md text-center">
            {projectId === 0 
              ? 'This project has an invalid ID in the database. Please run the SQL fix script: database/migrations/fix_project_id_zero_all_in_one.sql'
              : projectId === undefined
              ? 'Project ID is missing. Please check the URL or go back to the projects list.'
              : 'Please go back and try again.'}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/projects')} variant="outline">
              Back to Projects
            </Button>
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
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
    status: "not started",
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
  const [commentForm, setCommentForm] = useState({ comment: '', comment_type: 'General', is_internal: false });
  const [showCallNoteForm, setShowCallNoteForm] = useState(false);
  const [editingCallNoteId, setEditingCallNoteId] = useState<number | null>(null);
  const [showDeleteCallNoteDialog, setShowDeleteCallNoteDialog] = useState(false);
  const [callNoteToDelete, setCallNoteToDelete] = useState<number | null>(null);
  const [callNoteForm, setCallNoteForm] = useState({
    call_date: new Date().toISOString().slice(0, 16),
    call_duration_minutes: '',
    participants: '',
    notes: '',
    action_items: '',
    follow_up_required: false,
    follow_up_date: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  // Fetch project data for edit mode (supports numeric ID or UUID)
  const fetchId = isUUID ? (projectId as string) : (projectId !== undefined ? Number(projectId) : undefined);
  const { data: projectData, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => {
      if (!fetchId) {
        throw new Error('Invalid project ID');
      }
      return projectsApi.getById(fetchId as any);
    },
    enabled: mode === 'edit' && !!projectId && (isUUID || (!isNaN(Number(projectId)) && Number(projectId) > 0)),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch users for dropdowns - use for-dropdown endpoint which doesn't require full permission
  const { data: usersData } = useQuery({
    queryKey: ['users-for-dropdown'],
    queryFn: () => usersApi.getForDropdown({ limit: 100 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch employees to get team lead relationships
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch comments for edit mode (use numericProjectId after project is fetched if UUID was used)
  const numericProjectId = projectData?.data?.id || (isUUID ? undefined : (projectId !== undefined ? Number(projectId) : undefined));
  const { data: commentsData } = useQuery({
    queryKey: ['project-comments', numericProjectId],
    queryFn: () => projectsApi.getComments(numericProjectId as any),
    enabled: mode === 'edit' && !!numericProjectId && Number(numericProjectId) > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes (comments may change more frequently)
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch client call notes for edit mode
  const { data: callNotesData } = useQuery({
    queryKey: ['project-call-notes', numericProjectId],
    queryFn: () => projectsApi.getCallNotes(numericProjectId as any),
    enabled: mode === 'edit' && !!numericProjectId && Number(numericProjectId) > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update call note mutation
  const updateCallNoteMutation = useMutation({
    mutationFn: async ({ noteId, data }: { noteId: number; data: any }) => {
      return await projectsApi.updateCallNote(numericProjectId as any, noteId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-call-notes', numericProjectId] });
      toast({ title: "Success", description: "Call note updated successfully." });
      setShowCallNoteForm(false);
      setEditingCallNoteId(null);
      // Format current date/time as YYYY-MM-DDTHH:mm for DateTimePicker
      const now = new Date();
      const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setCallNoteForm({
        call_date: formattedDateTime,
        call_duration_minutes: '',
        participants: '',
        notes: '',
        action_items: '',
        follow_up_required: false,
        follow_up_date: '',
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update call note.", variant: "destructive" });
    },
  });

  // Delete call note mutation
  const deleteCallNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return await projectsApi.deleteCallNote(numericProjectId as any, noteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-call-notes', numericProjectId] });
      toast({ title: "Success", description: "Call note deleted successfully." });
      setShowDeleteCallNoteDialog(false);
      setCallNoteToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete call note.", variant: "destructive" });
    },
  });

  const allUsers = usersData?.data || [];
  const allEmployees = employeesData?.data || [];
  const teamLeads = allUsers.filter((user: any) => user.role === 'Team Lead');
  
  // Filter assignable users based on selected team lead - show employees that report to this team lead + CLIENT users
  const assignableUsers = useMemo(() => {
    const employeeUsers: any[] = [];
    
    // If team lead is selected, show employees that report to this team lead
    if (formData.team_lead_id) {
      const selectedTeamLeadUser = allUsers.find((u: any) => u.id.toString() === formData.team_lead_id);
      if (selectedTeamLeadUser) {
        const teamLeadEmployee = allEmployees.find((emp: any) => 
          emp.user_id === selectedTeamLeadUser.id
        );
        
        if (teamLeadEmployee) {
          // Get all employees that report to this team lead (recursively get all subordinates)
          const getSubordinateEmployees = (teamLeadEmpId: number, visited: Set<number> = new Set()): any[] => {
            if (visited.has(teamLeadEmpId)) {
              return []; // Prevent infinite loops
            }
            visited.add(teamLeadEmpId);
            
            // Convert both to numbers for comparison to handle string/number mismatches
            const directReports = allEmployees.filter((emp: any) => {
              if (!emp.team_lead_id) return false;
              // Handle both string and number comparisons
              const empTeamLeadId = typeof emp.team_lead_id === 'string' ? parseInt(emp.team_lead_id, 10) : emp.team_lead_id;
              const leadEmpId = typeof teamLeadEmpId === 'string' ? parseInt(teamLeadEmpId, 10) : teamLeadEmpId;
              return empTeamLeadId === leadEmpId;
            });
            
            // Recursively get subordinates of subordinates
            const allSubordinates = [...directReports];
            directReports.forEach((emp: any) => {
              const subordinates = getSubordinateEmployees(emp.id, visited);
              allSubordinates.push(...subordinates);
            });
            
            return allSubordinates;
          };
          
          const teamEmployees = getSubordinateEmployees(teamLeadEmployee.id);
          const teamEmployeeUserIds = teamEmployees
            .map((emp: any) => emp.user_id)
            .filter((id: any) => id !== null && id !== undefined);
          
          // Get users that are employees of this team lead, excluding team leads
          const teamUsers = allUsers.filter((user: any) => 
            teamEmployeeUserIds.includes(user.id) && 
            user.role !== 'Team Lead' && 
            user.role !== 'Team Leader'
          );
          
          employeeUsers.push(...teamUsers);
        }
      }
    }

    // Also include all users who are Developers/Testers/Designers (global) so dropdown shows them
    // Always include all Developers/Testers/Designers and CLIENT users (no team scoping)
    const roleAllowlist = ['Developer', 'Tester', 'Designer', 'QA', 'developer', 'tester', 'designer', 'qa'];
    const roleUsers = allUsers.filter((u: any) => roleAllowlist.includes((u.role || '').toString()));

    const clientUsers = allUsers
      .filter((u: any) => u.role === 'CLIENT' || u.role === 'Client')
      .map((user: any) => ({ ...user, is_client: true }));

    const allAssignableUsers = [...roleUsers, ...clientUsers];
    const uniqueUsers = allAssignableUsers.filter((user, index, self) =>
      index === self.findIndex((u) => u.id === user.id)
    );

    return uniqueUsers;
  }, [allUsers]);

  // Filter assignable users based on search term
  const filteredAssignableUsers = useMemo(() => {
    if (!memberSearchTerm.trim()) {
      return assignableUsers;
    }
    const searchLower = memberSearchTerm.toLowerCase();
    return assignableUsers.filter((user: any) =>
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    );
  }, [assignableUsers, memberSearchTerm]);

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
        status: project.status || "not started",
        risk_level: project.risk_level || "",
        priority: project.priority || "",
        technologies_used: project.technologies_used ? (Array.isArray(project.technologies_used) ? project.technologies_used : JSON.parse(project.technologies_used)) : [],
        team_lead_id: project.team_lead_id?.toString() || "",
        member_ids: project.member_ids || [],
        member_roles: project.member_roles || {},
        milestones: project.milestones ? project.milestones.map((m: any) => ({
          ...m,
          start_date: m.start_date ? (typeof m.start_date === 'string' ? m.start_date.split('T')[0] : m.start_date) : '',
          end_date: m.end_date ? (typeof m.end_date === 'string' ? m.end_date.split('T')[0] : m.end_date) : '',
        })) : [],
        comments: [],
        github_repo_url: project.github_repo_url || "",
        bitbucket_repo_url: project.bitbucket_repo_url || "",
      });
    }
  }, [projectData, mode]);

  // Load project files for edit mode
  useEffect(() => {
    const resolvedId = projectData?.data?.id ?? fetchId;
    if (mode === 'edit' && resolvedId) {
      projectsApi.getFiles(resolvedId as any)
        .then((response) => {
          setUploadedFiles(response.data || []);
        })
        .catch((error) => {
          logger.error('Error loading project files:', error);
        });
    }
  }, [mode, projectId]);

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Project name is always required (both create and update)
    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    }

    // Client fields are optional (no longer required)

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await projectsApi.create(data);
    },
    onSuccess: async () => {
      // Invalidate and refetch all project queries
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.refetchQueries({ queryKey: ['projects'] });
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
    mutationFn: async ({ id, data }: { id: number | string; data: any }) => {
      return await projectsApi.update(id, data);
    },
    onSuccess: async (response) => {
      // Invalidate all project-related queries first
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      await queryClient.invalidateQueries({ queryKey: ['project-files', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-comments', projectId] });
      
      // Refetch projects list to immediately show changes
      await queryClient.refetchQueries({ queryKey: ['projects'] });
      
      // Fetch the complete updated project data (includes members, milestones, files)
      // Wait for the API call to complete before navigating
      try {
        logger.debug('Fetching updated project data after update...');
        const resolvedId = numericProjectId ?? fetchId;
        const updatedProject = await projectsApi.getById(resolvedId as any);
        logger.debug('Updated project data received:', updatedProject);
        
        // Update the cache with the complete project data
        // This ensures ProjectDetail page sees the updated data immediately
        queryClient.setQueryData(['project', projectId], updatedProject);
        logger.debug('Cache updated with new project data');
        
        // Invalidate to ensure any other queries refetch
        await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        await queryClient.refetchQueries({ queryKey: ['project', projectId] });
        
        // Wait a moment to ensure cache update is processed
        await new Promise(resolve => setTimeout(resolve, 50));
        
        toast({ title: "Success", description: "Project updated successfully." });
        
        // Navigate only after API call completes and cache is updated
        logger.debug('Navigating to project detail page...');
        navigate(`/projects/${projectId}`);
      } catch (error) {
        logger.error('Failed to fetch updated project:', error);
        // If fetch fails, invalidate and refetch, then navigate
        await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        await queryClient.refetchQueries({ queryKey: ['project', projectId] });
        
        toast({ title: "Success", description: "Project updated successfully." });
        navigate(`/projects/${projectId}`);
      }
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
      milestones: formData.milestones
        .filter(m => m.name)
        .map(m => ({
          name: m.name,
          start_date: m.start_date || null,
          end_date: m.end_date || null,
          status: m.status || 'Not Started'
        })),
      technologies_used: formData.technologies_used,
    };
    
    // Remove comments as they're not part of project update
    delete submitData.comments;

    if (mode === 'create') {
      createMutation.mutate(submitData);
    } else {
      updateMutation.mutate({ id: (numericProjectId as any) || (fetchId as any), data: submitData });
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
    // Note: projectId validation is done early in the component (before state setup)
    // This is just a safety check in case something was missed
    
    // Check for loading state
    if (isLoading) {
      return (
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading project...</p>
            </div>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {mode === "create" ? "Create New Project" : "Edit Project"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "create"
                ? "Fill in all project details"
                : "Update project information"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Project information, timeline, technologies, description, and logo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* First Row: Project Name, Priority, Project Status, Risk Level (4 columns) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <MandatoryLabel htmlFor="name">Project Name</MandatoryLabel>
                <SecureInput
                  id="name"
                  fieldName="Project Name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: toTitleCase(e.target.value) });
                    if (errors.name) {
                      const newErrors = { ...errors };
                      delete newErrors.name;
                      setErrors(newErrors);
                    }
                  }}
                  onBlur={() => {
                    if (!formData.name.trim()) {
                      setErrors({
                        ...errors,
                        name: "Project name is required",
                      });
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
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
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
              <div className="grid gap-2">
                <Label htmlFor="status">Project Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not started">Not Started</SelectItem>
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, risk_level: value })
                  }
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
            </div>

            {/* Second Row: Start Date & End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <DatePicker
                  id="start_date"
                  value={formData.start_date}
                  onChange={(date) =>
                    setFormData({ ...formData, start_date: date })
                  }
                  placeholder="Select start date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">Target End Date</Label>
                <DatePicker
                  id="end_date"
                  value={formData.end_date}
                  onChange={(date) =>
                    setFormData({ ...formData, end_date: date })
                  }
                  placeholder="Select target end date"
                />
              </div>
            </div>

            {/* Third Row: Technologies Used (separate row) */}
            <div className="grid gap-2">
              <Label>Technologies Used</Label>
              <div>
                <SecureInput
                  fieldName="Technologies Used"
                  placeholder="Enter technology (press Enter to add)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const value = input.value.trim();
                      if (
                        value &&
                        !formData.technologies_used.includes(value)
                      ) {
                        setFormData({
                          ...formData,
                          technologies_used: [
                            ...formData.technologies_used,
                            value,
                          ],
                        });
                        input.value = "";
                      }
                    }
                  }}
                />
              </div>
              {formData.technologies_used.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.technologies_used.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-sm flex items-center gap-1"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            technologies_used:
                              formData.technologies_used.filter(
                                (t) => t !== tech
                              ),
                          })
                        }
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Project Logo */}
            <ProjectLogoUpload
              value={formData.logo_url}
              onChange={(url) => setFormData({ ...formData, logo_url: url })}
            />

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <MarkdownEditor
                value={formData.description}
                onChange={(value) =>
                  setFormData({ ...formData, description: value })
                }
                placeholder="Enter project description. You can use markdown formatting: headings, lists, code blocks, and images."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        {/* Client Details */}
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>Client information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client_name">Client Name</Label>
                <SecureInput
                  id="client_name"
                  fieldName="Client Name"
                  value={formData.client_name}
                  onChange={(e) => {
                    setFormData({ ...formData, client_name: e.target.value });
                    if (errors.client_name) {
                      const newErrors = { ...errors };
                      delete newErrors.client_name;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter client name"
                  className={errors.client_name ? "border-destructive" : ""}
                />
                {errors.client_name && (
                  <p className="text-sm text-destructive">
                    {errors.client_name}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client_contact_person">
                  Client Contact Person
                </Label>
                <SecureInput
                  id="client_contact_person"
                  fieldName="Client Contact Person"
                  value={formData.client_contact_person}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      client_contact_person: e.target.value,
                    });
                    if (errors.client_contact_person) {
                      const newErrors = { ...errors };
                      delete newErrors.client_contact_person;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter contact person name"
                  className={
                    errors.client_contact_person ? "border-destructive" : ""
                  }
                />
                {errors.client_contact_person && (
                  <p className="text-sm text-destructive">
                    {errors.client_contact_person}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client_email">Client Email</Label>
                <SecureInput
                  id="client_email"
                  fieldName="Client Email"
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
                  placeholder="client@example.com"
                  className={errors.client_email ? "border-destructive" : ""}
                />
                {errors.client_email && (
                  <p className="text-sm text-destructive">
                    {errors.client_email}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client_phone">Client Phone</Label>
                <SecureInput
                  id="client_phone"
                  fieldName="Client Phone"
                  value={formData.client_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, client_phone: e.target.value })
                  }
                  placeholder="+1 (555) 000-0000"
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
              <p className="text-sm text-muted-foreground">
                No milestones added yet
              </p>
            ) : (
              <div className="space-y-4">
                {formData.milestones.map((milestone, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
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
                    <div className="grid grid-cols-4 gap-4">
                      <div className="grid gap-2">
                        <Label>Milestone Name</Label>
                        <SecureInput
                          fieldName="Milestone Name"
                          value={milestone.name}
                          onChange={(e) =>
                            updateMilestone(index, "name", e.target.value)
                          }
                          placeholder="Enter milestone name"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select
                          value={milestone.status}
                          onValueChange={(value) =>
                            updateMilestone(index, "status", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not Started">
                              Not Started
                            </SelectItem>
                            <SelectItem value="In Progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Delayed">Delayed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Start Date</Label>
                        <DatePicker
                          value={milestone.start_date}
                          onChange={(date) =>
                            updateMilestone(index, "start_date", date)
                          }
                          placeholder="Select start date"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>End Date</Label>
                        <DatePicker
                          value={milestone.end_date}
                          onChange={(date) =>
                            updateMilestone(index, "end_date", date)
                          }
                          placeholder="Select end date"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                    member_roles: {},
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
              <Label>Assigned Members (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select employees and clients to assign to this project. Clients
                will have read-only access.
              </p>
              <SecureInput
                fieldName="Search Members"
                placeholder="Search members..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="mb-2"
              />
              <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                {filteredAssignableUsers.length === 0 ? (
                  <div className="text-center py-4 text-sm">
                    {memberSearchTerm.trim() ? (
                      <p className="text-muted-foreground">
                        No members found matching "{memberSearchTerm}".
                      </p>
                    ) : formData.team_lead_id ? (
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          No employees are currently assigned to this team lead.
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                          You can proceed without assigning members now. Members
                          can be added later.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Note: Make sure employees have their "Reports To"
                          field set to this team lead in their employee profile.
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Select a team lead to see available employees, or CLIENT
                        users will appear automatically.
                      </p>
                    )}
                  </div>
                ) : (
                  filteredAssignableUsers.map((user: any) => {
                    const isSelected = formData.member_ids.includes(
                      user.id.toString()
                    );
                    const roleMap: Record<string, string> = {
                      "Team Lead": "TL",
                      Developer: "Developer",
                      Tester: "QA",
                      Designer: "Designer",
                      CLIENT: "Client",
                      Client: "Client",
                    };
                    const displayRole = roleMap[user.role] || user.role;
                    const isClient =
                      user.is_client ||
                      user.role === "CLIENT" ||
                      user.role === "Client";
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted border border-transparent"
                        } ${
                          isClient ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                        }`}
                        onClick={() =>
                          toggleMember(user.id.toString(), user.role)
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="h-3 w-3 text-primary-foreground"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium">
                              {user.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({user.email})
                            </span>
                            <span
                              className={`text-xs ml-2 ${
                                isClient
                                  ? "text-blue-600 dark:text-blue-400 font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              • {displayRole}
                            </span>
                            {isClient && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                                (Read-only)
                              </span>
                            )}
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

        {/* Documents Upload */}
        {mode === "edit" && projectId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Project Documents
              </CardTitle>
              <CardDescription>
                Upload and manage project documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const files = Array.from(e.target.files);
                        setPendingFiles(files);
                        setShowUploadDialog(true);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Documents</Label>
                    <div className="border rounded-md divide-y">
                      {uploadedFiles.map((file: any) => {
                        const extension =
                          file.file_name.split(".").pop()?.toLowerCase() || "";
                        const isImage = [
                          "jpg",
                          "jpeg",
                          "png",
                          "gif",
                          "bmp",
                          "svg",
                          "webp",
                          "ico",
                        ].includes(extension);
                        const fileUrl =
                          getImageUrl(file.file_url) || file.file_url;

                        return (
                          <div
                            key={file.id}
                            className="p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {isImage && fileUrl ? (
                                <img
                                  src={fileUrl}
                                  alt={file.file_name}
                                  className="h-8 w-8 rounded object-cover border"
                                  onError={(e) => {
                                    // Fallback to icon if image fails
                                    const parent =
                                      e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML =
                                        '<FileText className="h-4 w-4 text-muted-foreground" />';
                                    }
                                  }}
                                />
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">{file.file_name}</span>
                              {file.description && (
                                <span className="text-xs text-muted-foreground">
                                  - {file.description}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {fileUrl && (
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  try {
                                    const resolvedId = (numericProjectId ??
                                      fetchId) as any;
                                    await projectsApi.deleteFile(
                                      resolvedId,
                                      file.id
                                    );
                                    toast({
                                      title: "Success",
                                      description: "File deleted successfully",
                                    });
                                    const filesData =
                                      await projectsApi.getFiles(resolvedId);
                                    setUploadedFiles(filesData.data || []);
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description:
                                        error.message ||
                                        "Failed to delete file",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Call Notes - Only show in edit mode */}
        {mode === "edit" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Client Call Notes ({callNotesData?.data?.length || 0})
              </CardTitle>
              <CardDescription>
                Manage client call notes and meeting records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {callNotesData?.data && callNotesData.data.length > 0 && (
                <div className="space-y-2">
                  {callNotesData.data.map((note: any, index: number) => (
                    <div key={note.id || index} className="p-3 border rounded">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold">
                            {note.call_date
                              ? new Date(note.call_date).toLocaleString()
                              : "No date"}
                          </div>
                          {note.call_duration_minutes && (
                            <div className="text-sm text-muted-foreground">
                              Duration: {note.call_duration_minutes} minutes
                            </div>
                          )}
                          {note.created_by_name && (
                            <div className="text-xs text-muted-foreground">
                              Recorded by: {note.created_by_name}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            type="button" 
                            variant="ghost"
                            onClick={() => {
                              setEditingCallNoteId(note.id);
                              // Convert call_date to YYYY-MM-DDTHH:mm format for DateTimePicker
                              let callDateTime = "";
                              if (note.call_date) {
                                const date = new Date(note.call_date);
                                if (!isNaN(date.getTime())) {
                                  callDateTime = `${date.getFullYear()}-${String(
                                    date.getMonth() + 1
                                  ).padStart(2, "0")}-${String(
                                    date.getDate()
                                  ).padStart(2, "0")}T${String(
                                    date.getHours()
                                  ).padStart(2, "0")}:${String(
                                    date.getMinutes()
                                  ).padStart(2, "0")}`;
                                }
                              }
                              if (!callDateTime) {
                                const now = new Date();
                                callDateTime = `${now.getFullYear()}-${String(
                                  now.getMonth() + 1
                                ).padStart(2, "0")}-${String(
                                  now.getDate()
                                ).padStart(2, "0")}T${String(
                                  now.getHours()
                                ).padStart(2, "0")}:${String(
                                  now.getMinutes()
                                ).padStart(2, "0")}`;
                              }
                              // Convert follow_up_date to YYYY-MM-DD format for DatePicker
                              let followUpDate = "";
                              if (note.follow_up_date) {
                                const date = new Date(note.follow_up_date);
                                if (!isNaN(date.getTime())) {
                                  followUpDate = date
                                    .toISOString()
                                    .split("T")[0];
                                }
                              }
                              setCallNoteForm({
                                call_date: callDateTime,
                                call_duration_minutes:
                                  note.call_duration_minutes?.toString() || "",
                                participants: note.participants || "",
                                notes: note.notes || "",
                                action_items: note.action_items || "",
                                follow_up_required:
                                  note.follow_up_required || false,
                                follow_up_date: followUpDate,
                              });
                              setShowCallNoteForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            title="Delete Call Note"
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setCallNoteToDelete(note.id);
                              setShowDeleteCallNoteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {note.participants && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">Participants: </span>
                          {note.participants}
                        </div>
                      )}
                      <p className="text-sm mb-2">{note.notes}</p>
                      {note.action_items && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">Action Items: </span>
                          {note.action_items}
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {note.follow_up_required ? (
                          note.follow_up_date ? (
                            `Follow-up Date: ${new Date(note.follow_up_date).toLocaleDateString()}`
                          ) : (
                            "Follow-up required"
                          )
                        ) : (
                          "Follow-up: No need"
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showCallNoteForm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCallNoteId(null);
                    // Format current date/time as YYYY-MM-DDTHH:mm for DateTimePicker
                    const now = new Date();
                    const formattedDateTime = `${now.getFullYear()}-${String(
                      now.getMonth() + 1
                    ).padStart(2, "0")}-${String(now.getDate()).padStart(
                      2,
                      "0"
                    )}T${String(now.getHours()).padStart(2, "0")}:${String(
                      now.getMinutes()
                    ).padStart(2, "0")}`;
                    setCallNoteForm({
                      call_date: formattedDateTime,
                      call_duration_minutes: "",
                      participants: "",
                      notes: "",
                      action_items: "",
                      follow_up_required: false,
                      follow_up_date: "",
                    });
                    setShowCallNoteForm(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Call Note
                </Button>
              ) : (
                <div className="grid gap-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <MandatoryLabel htmlFor="call_date">
                        Call Date & Time
                      </MandatoryLabel>
                      <DateTimePicker
                        id="call_date"
                        value={callNoteForm.call_date}
                        onChange={(datetime) =>
                          setCallNoteForm({
                            ...callNoteForm,
                            call_date: datetime,
                          })
                        }
                        placeholder="Select call date and time"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="call_duration_minutes">
                        Duration (Minutes)
                      </Label>
                      <Input
                        id="call_duration_minutes"
                        type="number"
                        value={callNoteForm.call_duration_minutes}
                        onChange={(e) =>
                          setCallNoteForm({
                            ...callNoteForm,
                            call_duration_minutes: e.target.value,
                          })
                        }
                        placeholder="e.g., 30"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="participants">Participants</Label>
                    <Input
                      id="participants"
                      value={callNoteForm.participants}
                      onChange={(e) =>
                        setCallNoteForm({
                          ...callNoteForm,
                          participants: e.target.value,
                        })
                      }
                      placeholder="Comma-separated list of participants"
                    />
                  </div>
                  <div className="grid gap-2">
                    <MandatoryLabel htmlFor="notes">Notes</MandatoryLabel>
                    <SecureTextarea
                      fieldName="Call Notes"
                      value={callNoteForm.notes}
                      onChange={(e) =>
                        setCallNoteForm({
                          ...callNoteForm,
                          notes: e.target.value,
                        })
                      }
                      rows={4}
                      placeholder="Enter call notes..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="action_items">Action Items</Label>
                    <SecureTextarea
                      fieldName="Action Items"
                      value={callNoteForm.action_items}
                      onChange={(e) =>
                        setCallNoteForm({
                          ...callNoteForm,
                          action_items: e.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Enter action items..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="follow_up_required"
                      checked={callNoteForm.follow_up_required}
                      onChange={(e) =>
                        setCallNoteForm({
                          ...callNoteForm,
                          follow_up_required: e.target.checked,
                          follow_up_date: e.target.checked
                            ? callNoteForm.follow_up_date
                            : "",
                        })
                      }
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="follow_up_required">
                      Follow-up Required
                    </Label>
                  </div>
                  {callNoteForm.follow_up_required && (
                    <div className="grid gap-2">
                      <Label htmlFor="follow_up_date">Follow-up Date</Label>
                      <DatePicker
                        id="follow_up_date"
                        value={callNoteForm.follow_up_date}
                        onChange={(date) =>
                          setCallNoteForm({
                            ...callNoteForm,
                            follow_up_date: date,
                          })
                        }
                        placeholder="Select follow-up date"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCallNoteForm(false);
                        setEditingCallNoteId(null);
                        // Format current date/time as YYYY-MM-DDTHH:mm for DateTimePicker
                        const now = new Date();
                        const formattedDateTime = `${now.getFullYear()}-${String(
                          now.getMonth() + 1
                        ).padStart(2, "0")}-${String(now.getDate()).padStart(
                          2,
                          "0"
                        )}T${String(now.getHours()).padStart(2, "0")}:${String(
                          now.getMinutes()
                        ).padStart(2, "0")}`;
                        setCallNoteForm({
                          call_date: formattedDateTime,
                          call_duration_minutes: "",
                          participants: "",
                          notes: "",
                          action_items: "",
                          follow_up_required: false,
                          follow_up_date: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={async () => {
                        if (
                          !callNoteForm.call_date ||
                          !callNoteForm.notes.trim()
                        ) {
                          toast({
                            title: "Validation Error",
                            description: "Call date and notes are required.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (numericProjectId) {
                          // Convert call_date from YYYY-MM-DDTHH:mm to ISO string
                          let callDateISO = "";
                          if (callNoteForm.call_date) {
                            try {
                              const dateTime = new Date(callNoteForm.call_date);
                              if (!isNaN(dateTime.getTime())) {
                                callDateISO = dateTime.toISOString();
                              }
                            } catch (e) {
                              // Invalid date, will be caught by validation
                            }
                          }

                          // Convert follow_up_date from YYYY-MM-DD to ISO string if follow_up_required is true
                          let followUpDateISO = null;
                          if (
                            callNoteForm.follow_up_required &&
                            callNoteForm.follow_up_date
                          ) {
                            try {
                              const date = new Date(
                                callNoteForm.follow_up_date + "T00:00:00"
                              );
                              if (!isNaN(date.getTime())) {
                                followUpDateISO = date.toISOString();
                              }
                            } catch (e) {
                              // Invalid date, keep as null
                            }
                          }

                          const payload = {
                            call_date: callDateISO,
                            call_duration_minutes:
                              callNoteForm.call_duration_minutes
                                ? parseInt(callNoteForm.call_duration_minutes)
                                : null,
                            participants: callNoteForm.participants || null,
                            notes: callNoteForm.notes,
                            action_items: callNoteForm.action_items || null,
                            follow_up_required: callNoteForm.follow_up_required,
                            follow_up_date: followUpDateISO,
                          };
                          if (editingCallNoteId) {
                            updateCallNoteMutation.mutate({
                              noteId: editingCallNoteId,
                              data: payload,
                            });
                          } else {
                            try {
                              await projectsApi.createCallNote(
                                numericProjectId,
                                payload
                              );
                              toast({
                                title: "Success",
                                description: "Call note added successfully.",
                              });
                              // Format current date/time as YYYY-MM-DDTHH:mm for DateTimePicker
                              const now = new Date();
                              const formattedDateTime = `${now.getFullYear()}-${String(
                                now.getMonth() + 1
                              ).padStart(2, "0")}-${String(
                                now.getDate()
                              ).padStart(2, "0")}T${String(
                                now.getHours()
                              ).padStart(2, "0")}:${String(
                                now.getMinutes()
                              ).padStart(2, "0")}`;
                              setCallNoteForm({
                                call_date: formattedDateTime,
                                call_duration_minutes: "",
                                participants: "",
                                notes: "",
                                action_items: "",
                                follow_up_required: false,
                                follow_up_date: "",
                              });
                              setShowCallNoteForm(false);
                              queryClient.invalidateQueries({
                                queryKey: [
                                  "project-call-notes",
                                  numericProjectId,
                                ],
                              });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description:
                                  error.message || "Failed to add call note.",
                                variant: "destructive",
                              });
                            }
                          }
                        }
                      }}
                      disabled={updateCallNoteMutation.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateCallNoteMutation.isPending
                        ? "Saving..."
                        : editingCallNoteId
                        ? "Update Call Note"
                        : "Add Call Note"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments (
              {mode === "edit"
                ? commentsData?.data?.length || 0
                : formData.comments.length}
              )
            </CardTitle>
            <CardDescription>Add project comments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "edit" &&
              commentsData?.data &&
              commentsData.data.length > 0 && (
                <div className="space-y-2">
                  {commentsData.data.map((comment: any, index: number) => (
                    <CommentItemEdit
                      key={comment.id || index}
                      comment={comment}
                      projectId={numericProjectId!}
                      queryClient={queryClient}
                    />
                  ))}
                </div>
              )}
            {mode === "create" && formData.comments.length > 0 && (
              <div className="space-y-2">
                {formData.comments.map((comment, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">
                          {comment.comment_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {comment.is_internal ? "Internal" : "Client Visible"}
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
                <div className="grid gap-2">
                  <Label>Comment Type</Label>
                  <Select
                    value={commentForm.comment_type}
                    onValueChange={(value) =>
                      setCommentForm({ ...commentForm, comment_type: value })
                    }
                  >
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
                </div>
                <div className="grid gap-2">
                  <Label>Comment</Label>
                  <SecureTextarea
                    fieldName="Comment"
                    value={commentForm.comment}
                    onChange={(e) =>
                      setCommentForm({
                        ...commentForm,
                        comment: e.target.value,
                      })
                    }
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
                      setCommentForm({
                        comment: "",
                        comment_type: "General",
                        is_internal: false,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (commentForm.comment.trim() && projectId) {
                        try {
                          await projectsApi.createComment(
                            numericProjectId as any,
                            {
                              comment: commentForm.comment,
                              comment_type: commentForm.comment_type,
                              is_internal: commentForm.is_internal,
                            }
                          );
                          toast({
                            title: "Success",
                            description: "Comment added successfully.",
                          });
                          setCommentForm({
                            comment: "",
                            comment_type: "General",
                            is_internal: false,
                          });
                          setShowCommentForm(false);
                          // Refresh comments to show new comment
                          queryClient.invalidateQueries({
                            queryKey: ["project-comments", projectId],
                          });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description:
                              error.message || "Failed to add comment.",
                            variant: "destructive",
                          });
                        }
                      } else if (!projectId) {
                        // For create mode, add to form data
                        setFormData({
                          ...formData,
                          comments: [...formData.comments, { ...commentForm }],
                        });
                        setCommentForm({
                          comment: "",
                          comment_type: "General",
                          is_internal: false,
                        });
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

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="github_repo_url">Code Repo URL (Frontend)</Label>
              <SecureInput
                id="github_repo_url"
                fieldName="GitHub Repo URL"
                value={formData.github_repo_url}
                onChange={(e) =>
                  setFormData({ ...formData, github_repo_url: e.target.value })
                }
                placeholder="https://github.com/username/repo or https://bitbucket.org/username/repo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bitbucket_repo_url">
                Code Repo URL (Backend)
              </Label>
              <SecureInput
                id="bitbucket_repo_url"
                fieldName="Bitbucket Repo URL"
                value={formData.bitbucket_repo_url}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bitbucket_repo_url: e.target.value,
                  })
                }
                placeholder="https://github.com/username/repo or https://bitbucket.org/username/repo"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/projects")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
              ? "Create Project"
              : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Upload Confirmation Dialog */}
      {mode === "edit" && projectId && (
        <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Upload Documents</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingFiles.length === 1
                  ? `Are you sure you want to upload "${pendingFiles[0].name}"?`
                  : `Are you sure you want to upload ${pendingFiles.length} files?`}
                <div className="mt-2 space-y-1">
                  {pendingFiles.map((file, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      • {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </div>
                  ))}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowUploadDialog(false);
                  setPendingFiles([]);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    for (const file of pendingFiles) {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("file_type", "Other");
                      formData.append("file_category", "project_document");

                      const resolvedId = (numericProjectId ?? fetchId) as any;
                      await projectsApi.uploadFile(resolvedId, formData);
                    }
                    toast({
                      title: "Success",
                      description:
                        pendingFiles.length === 1
                          ? `${pendingFiles[0].name} uploaded successfully`
                          : `${pendingFiles.length} files uploaded successfully`,
                    });
                    // Refresh files list
                    const filesData = await projectsApi.getFiles(
                      (numericProjectId ?? fetchId) as any
                    );
                    setUploadedFiles(filesData.data || []);

                    // Invalidate query cache for project files to update ProjectDetail page immediately
                    queryClient.invalidateQueries({ queryKey: ['project-files', numericProjectId ?? fetchId] });

                    setShowUploadDialog(false);
                    setPendingFiles([]);
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to upload file(s)",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Upload
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <AlertDialog
        open={showDeleteCallNoteDialog}
        onOpenChange={setShowDeleteCallNoteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Call Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this call note? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (callNoteToDelete && numericProjectId) {
                  deleteCallNoteMutation.mutate(callNoteToDelete);
                }
              }}
              disabled={deleteCallNoteMutation.isPending}
            >
              {deleteCallNoteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SecurityAlertDialog {...securityAlertProps} />
    </div>
  );
}
