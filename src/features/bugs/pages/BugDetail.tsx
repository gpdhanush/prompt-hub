import { useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash2, AlertCircle, Clock, MessageSquare } from "lucide-react";
import { AttachmentList } from "@/components/ui/attachment-list";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, bugStatusMap } from "@/components/ui/status-badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { bugsApi } from "@/features/bugs/api";
import { BugComments } from "../components/BugComments";
import { getCurrentUser, getAuthToken } from "@/lib/auth";
import { API_CONFIG } from "@/lib/config";
import { logger } from "@/lib/logger";
import ConfirmationDialog from "@/shared/components/ConfirmationDialog";
import { formatFullDate, formatDeadline } from "../utils/utils";

export default function BugDetail() {
  const navigate = useNavigate();
  const { bugUuid } = useParams<{ bugUuid: string }>();
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
    queryKey: ['bug', bugUuid],
    queryFn: () => bugsApi.getById(bugUuid),
    enabled: !!bugUuid,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const bug = bugData?.data;

  const deleteBugMutation = useMutation({
    mutationFn: () => bugsApi.delete(bugUuid),
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
    navigate(`/bugs/${bugUuid}/edit`);
  }, [navigate, bugUuid]);

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
      const url = `${API_BASE_URL}/bugs/${bugUuid}/attachments/${attachment.id}`;
      
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
  }, [bugUuid, toast]);

  const getPriorityVariant = useCallback((priority?: string) => {
    if (priority === 'Critical' || priority === 'High') return 'error';
    if (priority === 'Medium') return 'warning';
    if (priority === 'Low') return 'info';
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
    <div className="mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-in-left">
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
            <Button onClick={handleEdit} variant="default">
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
        <div className="md:col-span-2 space-y-6 animate-stagger">
          {/* Title */}
          {bug.title && (
            <Card className="animate-scale-in">
              <CardHeader>
                <CardTitle>{bug.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Status & Classification */}
                <div className="space-y-4">
                  {/* First Row: Project, Task, Deadline */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Project */}
                    {bug.project_id && (
                      <div>
                        <Label className="text-muted-foreground text-sm">
                          Project
                        </Label>

                        <div className="mt-1">
                          <Button
                            variant="link"
                            className="p-0 h-auto text-sm font-medium text-left justify-start"
                            onClick={() => {
                              const projectIdentifier =
                                bug.project_uuid || bug.project_id;
                              const currentUser = getCurrentUser();
                              const userRole = currentUser?.role || "";
                              const isClient =
                                userRole === "CLIENT" || userRole === "Client";
                              const basePath = isClient
                                ? "/client/projects"
                                : "/projects";
                              navigate(`${basePath}/${projectIdentifier}`);
                            }}
                            title={bug.project_name || `Project #${bug.project_id}`}
                          >
                            {(bug.project_name || bug.project_uuid ? `${bug.project_name || 'Unknown'}` : `Project #${bug.project_id}`).substring(0, 25)}...
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Task */}
                    {bug.task_id && (
                      <div>
                        <Label className="text-muted-foreground text-sm">
                          Task
                        </Label>
                        <div className="mt-1">
                          <Button
                            variant="link"
                            className="p-0 h-auto text-sm font-medium text-left justify-start"
                            onClick={() =>
                              navigate(`/tasks?task=${bug.task_id}`)
                            }
                            title={bug.task_title || `Task #${bug.task_id}`}
                          >
                            {(bug.task_title ? `${bug.task_title}` : `Task #${bug.task_id}`).substring(0, 15)}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Deadline */}
                    <div>
                      <Label className="text-muted-foreground text-sm">
                        Deadline
                      </Label>
                      <div className="mt-1">
                        <div
                          className={`text-sm font-medium ${
                            new Date(bug.deadline || "") < new Date() &&
                            bug.deadline
                              ? "text-red-500 bg-red-50 px-2 py-1 rounded"
                              : ""
                          }`}
                        >
                          {bug.deadline
                            ? formatDeadline(bug.deadline)
                            : "Not set"}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Divider */}
                  <Separator />
                  {/* Status, Priority, Bug Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Bug Type */}
                    <div>
                      <Label className="text-muted-foreground text-sm">
                        Bug Type
                      </Label>
                      <div className="text-sm font-medium mt-1">
                        {bug.bug_type || "Functional"}
                      </div>
                    </div>
                    
                    {/* Priority */}
                    <div>
                      <Label className="text-muted-foreground text-sm">
                        Priority
                      </Label>
                      <div className="text-sm font-medium mt-1">
                        {bug.priority || "Low"}
                      </div>
                    </div>
                    {/* Status */}
                    <div>
                      <Label className="text-muted-foreground text-sm">
                        Status
                      </Label>
                      <div className="text-sm font-medium mt-1">
                        {bug.status || "Open"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <Card className="animate-slide-in-left">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {bug.description ? (
                <div className="text-sm p-4 bg-muted/30 rounded-md border max-h-[600px] overflow-y-auto">
                  <MarkdownRenderer content={bug.description} />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No Description
                </div>
              )}
            </CardContent>
          </Card>

          {/* Steps to Reproduce */}
          {bug.steps_to_reproduce && (
            <Card className="animate-slide-in-right">
              <CardHeader>
                <CardTitle>Steps to Reproduce</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap">
                  {toTitleCase(bug.steps_to_reproduce)}
                </div>
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
                {bug.actual_behavior ? (
                  toTitleCase(bug.actual_behavior)
                ) : (
                  <span className="text-muted-foreground italic">
                    No Actual Behavior Specified
                  </span>
                )}
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
                {bug.expected_behavior ? (
                  toTitleCase(bug.expected_behavior)
                ) : (
                  <span className="text-muted-foreground italic">
                    No Expected Behavior Specified
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Environment Details */}
          {(bug.browser ||
            bug.device ||
            bug.os ||
            bug.app_version ||
            bug.api_endpoint) && (
            <Card className="animate-bounce-in">
              <CardHeader>
                <CardTitle>Environment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bug.browser && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">
                      Browser:
                    </span>
                    <span className="text-sm">{bug.browser}</span>
                  </div>
                )}
                {bug.device && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">
                      Device:
                    </span>
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
                    <span className="text-sm text-muted-foreground">
                      App Version:
                    </span>
                    <span className="text-sm">{bug.app_version}</span>
                  </div>
                )}
                {bug.api_endpoint && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-sm text-muted-foreground">
                      API Endpoint:
                    </span>
                    <span className="text-sm font-mono">
                      {bug.api_endpoint}
                    </span>
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
                    path: `/bugs/${bugUuid}/attachments/${att.id}`,
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

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BugComments bugId={bugUuid} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Reported By</Label>
                <div className="text-sm">{bug.reported_by_name || "-"}</div>
                {/* {bug.reported_by_email && (
                  <div className="text-xs text-muted-foreground">
                    {bug.reported_by_email}
                  </div>
                )} */}
              </div>
              <Separator />
              <div className="grid gap-1">
                <Label className="text-muted-foreground">Assigned To</Label>
                <div className="text-sm">
                  {bug.assigned_to_name || "Unassigned"}
                </div>
              </div>
              {bug.team_lead_name && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Team Lead</Label>
                    <div className="text-sm">{bug.team_lead_name}</div>
                    {/* {bug.team_lead_email && (
                      <div className="text-xs text-muted-foreground">
                        {bug.team_lead_email}
                      </div>
                    )} */}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

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
                    <Label className="text-muted-foreground">
                      Updated Date
                    </Label>
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
                    <Label className="text-muted-foreground">
                      Target Fix Date
                    </Label>
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
                    <Label className="text-muted-foreground">
                      Actual Fix Date
                    </Label>
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
                    <Label className="text-muted-foreground">
                      Reopened Count
                    </Label>
                    <div className="text-sm font-semibold">
                      {bug.reopened_count}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Are you sure?"
        description={`This action cannot be undone. This will permanently delete the bug ${
          bug.bug_code || `BG-${bug.id}`
        }.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={deleteBugMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
