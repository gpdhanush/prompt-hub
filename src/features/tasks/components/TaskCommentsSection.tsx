import { useState, useMemo, useCallback, memo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, MessageSquare, User, Send, Reply, ChevronDown, ChevronUp } from "lucide-react";
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
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

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
    // Top form is only for new top-level comments, not replies
    createCommentMutation.mutate({
      comment: commentText,
      parent_comment_id: undefined,
    });
  }, [commentText, createCommentMutation]);

  const handleReply = useCallback((commentId: number) => {
    setReplyingTo(commentId);
    setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
  }, []);

  const handleReplySubmit = useCallback((parentCommentId: number) => {
    const replyText = replyTexts[parentCommentId];
    if (!replyText?.trim()) return;
    
    createCommentMutation.mutate({
      comment: replyText,
      parent_comment_id: parentCommentId,
    }, {
      onSuccess: () => {
        setReplyTexts(prev => {
          const newTexts = { ...prev };
          delete newTexts[parentCommentId];
          return newTexts;
        });
        setReplyingTo(null);
      }
    });
  }, [replyTexts, createCommentMutation]);

  const handleReplyCancel = useCallback((commentId: number) => {
    setReplyTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[commentId];
      return newTexts;
    });
    setReplyingTo(null);
  }, []);

  const setReplyText = useCallback((commentId: number, text: string) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: text }));
  }, []);

  const toggleCommentExpand = useCallback((commentId: number) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  }, []);

  // Check if comment text exceeds 2 lines
  const isCommentLong = useCallback((text: string) => {
    // Approximate: 2 lines = ~100 characters (adjust based on your design)
    return text.length > 100 || text.split('\n').length > 2;
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

  // Comment Item Component
  const CommentItem = ({ 
    comment, 
    replyingTo, 
    replyTexts, 
    onReply, 
    onReplyTextChange, 
    onReplySubmit, 
    onReplyCancel,
    formatTimeAgo,
    createCommentMutation,
    expandedComments,
    onToggleExpand,
    isCommentLong,
    depth = 0 
  }: { 
    comment: any; 
    replyingTo: number | null;
    replyTexts: Record<number, string>;
    onReply: (id: number) => void;
    onReplyTextChange: (commentId: number, text: string) => void;
    onReplySubmit: (id: number) => void;
    onReplyCancel: (id: number) => void;
    formatTimeAgo: (date: string) => string;
    createCommentMutation: any;
    expandedComments: Set<number>;
    onToggleExpand: (id: number) => void;
    isCommentLong: (text: string) => boolean;
    depth?: number;
  }) => {
    const isReplying = replyingTo === comment.id;
    const isRootComment = depth === 0;
    const replyText = replyTexts[comment.id] || '';
    const isExpanded = expandedComments.has(comment.id);
    const isLong = isCommentLong(comment.comment);

    return (
      <div className="space-y-2">
        <div className={`flex items-start gap-3 p-3 rounded-lg ${isRootComment ? 'bg-muted/50' : 'bg-muted/30'}`}>
          <div className={`${isRootComment ? 'h-8 w-8' : 'h-6 w-6'} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0`}>
            <User className={`${isRootComment ? 'h-4 w-4' : 'h-3 w-3'} text-primary`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`${isRootComment ? 'text-sm' : 'text-xs'} font-medium`}>{comment.user_name || 'Unknown'}</p>
              {comment.user_role && isRootComment && (
                <Badge variant="outline" className="text-xs">
                  {comment.user_role}
                </Badge>
              )}
              <span className={`${isRootComment ? 'text-xs' : 'text-[10px]'} text-muted-foreground`}>
                {formatTimeAgo(comment.created_at)}
              </span>
            </div>
            <div>
              <p 
                className={`${isRootComment ? 'text-sm' : 'text-xs'} whitespace-pre-wrap ${
                  isLong && !isExpanded ? 'overflow-hidden' : ''
                }`}
                style={isLong && !isExpanded ? {
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                } : {}}
              >
                {comment.comment}
              </p>
              {isLong && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`mt-1 h-6 text-xs text-primary`}
                  onClick={() => onToggleExpand(comment.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3 w-3" />
                      ... more
                    </>
                  )}
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`mt-2 ${isRootComment ? 'h-7 text-xs' : 'h-6 text-[10px]'}`}
              onClick={() => onReply(comment.id)}
            >
              <Reply className={`mr-1 ${isRootComment ? 'h-3 w-3' : 'h-2.5 w-2.5'}`} />
              Reply
            </Button>
          </div>
        </div>

        {/* Reply Input Box - appears inline below the comment */}
        {isReplying && (
          <div className="ml-11 space-y-2 p-3 rounded-lg bg-muted/30 border border-primary/20" dir="ltr">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => onReplyTextChange(comment.id, e.target.value)}
              rows={3}
              className="text-sm"
              autoFocus
              dir="ltr"
              style={{ 
                direction: 'ltr', 
                textAlign: 'left'
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onReplySubmit(comment.id)}
                disabled={!replyText.trim() || createCommentMutation.isPending}
              >
                <Send className="mr-1 h-3 w-3" />
                {createCommentMutation.isPending ? 'Posting...' : 'Reply'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReplyCancel(comment.id)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-11 space-y-2 border-l-2 border-muted pl-4">
            {comment.replies.map((reply: any) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                replyingTo={replyingTo}
                replyTexts={replyTexts}
                onReply={onReply}
                onReplyTextChange={onReplyTextChange}
                onReplySubmit={onReplySubmit}
                onReplyCancel={onReplyCancel}
                formatTimeAgo={formatTimeAgo}
                createCommentMutation={createCommentMutation}
                expandedComments={expandedComments}
                onToggleExpand={onToggleExpand}
                isCommentLong={isCommentLong}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Add Comment Form - Only for new top-level comments */}
      <div className="space-y-2" dir="ltr">
        <Label>Add Comment</Label>
        <Textarea
          ref={commentTextareaRef}
          placeholder="Write a comment..."
          value={commentText}
          onChange={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.setAttribute('dir', 'ltr');
            target.setAttribute('lang', 'en');
            target.style.direction = 'ltr';
            target.style.textAlign = 'left';
            target.style.unicodeBidi = 'embed';
            target.style.writingMode = 'horizontal-tb';
            setCommentText(e.target.value);
            // Ensure cursor is at the end (right side in LTR)
            requestAnimationFrame(() => {
              const length = target.value.length;
              target.setSelectionRange(length, length);
            });
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.setAttribute('dir', 'ltr');
            target.setAttribute('lang', 'en');
            target.style.direction = 'ltr';
            target.style.textAlign = 'left';
            target.style.unicodeBidi = 'embed';
            target.style.writingMode = 'horizontal-tb';
            // Ensure cursor is at the end
            requestAnimationFrame(() => {
              const length = target.value.length;
              target.setSelectionRange(length, length);
            });
          }}
          onKeyDown={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.setAttribute('dir', 'ltr');
            target.style.direction = 'ltr';
            target.style.textAlign = 'left';
          }}
          onKeyUp={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.setAttribute('dir', 'ltr');
            target.style.direction = 'ltr';
            target.style.textAlign = 'left';
            // Ensure cursor position is correct
            requestAnimationFrame(() => {
              const length = target.value.length;
              const cursorPos = target.selectionStart;
              // If cursor is at start, move to end
              if (cursorPos === 0 && length > 0) {
                target.setSelectionRange(length, length);
              }
            });
          }}
          onFocus={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.setAttribute('dir', 'ltr');
            target.setAttribute('lang', 'en');
            target.style.direction = 'ltr';
            target.style.textAlign = 'left';
            target.style.unicodeBidi = 'embed';
            target.style.writingMode = 'horizontal-tb';
            // Move cursor to end when focused
            requestAnimationFrame(() => {
              const length = target.value.length;
              target.setSelectionRange(length, length);
            });
          }}
          onBlur={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.setAttribute('dir', 'ltr');
            target.style.direction = 'ltr';
            target.style.textAlign = 'left';
            target.style.unicodeBidi = 'embed';
            target.style.writingMode = 'horizontal-tb';
          }}
          rows={3}
          dir="ltr"
          lang="en"
          inputMode="text"
          spellCheck={false}
          style={{ 
            direction: 'ltr', 
            textAlign: 'left',
            unicodeBidi: 'embed',
            writingMode: 'horizontal-tb'
          }}
        />
        <div className="flex items-center justify-end">
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
            <CommentItem
              key={comment.id}
              comment={comment}
              replyingTo={replyingTo}
              replyTexts={replyTexts}
              onReply={handleReply}
              onReplyTextChange={setReplyText}
              onReplySubmit={handleReplySubmit}
              onReplyCancel={handleReplyCancel}
              formatTimeAgo={formatTimeAgo}
              createCommentMutation={createCommentMutation}
              expandedComments={expandedComments}
              onToggleExpand={toggleCommentExpand}
              isCommentLong={isCommentLong}
            />
          ))}
        </div>
      )}
    </div>
  );
});

