import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Download,
  Trash2,
  Send,
  User,
  Shield,
  Image as ImageIcon,
  FileText,
  Ticket,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SecureTextarea } from "@/components/ui/secure-textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { assetsApi } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getItemSync } from "@/lib/secureStorage";
import { API_CONFIG } from "@/lib/config";
import { getImageUrl } from "@/lib/imageUtils";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";

export default function SupportTicketView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ticketId = parseInt(id || '0');

  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileComment, setFileComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { validateInput, securityAlertProps } = useSecurityValidation();

  const userStr = getItemSync('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdmin = ['Super Admin', 'Admin'].includes(currentUser?.role || '');

  // Fetch ticket details
  const { data: ticketData, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => assetsApi.getTicketById(ticketId),
    enabled: ticketId > 0,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['support-ticket-comments', ticketId],
    queryFn: () => assetsApi.getTicketComments(ticketId),
    enabled: ticketId > 0,
  });

  // Fetch attachments
  const { data: attachmentsData, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['support-ticket-attachments', ticketId],
    queryFn: () => assetsApi.getTicketAttachments(ticketId),
    enabled: ticketId > 0,
  });

  const ticket = ticketData?.data;
  const comments = commentsData?.data || [];
  const attachments = attachmentsData?.data || [];
  const isTicketOwner = ticket && currentUser && ticket.employee_user_id === currentUser.id;

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: { comment: string; is_internal?: boolean }) =>
      assetsApi.addTicketComment(ticketId, data),
    onSuccess: () => {
      setComment("");
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['support-ticket-comments', ticketId] });
      toast({ title: "Success", description: "Comment added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: (data: any) => assetsApi.updateTicket(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      toast({ title: "Success", description: "Ticket updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
    },
  });

  // Reopen ticket mutation (for users)
  const reopenTicketMutation = useMutation({
    mutationFn: () => assetsApi.reopenTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      toast({ title: "Success", description: "Ticket reopened successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reopen ticket",
        variant: "destructive",
      });
    },
  });

  // Upload attachment mutation
  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => assetsApi.uploadTicketAttachment(ticketId, file, fileComment),
    onSuccess: () => {
      setSelectedFile(null);
      setFileComment("");
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['support-ticket-attachments', ticketId] });
      toast({ title: "Success", description: "File uploaded successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => assetsApi.deleteTicketAttachment(ticketId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket-attachments', ticketId] });
      toast({ title: "Success", description: "File deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (!comment.trim()) return;
    // Validate and sanitize comment
    const sanitizedComment = validateInput(comment.trim(), 'Comment');
    addCommentMutation.mutate({ comment: sanitizedComment, is_internal: isInternal });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadFile = () => {
    if (!selectedFile) return;
    uploadAttachmentMutation.mutate(selectedFile);
  };

  const handleViewFile = (attachment: any) => {
    const baseUrl = API_CONFIG.SERVER_URL || 'http://localhost:3001';
    const url = attachment.file_url?.startsWith('http')
      ? attachment.file_url
      : `${baseUrl}${attachment.file_url}`;
    window.open(url, '_blank');
  };

  const handleDownloadFile = (attachment: any) => {
    const baseUrl = API_CONFIG.SERVER_URL || 'http://localhost:3001';
    const url = attachment.file_url?.startsWith('http')
      ? attachment.file_url
      : `${baseUrl}${attachment.file_url}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.original_filename || attachment.filename || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'resolved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'closed':
        return <CheckCircle2 className="h-5 w-5 text-gray-600" />;
      default:
        return <Ticket className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ticketError && (ticketError as any)?.status === 404) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="p-4 rounded-lg bg-destructive/10">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Ticket not found</h2>
            <p className="text-muted-foreground mb-4">
              The ticket you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/support')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Support Tickets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket && !ticketLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="p-4 rounded-lg bg-destructive/10">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Ticket not found</h2>
            <p className="text-muted-foreground mb-4">
              The ticket you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/support')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Support Tickets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/support')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
                <p className="text-muted-foreground mt-1">{ticket.subject}</p>
              </div>
            </div>
          </div>
        </div>
        <StatusBadge
          variant={
            ticket.status === "closed" || ticket.status === "resolved"
              ? "success"
              : ticket.status === "open"
              ? "info"
              : ticket.status === "rejected"
              ? "error"
              : "warning"
          }
        >
          {ticket.status.replace('_', ' ')}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(ticket.status)}
                  Ticket Details
                </CardTitle>
                <StatusBadge
                  variant={
                    ticket.priority === "high" || ticket.priority === "urgent"
                      ? "error"
                      : ticket.priority === "medium"
                      ? "warning"
                      : "info"
                  }
                >
                  {ticket.priority} Priority
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Type</Label>
                  <div>
                    <Badge variant="outline" className="capitalize">
                      {ticket.ticket_type?.replace('_', ' ') || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Priority</Label>
                  <div>
                    <StatusBadge
                      variant={
                        ticket.priority === "high" || ticket.priority === "urgent"
                          ? "error"
                          : ticket.priority === "medium"
                          ? "warning"
                          : "info"
                      }
                    >
                      {ticket.priority}
                    </StatusBadge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Status</Label>
                  <div>
                    <StatusBadge
                      variant={
                        ticket.status === "closed" || ticket.status === "resolved"
                          ? "success"
                          : ticket.status === "open"
                          ? "info"
                          : ticket.status === "rejected"
                          ? "error"
                          : "warning"
                      }
                    >
                      {ticket.status.replace('_', ' ')}
                    </StatusBadge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Created</Label>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <p className="font-medium">
                      {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(ticket.created_at), "HH:mm")}
                  </p>
                </div>
              </div>

              {ticket.description && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {ticket.description}
                    </p>
                  </div>
                </div>
              )}

              {/* User Reopen Button (for ticket owner) */}
              {!isAdmin && isTicketOwner && (ticket.status === 'closed' || ticket.status === 'resolved') && (
                <div className="pt-4 border-t space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Ticket Status</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      This ticket is {ticket.status}. You can reopen it if you need further assistance.
                    </p>
                  </div>
                  <Button
                    onClick={() => reopenTicketMutation.mutate()}
                    disabled={reopenTicketMutation.isPending}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {reopenTicketMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Reopening...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Reopen Ticket
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Admin Status Update */}
              {isAdmin && (
                <div className="pt-4 border-t space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Update Status</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Change the ticket status to reflect current progress
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(value) =>
                        updateTicketMutation.mutate({ status: value })
                      }
                      disabled={updateTicketMutation.isPending}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        {(ticket.status === 'closed' || ticket.status === 'resolved') && (
                          <SelectItem value="reopen">Reopen</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {updateTicketMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Comments & Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="space-y-3">
                <SecureTextarea
                  fieldName="Comment"
                  placeholder="Add a comment or update..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        Internal comment
                      </label>
                    )}
                  </div>
                  <Button
                    onClick={handleAddComment}
                    disabled={!comment.trim() || addCommentMutation.isPending}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Add Comment
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Comments List */}
              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {Boolean(comment.is_admin) ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm">
                            {comment.user_name || 'Unknown User'}
                          </span>
                          {Boolean(comment.is_admin) && (
                            <Badge variant="secondary" className="text-xs">
                              Admin
                            </Badge>
                          )}
                          {Boolean(comment.is_internal) && (
                            <Badge variant="outline" className="text-xs">
                              Internal
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "MMM dd, yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{comment.comment}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requester Info */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Requester
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                      {ticket.employee_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{ticket.employee_name || 'Unknown'}</p>
                    {ticket.emp_code && (
                      <p className="text-sm text-muted-foreground">ID: {ticket.emp_code}</p>
                    )}
                  </div>
                </div>
                {ticket.asset_code && (
                  <div className="pt-3 border-t space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Related Asset</Label>
                    <div>
                      <p className="text-sm font-medium">{ticket.asset_code}</p>
                      {ticket.brand && ticket.model && (
                        <p className="text-xs text-muted-foreground">
                          {ticket.brand} {ticket.model}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload File */}
              <div className="space-y-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt"
                  onChange={handleFileSelect}
                  className="text-sm"
                />
                {selectedFile && (
                  <div className="space-y-2">
                    <SecureTextarea
                      fieldName="File Comment"
                      placeholder="Add a comment (optional)"
                      value={fileComment}
                      onChange={(e) => setFileComment(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleUploadFile}
                      disabled={uploadAttachmentMutation.isPending}
                      size="sm"
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      {uploadAttachmentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Paperclip className="h-4 w-4 mr-2" />
                      )}
                      Upload File
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Attachments List */}
              {attachmentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No attachments
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {attachment.mime_type?.startsWith('image/') ? (
                          <ImageIcon className="h-4 w-4 text-blue-600 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.original_filename || attachment.filename}
                          </p>
                          {attachment.size && (
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.size)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewFile(attachment)}
                          title="View in new tab"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownloadFile(attachment)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {(isAdmin || attachment.uploaded_by === currentUser?.id) && (
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <SecurityAlertDialog {...securityAlertProps} />
    </div>
  );
}
