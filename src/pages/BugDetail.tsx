import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash2, Download, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, bugSeverityMap, bugStatusMap } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { bugsApi } from "@/lib/api";
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

export default function BugDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get current user info for role-based permissions
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userRole = currentUser?.role || '';

  // Permissions
  const canEditBug = ['Admin', 'Team Lead', 'Super Admin', 'Developer', 'Designer', 'Tester'].includes(userRole);
  const canDeleteBug = ['Super Admin', 'Team Lead'].includes(userRole);

  // Helper function to convert text to title case
  const toTitleCase = (text: string): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Fetch bug details
  const { data: bugData, isLoading, error } = useQuery({
    queryKey: ['bug', id],
    queryFn: () => bugsApi.getById(Number(id)),
  });

  const bug = bugData?.data;

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

  const handleEdit = () => {
    navigate(`/bugs?edit=${id}`);
  };

  const handleDelete = async () => {
    try {
      await bugsApi.delete(Number(id));
      toast({
        title: "Success",
        description: "Bug deleted successfully.",
      });
      navigate('/bugs');
    } catch (error: any) {
      console.error('Error deleting bug:', error);
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
    }
  };

  const handleDownloadAttachment = (attachment: any) => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('auth_token');
    // Use the path from attachment to download
    const url = `${API_BASE_URL}/bugs/${id}/attachments/${attachment.id}`;
    
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to download');
        return response.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = attachment.original_filename || 'attachment';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Download error:', error);
        toast({
          title: "Error",
          description: "Failed to download attachment.",
          variant: "destructive",
        });
      });
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
            variant="ghost"
            size="icon"
            onClick={() => navigate('/bugs')}
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
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap">
                {bug.description ? toTitleCase(bug.description) : "No Description"}
              </div>
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

          

          {/* Attachments */}
          {bug.attachments && bug.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bug.attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {attachment.mime_type?.startsWith('image/') ? (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="text-sm font-medium">{attachment.original_filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {(attachment.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(attachment)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status & Severity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Status & Severity</CardTitle>
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
                <Label className="text-sm text-muted-foreground">Severity</Label>
                <div>
                  <StatusBadge 
                    variant={bugSeverityMap[bug.severity as keyof typeof bugSeverityMap] || 'neutral'}
                    className="text-xs px-2.5 py-0.5 w-fit"
                  >
                    {bug.severity || 'Minor'}
                  </StatusBadge>
                </div>
              </div>
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
            </CardContent>
          </Card>

          {/* Task Information */}
          {bug.task_id && (
            <Card>
              <CardHeader>
                <CardTitle>Task</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate(`/tasks?task=${bug.task_id}`)}
                  >
                    Task #{bug.task_id}
                  </Button>
                </div>
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

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Created</Label>
                <div className="text-sm">{bug.reported_by_name || 'N/A'}</div>
                {bug.created_at && (
                  <div className="text-xs text-muted-foreground">
                    {formatFullDate(bug.created_at)}
                  </div>
                )}
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Last Updated</Label>
                <div className="text-sm">
                  {bug.updated_by_name || bug.reported_by_name || 'N/A'}
                </div>
                {bug.updated_at && (
                  <div className="text-xs text-muted-foreground">
                    {formatFullDate(bug.updated_at)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bug
              {bug.bug_code && ` ${bug.bug_code}`}.
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
