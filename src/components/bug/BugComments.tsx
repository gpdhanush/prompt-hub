import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Reply, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { bugsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";

interface Comment {
  id: number;
  bug_id: number;
  user_id: number;
  parent_id: number | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  user_role: string;
  replies?: Comment[];
}

interface BugCommentsProps {
  bugId: number;
}

export function BugComments({ bugId }: BugCommentsProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const replyTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  // Get current user info
  const currentUser = getCurrentUser();

  // Fetch comments
  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['bug-comments', bugId],
    queryFn: () => bugsApi.getComments(bugId),
  });

  const comments = commentsData?.data || [];

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (data: { comment_text: string; parent_id?: number }) =>
      bugsApi.createComment(bugId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-comments', bugId] });
      setNewComment("");
      setReplyingTo(null);
      setReplyTexts({});
      toast({ title: "Success", description: "Comment added successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a comment.",
        variant: "destructive",
      });
      return;
    }
    createCommentMutation.mutate({ comment_text: newComment });
  };

  const handleSubmitReply = useCallback((parentId: number) => {
    const replyText = replyTexts[parentId] || "";
    if (!replyText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a reply.",
        variant: "destructive",
      });
      return;
    }
    createCommentMutation.mutate({ comment_text: replyText, parent_id: parentId });
  }, [replyTexts, createCommentMutation]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleColor = (role: string) => {
    if (role === 'Tester') return 'bg-blue-500';
    if (role === 'Developer') return 'bg-green-500';
    if (role === 'Designer') return 'bg-purple-500';
    if (role === 'Team Lead' || role === 'Super Admin' || role === 'Admin') return 'bg-orange-500';
    return 'bg-gray-500';
  };

  // Focus the reply textarea when replying starts and force LTR direction
  useEffect(() => {
    if (replyingTo !== null) {
      // Small delay to ensure the textarea is rendered
      const timer = setTimeout(() => {
        const textarea = replyTextareaRefs.current[replyingTo];
        if (textarea) {
          // Force LTR direction multiple ways to ensure it sticks
          textarea.setAttribute('dir', 'ltr');
          textarea.setAttribute('lang', 'en');
          textarea.style.direction = 'ltr';
          textarea.style.textAlign = 'left';
          textarea.style.unicodeBidi = 'embed';
          textarea.style.writingMode = 'horizontal-tb';
          textarea.focus();
          // Set cursor to end
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [replyingTo]);

  // Monitor reply text changes and ensure LTR direction is maintained
  useEffect(() => {
    const observers: MutationObserver[] = [];
    
    Object.keys(replyTexts).forEach((commentIdStr) => {
      const commentId = parseInt(commentIdStr);
      const textarea = replyTextareaRefs.current[commentId];
      if (textarea) {
        // Continuously enforce LTR direction
        const enforceLTR = () => {
          textarea.setAttribute('dir', 'ltr');
          textarea.setAttribute('lang', 'en');
          textarea.style.direction = 'ltr';
          textarea.style.textAlign = 'left';
          textarea.style.unicodeBidi = 'embed';
          textarea.style.writingMode = 'horizontal-tb';
        };
        
        enforceLTR();
        
        // Use MutationObserver to watch for any direction changes
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'dir') {
              if (textarea.getAttribute('dir') !== 'ltr') {
                enforceLTR();
              }
            }
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
              if (textarea.style.direction !== 'ltr') {
                enforceLTR();
              }
            }
          });
        });
        
        observer.observe(textarea, {
          attributes: true,
          attributeFilter: ['dir', 'style'],
          subtree: false
        });
        
        observers.push(observer);
      }
    });
    
    return () => {
      observers.forEach(obs => obs.disconnect());
    };
  }, [replyTexts]);

  const setReplyText = useCallback((commentId: number, text: string) => {
    setReplyTexts(prev => ({ ...prev, [commentId]: text }));
  }, []);

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const isReplying = replyingTo === comment.id;
    const isCurrentUser = currentUser?.id === comment.user_id;
    const replyText = replyTexts[comment.id] || "";

    const handleReplyClick = useCallback(() => {
      if (isReplying) {
        setReplyingTo(null);
        setReplyTexts(prev => {
          const newTexts = { ...prev };
          delete newTexts[comment.id];
          return newTexts;
        });
      } else {
        setReplyingTo(comment.id);
        setReplyTexts(prev => ({ ...prev, [comment.id]: "" }));
      }
    }, [isReplying, comment.id]);

    const handleCancel = useCallback(() => {
      setReplyingTo(null);
      setReplyTexts(prev => {
        const newTexts = { ...prev };
        delete newTexts[comment.id];
        return newTexts;
      });
    }, [comment.id]);

    const handleReplyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const textarea = e.target;
      // Force LTR direction immediately
      textarea.setAttribute('dir', 'ltr');
      textarea.setAttribute('lang', 'en');
      textarea.style.direction = 'ltr';
      textarea.style.textAlign = 'left';
      textarea.style.unicodeBidi = 'embed';
      textarea.style.writingMode = 'horizontal-tb';
      
      // Get the new value
      const newValue = textarea.value;
      
      // Store cursor position
      const cursorPos = textarea.selectionStart;
      
      // Update state immediately
      setReplyText(comment.id, newValue);
      
      // Force LTR again after a microtask to ensure it sticks
      requestAnimationFrame(() => {
        if (replyTextareaRefs.current[comment.id]) {
          const el = replyTextareaRefs.current[comment.id];
          // Ensure direction is still LTR
          el.setAttribute('dir', 'ltr');
          el.setAttribute('lang', 'en');
          el.style.direction = 'ltr';
          el.style.textAlign = 'left';
          el.style.unicodeBidi = 'embed';
          el.style.writingMode = 'horizontal-tb';
          
          // Restore cursor position (at end for LTR)
          const length = el.value.length;
          const newCursorPos = Math.min(cursorPos + 1, length);
          el.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    }, [comment.id, setReplyText]);

    const handleSubmit = useCallback(() => {
      handleSubmitReply(comment.id);
    }, [comment.id, handleSubmitReply]);

    return (
      <div className={`space-y-3 ${depth > 0 ? 'ml-8 mt-3 border-l-2 border-muted pl-4' : ''}`} dir="ltr" style={{ direction: 'ltr' }}>
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={getRoleColor(comment.user_role)}>
              {comment.user_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1" dir="ltr" style={{ direction: 'ltr' }}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{comment.user_name}</span>
              <Badge variant="outline" className="text-xs">
                {comment.user_role}
              </Badge>
              {isCurrentUser && (
                <Badge variant="secondary" className="text-xs">
                  You
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.created_at)}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleReplyClick}
              >
                <Reply className="mr-1 h-3 w-3" />
                {isReplying ? "Cancel" : "Reply"}
              </Button>
            </div>
            {isReplying && (
              <div className="mt-2 space-y-2" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}>
                <Textarea
                  ref={(el) => {
                    if (el) {
                      replyTextareaRefs.current[comment.id] = el;
                      // Force LTR direction on the element with multiple methods
                      el.setAttribute('dir', 'ltr');
                      el.setAttribute('lang', 'en');
                      el.style.direction = 'ltr';
                      el.style.textAlign = 'left';
                      el.style.unicodeBidi = 'embed';
                      el.style.writingMode = 'horizontal-tb';
                      // Prevent browser RTL auto-detection by setting inputmode
                      el.setAttribute('inputmode', 'text');
                      // Ensure no RTL inheritance
                      el.style.unicodeBidi = 'embed';
                    } else {
                      delete replyTextareaRefs.current[comment.id];
                    }
                  }}
                  key={`reply-textarea-${comment.id}`}
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={handleReplyChange}
                  onInput={(e) => {
                    // Additional safeguard on input event
                    const target = e.target as HTMLTextAreaElement;
                    target.setAttribute('dir', 'ltr');
                    target.setAttribute('lang', 'en');
                    target.style.direction = 'ltr';
                    target.style.textAlign = 'left';
                    target.style.unicodeBidi = 'embed';
                    target.style.writingMode = 'horizontal-tb';
                    
                    // Ensure cursor is at the end (LTR behavior)
                    requestAnimationFrame(() => {
                      const length = target.value.length;
                      target.setSelectionRange(length, length);
                    });
                  }}
                  onKeyDown={(e) => {
                    // Force LTR on every keystroke
                    const target = e.target as HTMLTextAreaElement;
                    target.setAttribute('dir', 'ltr');
                    target.style.direction = 'ltr';
                  }}
                  onKeyUp={(e) => {
                    // Force LTR after keystroke
                    const target = e.target as HTMLTextAreaElement;
                    target.setAttribute('dir', 'ltr');
                    target.style.direction = 'ltr';
                    target.style.textAlign = 'left';
                  }}
                  onFocus={(e) => {
                    // Force LTR when focused
                    const target = e.target as HTMLTextAreaElement;
                    target.setAttribute('dir', 'ltr');
                    target.setAttribute('lang', 'en');
                    target.style.direction = 'ltr';
                    target.style.textAlign = 'left';
                    target.style.unicodeBidi = 'embed';
                    target.style.writingMode = 'horizontal-tb';
                  }}
                  onBlur={(e) => {
                    // Ensure LTR is maintained even when blurred
                    const target = e.target as HTMLTextAreaElement;
                    target.setAttribute('dir', 'ltr');
                    target.style.direction = 'ltr';
                  }}
                  rows={3}
                  className="text-sm"
                  autoFocus
                  spellCheck={false}
                  dir="ltr"
                  lang="en"
                  inputMode="text"
                  style={{ 
                    direction: 'ltr', 
                    textAlign: 'left', 
                    unicodeBidi: 'embed',
                    writingMode: 'horizontal-tb'
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={createCommentMutation.isPending}
                  >
                    <Send className="mr-1 h-3 w-3" />
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 mt-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new comment */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={createCommentMutation.isPending || !newComment.trim()}
            >
              <Send className="mr-2 h-4 w-4" />
              {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Comments list */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
