import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowLeft, Paperclip, User, MessageSquare, UserCheck, Settings, AlertTriangle, Calendar, Clock, MoreHorizontal, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { appIssuesApi, type AppIssueDetail, type AppIssueReply } from '../api';
import { getStatusBadgeColor, getStatusLabel, formatAppIssueType } from '../utils/utils';
import { APP_ISSUE_STATUSES } from '../utils/constants';
import { usersApi } from '@/features/users/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { format } from 'date-fns';

// Format date to 'DD-MMM-YYYY hh:mm:ss a'
const formatDateTime = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd-MMM-yyyy hh:mm:ss a');
  } catch {
    return dateString;
  }
};

export default function AdminAppIssueDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState('');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-app-issue', uuid],
    queryFn: () => appIssuesApi.getAdminIssue(uuid!),
    enabled: !!uuid,
  });

  const issue = data?.data;

  // Fetch users for assignment dropdown
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-for-dropdown', userSearchQuery],
    queryFn: () => usersApi.getForDropdown({
      search: userSearchQuery || '',
      limit: 20
    }),
    enabled: userSearchOpen, // Enable when dropdown is open
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const users = usersData?.data || [];

  // Mutations
  const addReplyMutation = useMutation({
    mutationFn: (message: string) => appIssuesApi.addAdminReply(uuid!, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-app-issue', uuid] });
      setReplyMessage('');
      toast({
        title: 'Success',
        description: 'Reply added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add reply',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => appIssuesApi.updateStatus(uuid!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-app-issue', uuid] });
      queryClient.invalidateQueries({ queryKey: ['admin-app-issues'] });
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (assigned_to?: number) => appIssuesApi.assignIssue(uuid!, assigned_to),
    onSuccess: (_, assigned_to) => {
      queryClient.invalidateQueries({ queryKey: ['admin-app-issue', uuid] });
      queryClient.invalidateQueries({ queryKey: ['admin-app-issues'] });
      toast({
        title: 'Success',
        description: assigned_to ? 'User assigned successfully' : 'User unassigned successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update assignment',
        variant: 'destructive',
      });
    },
  });


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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <Card className="shadow-xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-6" />
                <h2 className="text-xl font-semibold mb-2">App Issue Not Found</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  The app issue you're trying to access doesn't exist or may have been removed.
                </p>

                <div className="text-left bg-muted/50 p-4 rounded-lg text-sm mb-6 max-w-lg mx-auto">
                  <p className="font-medium mb-2">Possible causes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>The issue was deleted or resolved</li>
                    <li>You followed an outdated link or bookmark</li>
                    <li>The issue ID is from a different environment</li>
                    <li>Database tables may not be properly set up</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate('/admin/app-issues')}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Issues List
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleAddReply = () => {
    if (!replyMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Reply message cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    addReplyMutation.mutate(replyMessage);
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/app-issues')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Issues
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
                {issue.is_anonymous && (
                  <Badge variant="secondary">Anonymous Submission</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Submitted by: {issue.submitted_by}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Reported on: {formatDateTime(issue.created_at)}</span>
                </div>
                {issue.assigned_to_name && (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <span>Assigned to: {issue.assigned_to_name}</span>
                  </div>
                )}
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
                        {formatDateTime(attachment.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Actions
            <Badge variant="outline" className="ml-auto">
              Quick Actions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Update */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <label className="text-sm font-medium">Update Status</label>
              </div>
              <Select
                value={issue?.status || ''}
                onValueChange={(value) => {
                  if (value && value !== issue?.status) {
                    updateStatusMutation.mutate(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {APP_ISSUE_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updateStatusMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 animate-spin" />
                  Updating status...
                </div>
              )}
            </div>

            {/* Assignment */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <label className="text-sm font-medium">Assign To User</label>
              </div>
              <Popover open={userSearchOpen} onOpenChange={(open) => {
                setUserSearchOpen(open);
                if (!open) {
                  setUserSearchQuery(''); // Reset search when closing
                }
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between whitespace-nowrap h-10"
                  >
                    {issue?.assigned_to_name || "Select user to assign..."}
                    <UserCheck className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command className="w-full" shouldFilter={false}>
                    <CommandInput
                      placeholder="Search users by name or email..."
                      value={userSearchQuery}
                      onValueChange={setUserSearchQuery}
                    />
                    <CommandEmpty>
                      {usersLoading ? 'Loading users...' : userSearchQuery ? 'No users found.' : 'No users available.'}
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {usersLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : users.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          {userSearchQuery ? 'No users found.' : 'Start typing to search for users...'}
                        </div>
                      ) : (
                        <>
                          <CommandItem
                            value=""
                            onSelect={() => {
                              assignMutation.mutate(undefined);
                              setUserSearchOpen(false);
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            <span>Unassign</span>
                          </CommandItem>
                          {users.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id.toString()}
                              onSelect={(value) => {
                                if (value && value !== issue?.assigned_to?.toString()) {
                                  assignMutation.mutate(parseInt(value));
                                }
                                setUserSearchOpen(false);
                              }}
                            >
                              <CheckCircle2
                                className={`mr-2 h-4 w-4 ${
                                  issue?.assigned_to?.toString() === user.id.toString() ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </>
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {assignMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 animate-spin" />
                  Updating assignment...
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Reply */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Add Reply
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Type your reply here..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={4}
            />
            <Button
              onClick={handleAddReply}
              disabled={addReplyMutation.isPending || !replyMessage.trim()}
            >
              {addReplyMutation.isPending ? 'Sending...' : 'Send Reply'}
            </Button>
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
                          {formatDateTime(reply.created_at)}
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
