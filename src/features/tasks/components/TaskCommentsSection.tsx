import { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, MessageSquare, User, Send, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { tasksApi } from "@/features/tasks/api";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

interface TaskCommentsSectionProps {
  taskId: number;
}

export const TaskCommentsSection = memo(function TaskCommentsSection({ taskId }: TaskCommentsSectionProps) {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => tasksApi.getComments(taskId),
    staleTime: 1000 * 60 * 2, // 2 minutes (comments may change more frequently)
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const comments = commentsData?.data || [];

  // Organize comments into tree structure
  const { rootComments } = useMemo(() => {
    const commentMap = new Map();
    const rootComments: any[] = [];

    comments.forEach((comment: any) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach((comment: any) => {
      const commentNode = commentMap.get(comment.id);
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(commentNode);
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    return { rootComments };
  }, [comments]);

  const createCommentMutation = useMutation({
    mutationFn: (data: { comment: string; parent_comment_id?: number }) =>
      tasksApi.createComment(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      setCommentText('');
      setReplyingTo(null);
      toast({ title: "Success", description: "Comment added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add comment.", variant: "destructive" });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate({
      comment: commentText,
      parent_comment_id: replyingTo || undefined,
    });
  }, [commentText, replyingTo, createCommentMutation]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setCommentText('');
  }, []);

  const handleReply = useCallback((commentId: number) => {
    setReplyingTo(commentId);
  }, []);

  const formatTimeAgo = useCallback((date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  return (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <div className="space-y-2">
        <Label>Add Comment</Label>
        <Textarea
          placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between">
          {replyingTo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelReply}
            >
              Cancel Reply
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!commentText.trim() || createCommentMutation.isPending}
            size="sm"
          >
            <Send className="mr-2 h-4 w-4" />
            {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Clock className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : rootComments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rootComments.map((comment: any) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{comment.user_name || 'Unknown'}</p>
                    {comment.user_role && (
                      <Badge variant="outline" className="text-xs">
                        {comment.user_role}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => handleReply(comment.id)}
                  >
                    <Reply className="mr-1 h-3 w-3" />
                    Reply
                  </Button>
                </div>
              </div>
              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-11 space-y-2 border-l-2 border-muted pl-4">
                  {comment.replies.map((reply: any) => (
                    <div key={reply.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-medium">{reply.user_name || 'Unknown'}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">{reply.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

