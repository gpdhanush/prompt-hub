import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, DollarSign, FileText, Image as ImageIcon, Download, Trash2, Check, X, User, Calendar, Building, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { reimbursementsApi } from "@/features/reimbursements/api";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/imageUtils";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function ReimbursementView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';
  const isLevel1 = ['Admin', 'Team Leader', 'Team Lead'].includes(userRole);
  
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch currency symbol - optimized query
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 1000 * 60 * 10, // 10 minutes (settings don't change often)
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Memoized derived values
  const currencySymbol = useMemo(() => settingsData?.data?.currency_symbol || "$", [settingsData?.data?.currency_symbol]);

  // Fetch reimbursement - optimized query
  const { data: reimbursementData, isLoading } = useQuery({
    queryKey: ['reimbursement', id],
    queryFn: () => reimbursementsApi.getById(Number(id)),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const reimbursement = useMemo(() => reimbursementData?.data, [reimbursementData?.data]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => reimbursementsApi.approve(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement', id] });
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      toast({ title: "Success", description: "Reimbursement approved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve reimbursement.", variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => reimbursementsApi.reject(Number(id), { rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement', id] });
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      toast({ title: "Success", description: "Reimbursement rejected." });
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject reimbursement.", variant: "destructive" });
    },
  });

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => reimbursementsApi.deleteAttachment(Number(id), attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement', id] });
      toast({ title: "Success", description: "File deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete file.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reimbursement) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Reimbursement not found</p>
      </div>
    );
  }

  const formatCurrency = useCallback((amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currencySymbol]);

  const canApprove = useCallback(() => {
    if (!reimbursement) return false;
    if (isSuperAdmin) {
      return reimbursement.current_approval_level === 'Super Admin' || reimbursement.current_approval_level === 'Level 1 Approved';
    }
    if (isLevel1) {
      return reimbursement.current_approval_level === 'Level 2' && reimbursement.status === 'Pending';
    }
    return false;
  }, [reimbursement, isSuperAdmin, isLevel1]);

  const canEdit = useCallback(() => {
    if (!reimbursement) return false;
    // Only employee who created it can edit, and only if pending
    return (reimbursement.status === 'Pending' || reimbursement.status === 'Waiting for Approval');
  }, [reimbursement]);

  const handleApprove = useCallback(() => {
    approveMutation.mutate();
  }, [approveMutation]);

  const handleReject = useCallback(() => {
    setShowRejectDialog(true);
  }, []);

  const confirmReject = useCallback(() => {
    if (!rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason.", variant: "destructive" });
      return;
    }
    rejectMutation.mutate(rejectionReason);
  }, [rejectionReason, rejectMutation]);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'Pending':
      case 'Waiting for Approval':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'Level 1 Approved':
      case 'Super Admin Approved':
      case 'Approved':
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'Level 1 Rejected':
      case 'Super Admin Rejected':
      case 'Rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  }, []);

  // Memoized navigation handlers
  const handleNavigateBack = useCallback(() => {
    navigate('/reimbursements');
  }, [navigate]);

  const handleNavigateEdit = useCallback(() => {
    navigate(`/reimbursements/${id}/edit`);
  }, [navigate, id]);

  // Memoized handler for rejection reason change
  const handleRejectionReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRejectionReason(e.target.value);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleNavigateBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              Reimbursement Details
            </h1>
            <p className="text-muted-foreground mt-1">Claim Code: {reimbursement.claim_code || `CLM-${reimbursement.id}`}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit() && (
            <Button variant="outline" onClick={handleNavigateEdit}>
              Edit
            </Button>
          )}
          {canApprove() && (
            <>
              <Button
                variant="outline"
                className="text-primary hover:text-primary/80 hover:bg-primary/10"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Claim Information */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(reimbursement.status)}
                Claim Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(parseFloat(reimbursement.amount || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Category</p>
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {reimbursement.category || 'N/A'}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Description</p>
                <p className="text-sm">{reimbursement.description || 'No description provided'}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <StatusBadge variant={
                    reimbursement.status === 'Pending' || reimbursement.status === 'Waiting for Approval' ? 'warning' :
                    reimbursement.status.includes('Approved') ? 'success' :
                    reimbursement.status.includes('Rejected') ? 'error' : 'neutral'
                  }>
                    {reimbursement.status}
                  </StatusBadge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Approval Level</p>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="w-fit">
                      {reimbursement.current_approval_level || 'Level 2'}
                    </Badge>
                    {reimbursement.current_approval_level === 'Level 2' && reimbursement.pending_level_1_manager_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Waiting for: <span className="font-medium">{reimbursement.pending_level_1_manager_name}</span>
                      </p>
                    )}
                    {reimbursement.current_approval_level === 'Super Admin' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Waiting for: <span className="font-medium">Super Admin</span>
                      </p>
                    )}
                    {reimbursement.current_approval_level === 'Completed' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Approval completed
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attachments ({reimbursement.attachments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reimbursement.attachments && reimbursement.attachments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {reimbursement.attachments.map((attachment: any) => (
                    <div key={attachment.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {attachment.mime_type?.startsWith('image/') ? (
                            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                              <ImageIcon className="h-5 w-5 text-blue-600" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                              <FileText className="h-5 w-5 text-red-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.original_filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              const url = getImageUrl(attachment.path);
                              if (url) {
                                window.open(url, '_blank');
                              }
                            }}
                            title="View in new tab"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              const url = getImageUrl(attachment.path);
                              if (url) {
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = attachment.original_filename;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canEdit() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                              disabled={deleteAttachmentMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {attachment.mime_type?.startsWith('image/') && (
                        <div className="mt-3 rounded-lg overflow-hidden border">
                          <img
                            src={getImageUrl(attachment.path)}
                            alt={attachment.original_filename}
                            className="w-full h-32 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No attachments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Employee Info */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Name</p>
                <p className="font-medium">{reimbursement.employee_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Employee Code</p>
                <p className="font-medium">{reimbursement.emp_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="text-sm">{reimbursement.employee_email || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Submitted</p>
                <p className="text-sm font-medium">
                  {new Date(reimbursement.submitted_at || reimbursement.created_at).toLocaleString()}
                </p>
              </div>
              
              {/* Pending Approval Info */}
              {reimbursement.status === 'Pending' && reimbursement.current_approval_level === 'Level 2' && reimbursement.pending_level_1_manager_name && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Waiting for Approval</p>
                  <p className="text-xs text-muted-foreground">
                    Level 1 Manager: <span className="font-medium">{reimbursement.pending_level_1_manager_name}</span>
                  </p>
                </div>
              )}
              
              {reimbursement.status === 'Waiting for Approval' && reimbursement.current_approval_level === 'Super Admin' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Waiting for Approval</p>
                  <p className="text-xs text-muted-foreground">
                    Waiting for: <span className="font-medium">Super Admin</span>
                  </p>
                </div>
              )}
              
              {reimbursement.status === 'Level 1 Approved' && reimbursement.current_approval_level === 'Super Admin' && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Approved by Level 1</p>
                  <p className="text-xs text-muted-foreground">
                    Now waiting for: <span className="font-medium">Super Admin</span>
                  </p>
                </div>
              )}
              
              {reimbursement.level_1_approved_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Level 1 Approved</p>
                  <p className="text-sm font-medium text-primary">
                    {new Date(reimbursement.level_1_approved_at).toLocaleString()}
                  </p>
                  {reimbursement.level_1_approver_name && (
                    <p className="text-xs text-muted-foreground">by {reimbursement.level_1_approver_name}</p>
                  )}
                </div>
              )}
              
              {reimbursement.level_1_rejected_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Level 1 Rejected</p>
                  <p className="text-sm font-medium text-red-600">
                    {new Date(reimbursement.level_1_rejected_at).toLocaleString()}
                  </p>
                  {reimbursement.level_1_rejector_name && (
                    <p className="text-xs text-muted-foreground">by {reimbursement.level_1_rejector_name}</p>
                  )}
                  {reimbursement.level_1_rejection_reason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Reason: {reimbursement.level_1_rejection_reason}
                    </p>
                  )}
                </div>
              )}
              
              {reimbursement.super_admin_approved_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Super Admin Approved</p>
                  <p className="text-sm font-medium text-primary">
                    {new Date(reimbursement.super_admin_approved_at).toLocaleString()}
                  </p>
                  {reimbursement.super_admin_approver_name && (
                    <p className="text-xs text-muted-foreground">by {reimbursement.super_admin_approver_name}</p>
                  )}
                </div>
              )}
              
              {reimbursement.super_admin_rejected_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Super Admin Rejected</p>
                  <p className="text-sm font-medium text-red-600">
                    {new Date(reimbursement.super_admin_rejected_at).toLocaleString()}
                  </p>
                  {reimbursement.super_admin_rejector_name && (
                    <p className="text-xs text-muted-foreground">by {reimbursement.super_admin_rejector_name}</p>
                  )}
                  {reimbursement.super_admin_rejection_reason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Reason: {reimbursement.super_admin_rejection_reason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Reimbursement Claim</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this reimbursement claim. This will be visible to the employee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={handleRejectionReasonChange}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-red-600 hover:bg-red-700"
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Claim'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
