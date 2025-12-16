import { useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash2, AlertCircle, Clock } from "lucide-react";
import { AttachmentList } from "@/components/ui/attachment-list";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, bugSeverityMap, bugStatusMap } from "@/components/ui/status-badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { bugsApi } from "@/features/bugs/api";
import { BugComments } from "../components/BugComments";
import { getCurrentUser, getAuthToken } from "@/lib/auth";
import { API_CONFIG } from "@/lib/config";
import { logger } from "@/lib/logger";
import ConfirmationDialog from "@/shared/components/ConfirmationDialog";
import { formatFullDate } from "../utils/utils";

export default function BugDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get current user info for role-based permissions
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';

  // Permissions
  const canEditBug = ['Admin', 'Team Lead', 'Super Admin', 'Developer', 'Designer', 'Tester'].includes(userRole);
  const canDeleteBug = ['Super Admin', 'Team Lead'].includes(userRole);

  // Helper function to convert text to title case
  const toTitleCase = useCallback((text: string): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  // Fetch bug details
  const { data: bugData, isLoading, error } = useQuery({
    queryKey: ['bug', id],
    queryFn: () => bugsApi.getById(Number(id)),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const bug = bugData?.data;

  const deleteBugMutation = useMutation({
    mutationFn: () => bugsApi.delete(Number(id)),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bug deleted successfully.",
      });
      navigate('/bugs');
    },
    onError: (error: any) => {
      logger.error('Error deleting bug:', error);
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = '/login';
      } else if (error.status === 403) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to delete bugs.",
          variant: "destructive",
        });
      } else {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to delete bug.",
          variant: "destructive",
        });
      }
    },
  });

  const handleEdit = useCallback(() => {
    navigate(`/bugs/${id}/edit`);
  }, [navigate, id]);

  const handleDelete = useCallback(() => {
    deleteBugMutation.mutate();
  }, [deleteBugMutation]);

  const handleBack = useCallback(() => {
    navigate('/bugs');
  }, [navigate]);

  const handleDownloadAttachment = useCallback(async (attachment: any) => {
    try {
      const API_BASE_URL = API_CONFIG.BASE_URL;
      const token = getAuthToken();
      const url = `${API_BASE_URL}/bugs/${id}/attachments/${attachment.id}`;
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
      };
      
      const response = await fetch(url, {
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Failed to download: ${response.status} ${response.statusText}`);
      }
      
      // For all files (including images), download directly
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = attachment.original_filename || 'attachment';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Attachment downloaded successfully.",
      });
    } catch (error: any) {
      logger.error('Download error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download attachment.",
        variant: "destructive",
      });
    }
  }, [id, toast]);

  const getSeverityVariant = useCallback((severity?: string) => {
    if (severity === 'High') return 'error';
    if (severity === 'Medium') return 'warning';
    if (severity === 'Low') return 'info';
    return 'neutral';
  }, []);

  const tagsArray = useMemo(() => {
    if (!bug?.tags) return [];
    return bug.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
  }, [bug?.tags]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <div className="text-muted-foreground">Loading bug details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive">Error loading bug details.</div>
          <Button onClick={handleBack} variant="outline">
            Back to Bugs
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
            onClick={handleBack}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Bug Details</h1>
            <p className="font-mono text-status-error font-semibold text-1xl">
              BUG ID: {bug.bug_code || `BG-${bug.id}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditBug && (
            <Button onClick={handleEdit} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Bug
            </Button>
          )}
          {canDeleteBug && (
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
          {/* Title */}
          {bug.title && (
            <Card>
              <CardHeader>
                <CardTitle>Bug Title</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {bug.title}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {bug.description ? (
                <MarkdownRenderer content={bug.description} className="text-sm" />
              ) : (
                <div className="text-sm text-muted-foreground">No Description</div>
              )}
            </CardContent>
          </Card>

          {/* Steps to Reproduce */}
          {bug.steps_to_reproduce && (
            <Card>
              <CardHeader>
                <CardTitle>Steps to Reproduce</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap">{toTitleCase(bug.steps_to_reproduce)}</div>
              </CardContent>
            </Card>
          )}

          {/* Actual Behavior */}
          <Card>
            <CardHeader>
              <CardTitle>Actual Behavior</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap">
                {bug.actual_behavior ? toTitleCase(bug.actual_behavior) : <span className="text-muted-foreground italic">No Actual Behavior Specified</span>}
              </div>
            </CardContent>
          </Card>

          {/* Expected Behavior */}
          <Card>
            <CardHeader>
              <CardTitle>Expected Behavior</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap">
                {bug.expected_behavior ? toTitleCase(bug.expected_behavior) : <span className="text-muted-foreground italic">No Expected Behavior Specified</span>}
              </div>
            </CardContent>
          </Card>

          {/* Environment Details */}
          {(bug.browser || bug.device || bug.os || bug.app_version || bug.api_endpoint) && (
            <Card>
              <CardHeader>
                <CardTitle>Environment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bug.browser && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">Browser:</span>
                    <span className="text-sm">{bug.browser}</span>
                  </div>
                )}
                {bug.device && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">Device:</span>
                    <span className="text-sm">{bug.device}</span>
                  </div>
                )}
                {bug.os && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">OS:</span>
                    <span className="text-sm">{bug.os}</span>
                  </div>
                )}
                {bug.app_version && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">App Version:</span>
                    <span className="text-sm">{bug.app_version}</span>
                  </div>
                )}
                {bug.api_endpoint && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">API Endpoint:</span>
                    <span className="text-sm font-mono">{bug.api_endpoint}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {bug.attachments && bug.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <AttachmentList
                  attachments={bug.attachments.map((att: any) => ({
                    ...att,
                    path: `/bugs/${id}/attachments/${att.id}`,
                  }))}
                  onDownload={handleDownloadAttachment}
                  showLabel={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {tagsArray.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags / Labels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tagsArray.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-muted rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status & Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Status & Classification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div>
                  <StatusBadge 
                    variant={bugStatusMap[bug.status as keyof typeof bugStatusMap] || 'neutral'}
                    className="text-xs px-2.5 py-0.5 w-fit"
                  >
                    {bug.status || 'Open'}
                  </StatusBadge>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Priority</Label>
                <div>
                  <StatusBadge 
                    variant={getSeverityVariant(bug.severity)}
                    className="text-xs px-2.5 py-0.5 w-fit"
                  >
                    {bug.severity || 'Low'}
                  </StatusBadge>
                </div>
              </div>
              {bug.bug_type && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Bug Type</Label>
                  <div className="text-sm">{bug.bug_type}</div>
                </div>
              )}
              {bug.resolution_type && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Resolution Type</Label>
                  <div className="text-sm">{bug.resolution_type}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Reported By</Label>
                <div className="text-sm">{bug.reported_by_name || '-'}</div>
                {bug.reported_by_email && (
                  <div className="text-xs text-muted-foreground">{bug.reported_by_email}</div>
                )}
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Assigned To</Label>
                <div className="text-sm">{bug.assigned_to_name || 'Unassigned'}</div>
                {bug.assigned_to_email && (
                  <div className="text-xs text-muted-foreground">{bug.assigned_to_email}</div>
                )}
              </div>
              {bug.team_lead_name && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Team Lead</Label>
                    <div className="text-sm">{bug.team_lead_name}</div>
                    {bug.team_lead_email && (
                      <div className="text-xs text-muted-foreground">{bug.team_lead_email}</div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Project & Task Information */}
          {(bug.project_id || bug.task_id) && (
            <Card>
              <CardHeader>
                <CardTitle>Project & Task</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bug.project_id && (
                  <div className="text-sm">
                    <Label className="text-muted-foreground">Project:</Label>
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-2"
                      onClick={() => navigate(`/projects/${bug.project_id}`)}
                    >
                      {bug.project_name || `Project #${bug.project_id}`}
                    </Button>
                  </div>
                )}
                {bug.task_id && (
                  <div className="text-sm">
                    <Label className="text-muted-foreground">Task:</Label>
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-2"
                      onClick={() => navigate(`/tasks?task=${bug.task_id}`)}
                    >
                      {bug.task_title || `Task #${bug.task_id}`}
                    </Button>
                  </div>
                )}
                {bug.task_developer_name && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Developer: {bug.task_developer_name}
                  </div>
                )}
                {bug.task_tester_name && (
                  <div className="text-xs text-muted-foreground">
                    Tester: {bug.task_tester_name}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline & Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline & Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Reported Date</Label>
                {bug.created_at && (
                  <div className="text-xs text-muted-foreground">
                    {formatFullDate(bug.created_at)}
                  </div>
                )}
              </div>
              {bug.updated_at && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Updated Date</Label>
                    <div className="text-xs text-muted-foreground">
                      {formatFullDate(bug.updated_at)}
                    </div>
                  </div>
                </>
              )}
              {bug.target_fix_date && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Target Fix Date</Label>
                    <div className="text-xs text-muted-foreground">
                      {new Date(bug.target_fix_date).toLocaleDateString()}
                    </div>
                  </div>
                </>
              )}
              {bug.actual_fix_date && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Actual Fix Date</Label>
                    <div className="text-xs text-muted-foreground">
                      {new Date(bug.actual_fix_date).toLocaleDateString()}
                    </div>
                  </div>
                </>
              )}
              {bug.reopened_count !== undefined && bug.reopened_count > 0 && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Reopened Count</Label>
                    <div className="text-sm font-semibold">{bug.reopened_count}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comments Section */}
      <BugComments bugId={Number(id)} />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Are you sure?"
        description={`This action cannot be undone. This will permanently delete the bug ${bug.bug_code || `BG-${bug.id}`}.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={deleteBugMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
