import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowLeft, Paperclip, User, Bug } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { appIssuesApi, type AppIssueDetail, type AppIssueReply } from '../api';
import { getStatusBadgeColor, getStatusLabel, formatAppIssueType } from '../utils/utils';

export default function AppIssueDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['app-issue', uuid],
    queryFn: () => appIssuesApi.getIssue(uuid!),
    enabled: !!uuid,
  });

  const issue = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading issue details...</p>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive font-semibold mb-2">Issue not found</p>
            <p className="text-muted-foreground">The issue you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button
              className="mt-4"
              onClick={() => navigate('/app-issues/my')}
            >
              Back to My Issues
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app-issues/my')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Issues
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{issue.title}</CardTitle>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline">
                  {formatAppIssueType(issue.issue_type)}
                </Badge>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(issue.status)}`}>
                  {getStatusLabel(issue.status)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{issue.description}</p>
              </div>
            </div>

            {issue.attachments && issue.attachments.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Attachments</h4>
                <div className="space-y-2">
                  {issue.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {attachment.file_url.split('/').pop()}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p>Reported on {new Date(issue.created_at).toLocaleString()}</p>
              {issue.is_anonymous && (
                <p className="text-orange-600 mt-1">
                  This issue was submitted anonymously
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replies Section */}
      {issue.replies && issue.replies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Replies ({issue.replies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issue.replies.map((reply: AppIssueReply, index: number) => (
                <div key={reply.id}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{reply.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="whitespace-pre-wrap text-sm">{reply.message}</p>
                      </div>
                    </div>
                  </div>
                  {index < issue.replies.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
