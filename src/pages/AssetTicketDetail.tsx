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
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { assetsApi } from "@/features/assets/api";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { getItemSync } from "@/lib/secureStorage";
import { API_CONFIG } from "@/lib/config";

export default function AssetTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ticketId = parseInt(id || '0');

  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileComment, setFileComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userStr = getItemSync('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdmin = ['Super Admin', 'Admin'].includes(currentUser?.role || '');

  // Fetch ticket details
  const { data: ticketData, isLoading: ticketLoading, error: ticketError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => assetsApi.getTicketById(ticketId),
    enabled: ticketId > 0,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading, error: commentsError } = useQuery({
    queryKey: ['ticket-comments', ticketId],
    queryFn: () => assetsApi.getTicketComments(ticketId),
    enabled: ticketId > 0,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });

  // Fetch attachments
  const { data: attachmentsData, isLoading: attachmentsLoading, error: attachmentsError } = useQuery({
    queryKey: ['ticket-attachments', ticketId],
    queryFn: () => assetsApi.getTicketAttachments(ticketId),
    enabled: ticketId > 0,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });

  const ticket = ticketData?.data;
  const comments = commentsData?.data || [];
  const attachments = attachmentsData?.data || [];

  // Check if APIs are available (not 404)
  const ticketApiAvailable = !ticketError || ticketError?.status !== 404;
  const commentsApiAvailable = !commentsError || commentsError?.status !== 404;
  const attachmentsApiAvailable = !attachmentsError || attachmentsError?.status !== 404;

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: { comment: string; is_internal?: boolean }) =>
      assetsApi.addTicketComment(ticketId, data),
    onSuccess: () => {
      setComment("");
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Upload attachment mutation
  const uploadAttachmentMutation = useMutation({
    mutationFn: (data: { file: File; comment?: string }) =>
      assetsApi.uploadTicketAttachment(ticketId, data.file, data.comment),
    onSuccess: () => {
      setSelectedFile(null);
      setFileComment("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ['ticket-attachments', ticketId] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  // Update ticket status mutation
  const updateTicketMutation = useMutation({
    mutationFn: (data: any) => assetsApi.updateTicket(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
    },
  });

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      assetsApi.deleteTicketAttachment(ticketId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-attachments', ticketId] });
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attachment",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addCommentMutation.mutate({ comment: comment.trim(), is_internal: isInternal });
  };

  const handleFileUpload = () => {
    if (!selectedFile) return;
    uploadAttachmentMutation.mutate({
      file: selectedFile,
      comment: fileComment.trim() || undefined
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleViewAttachment = (attachment: any) => {
    if (attachment.file_url) {
      // Construct full URL if file_url is relative
      const baseUrl = API_CONFIG.SERVER_URL || 'http://localhost:3001';
      const url = attachment.file_url.startsWith('http') 
        ? attachment.file_url 
        : `${baseUrl}${attachment.file_url}`;
      window.open(url, '_blank');
    }
  };

  const handleDownloadAttachment = (attachment: any) => {
    if (attachment.file_url) {
      // Construct full URL if file_url is relative
      const baseUrl = API_CONFIG.SERVER_URL || 'http://localhost:3001';
      const url = attachment.file_url.startsWith('http') 
        ? attachment.file_url 
        : `${baseUrl}${attachment.file_url}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (ticketLoading && ticketApiAvailable) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!ticketApiAvailable) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Ticket Detail API Not Available</h2>
          <p className="text-muted-foreground mt-2">
            The backend API for ticket details is not yet implemented.
          </p>
          <Button onClick={() => navigate('/it-assets/tickets')} className="mt-4">
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Ticket not found</h2>
          <Button onClick={() => navigate('/it-assets/tickets')} className="mt-4">
            Back to Tickets
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
            variant="ghost"
            size="sm"
            onClick={() => navigate('/it-assets/tickets')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Ticket #{ticket.ticket_number}</h1>
                <p className="text-muted-foreground mt-1">{ticket.subject}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ticket Details</CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    variant={
                      ticket.priority === "urgent"
                        ? "error"
                        : ticket.priority === "high"
                        ? "warning"
                        : "info"
                    }
                  >
                    {ticket.priority} Priority
                  </StatusBadge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Type</Label>
                  <div>
                    <Badge variant="outline" className="capitalize">
                      {ticket.ticket_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Priority</Label>
                  <div>
                    <StatusBadge
                      variant={
                        ticket.priority === "urgent"
                          ? "error"
                          : ticket.priority === "high"
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
                        ticket.status === "closed"
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
                  <p className="text-sm font-medium">
                    {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(ticket.created_at), "HH:mm")}
                  </p>
                </div>
              </div>

              {ticket.description && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <MarkdownRenderer content={ticket.description} />
                  </div>
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
          <Card>
            <CardHeader>
              <CardTitle>Comments & Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              {!commentsApiAvailable ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Comments feature is not yet available (API not implemented)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                            className="rounded"
                          />
                          Internal comment (admins only)
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
              )}

              <Separator />

              {/* Comments List */}
              <div className="space-y-4">
                {!commentsApiAvailable ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Comments feature is not yet available (API not implemented)
                    </p>
                  </div>
                ) : commentsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No comments yet
                  </p>
                ) : (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {Boolean(comment.is_admin) ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.user_name}
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
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Requester
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {ticket.employee_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{ticket.employee_name}</p>
                    <p className="text-sm text-muted-foreground">ID: {ticket.emp_code}</p>
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

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!attachmentsApiAvailable ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    File upload feature is not yet available (API not implemented)
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,.json,.xml"
                      onChange={handleFileSelect}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported: Images, PDF, Word docs, Excel, PowerPoint, Archives, Text files (max 50MB)
                    </p>
                  </div>

                  {selectedFile && (
                    <div>
                      <Textarea
                        placeholder="Add a comment for this file (optional)"
                        value={fileComment}
                        onChange={(e) => setFileComment(e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploadAttachmentMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90"
                    size="sm"
                  >
                    {uploadAttachmentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Paperclip className="h-4 w-4 mr-2" />
                    )}
                    Upload File
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments ({attachments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {!attachmentsApiAvailable ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Attachments feature is not yet available (API not implemented)
                  </p>
                </div>
              ) : attachmentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No attachments
                </p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment: any) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(attachment.filename)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.file_size)} • {format(new Date(attachment.created_at), "MMM dd")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAttachment(attachment)}
                          title="View in new tab"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                          disabled={deleteAttachmentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}