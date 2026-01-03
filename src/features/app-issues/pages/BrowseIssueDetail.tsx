import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft, MessageSquare, Paperclip, Bug, Clock, FileText, CheckCircle, AlertTriangle, User, Eye } from 'lucide-react';
import { appIssuesApi, type AppIssueDetail } from '../api';
import { getStatusBadgeColor, getStatusLabel, formatAppIssueType } from '../utils/utils';
import { PageTitle } from '@/components/ui/page-title';

export default function BrowseIssueDetail() {
  const navigate = useNavigate();
  const { uuid } = useParams<{ uuid: string }>();
  const [showAttachments, setShowAttachments] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['browse-issue-detail', uuid],
    queryFn: () => appIssuesApi.getIssue(uuid!),
    enabled: !!uuid,
  });

  const issue = data?.data;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading issue details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Issue Not Found</h2>
                <p className="text-muted-foreground">
                  The issue you're looking for doesn't exist or you don't have access to it.
                </p>
              </div>
              <Button onClick={() => navigate('/app-issues/browse')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Browse Issues
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app-issues/browse')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse Issues
          </Button>
        </div>

        <PageTitle
          title={`Issue: ${issue.title}`}
          description="Read-only view of reported issue"
        />

        {/* Issue Details */}
        <div className="grid gap-6">
          {/* Main Issue Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{issue.title}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={issue.issue_type === 'bug' ? 'destructive' : 'secondary'}>
                      {formatAppIssueType(issue.issue_type)}
                    </Badge>
                    <Badge variant={getStatusBadgeColor(issue.status)}>
                      {getStatusLabel(issue.status)}
                    </Badge>
                    {issue.is_anonymous === 1 && (
                      <Badge variant="outline">
                        Anonymous
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Issue #{issue.id}</div>
                  <div>{formatDate(issue.created_at)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="whitespace-pre-wrap">{issue.description}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Submitted by:</span>
                    <span>{issue.submitted_by}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Created:</span>
                    <span>{formatDate(issue.created_at)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Replies:</span>
                    <span>{issue.replies?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Attachments:</span>
                    <span>{issue.attachments?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {issue.attachments && issue.attachments.length > 0 && (
                <div>
                  <Button
                    variant="outline"
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="mb-3"
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    {showAttachments ? 'Hide' : 'Show'} Attachments ({issue.attachments.length})
                  </Button>

                  {showAttachments && (
                    <div className="space-y-2">
                      {issue.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <a
                              href={attachment.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              Attachment #{attachment.id}
                            </a>
                            <p className="text-xs text-muted-foreground">
                              Uploaded on {formatDate(attachment.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Replies/Comments */}
          {issue.replies && issue.replies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Discussion ({issue.replies.length} replies)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {issue.replies.map((reply) => (
                    <div key={reply.id} className="border-l-2 border-muted pl-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{reply.user_name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="whitespace-pre-wrap text-sm">{reply.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-muted/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <h3 className="font-medium mb-1">Read-Only View</h3>
                <p className="text-sm text-muted-foreground">
                  This is a read-only view for browsing. You can view issue details and discussions,
                  but cannot make changes or add replies here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
