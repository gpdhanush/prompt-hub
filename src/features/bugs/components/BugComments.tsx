import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Reply, Send, Clock, User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { bugsApi } from "@/features/bugs/api";
import { employeesApi } from "@/features/employees/api";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { setupMessageListener } from "@/lib/firebase";
import { getProfilePhotoUrl } from "@/lib/imageUtils";

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

export const BugComments = memo(function BugComments({ bugId }: BugCommentsProps) {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: commentsData, isLoading, refetch } = useQuery({
    queryKey: ['bug-comments', bugId],
    queryFn: () => bugsApi.getComments(bugId),
    staleTime: 1000 * 30, // 30 seconds (comments change frequently)
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting
    refetchInterval: 1000 * 10, // Poll every 10 seconds for real-time updates
  });

  // Fetch employees to get profile photos
  const { data: employeesData } = useQuery({
    queryKey: ['employees-for-comments'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000, include_all: 'true' }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const comments = commentsData?.data || [];
  const allEmployees = employeesData?.data || [];

  // Create a map of user_id to profile_photo_url
  const userPhotoMap = useMemo(() => {
    const map = new Map<number, string | null>();
    allEmployees.forEach((emp: any) => {
      if (emp.user_id) {
        map.set(emp.user_id, emp.profile_photo_url || null);
      }
    });
    return map;
  }, [allEmployees]);

  // Listen for FCM notifications about bug comments and refetch
  useEffect(() => {
    const cleanup = setupMessageListener((payload) => {
      // Check if this is a bug comment notification for this bug
      const data = payload.data || {};
      const notificationType = data.type;
      const notificationBugId = data.bugId ? parseInt(data.bugId, 10) : null;

      if (
        (notificationType === 'bug_comment' || notificationType === 'bug_comment_reply') &&
        notificationBugId === bugId
      ) {
        // Refetch comments when a new comment/reply is received for this bug
        refetch();
      }
    });

    return cleanup;
  }, [bugId, refetch]);

  // Organize comments into tree structure (API already returns tree, but ensure structure)
  const { rootComments } = useMemo(() => {
    const commentMap = new Map();
    const rootComments: any[] = [];

    comments.forEach((comment: any) => {
      commentMap.set(comment.id, { ...comment, replies: comment.replies || [] });
    });

    comments.forEach((comment: any) => {
      const commentNode = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
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
    mutationFn: (data: { comment_text: string; parent_id?: number }) =>
      bugsApi.createComment(bugId, data),
    onSuccess: async () => {
      // Invalidate and immediately refetch to show new comment
      await queryClient.invalidateQueries({ queryKey: ['bug-comments', bugId] });
      await queryClient.refetchQueries({ queryKey: ['bug-comments', bugId] });
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
      comment_text: commentText,
      parent_id: undefined,
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
      comment_text: replyText,
      parent_id: parentCommentId,
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

  // Parse text and convert URLs to clickable links
  const renderTextWithLinks = useCallback((text: string): React.ReactNode => {
    if (!text) return text;

    // URL regex pattern - matches http://, https://, www., and common domains
    // Excludes trailing punctuation (., !, ?, ,, ;, :) from the URL match
    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        parts.push(<span key={`text-${key++}`}>{beforeText}</span>);
      }

      // Process the URL
      let url = match[0];
      let originalUrl = url;
      
      // Remove trailing punctuation from URL (but keep it in the text)
      const trailingPunctuation = /[.,!?;:]+$/.exec(url);
      let trailingPunct = '';
      if (trailingPunctuation) {
        trailingPunct = trailingPunctuation[0];
        url = url.slice(0, -trailingPunct.length);
      }

      // Add protocol if missing (for www. or domain-only URLs)
      let hrefUrl = url;
      if (!hrefUrl.startsWith('http://') && !hrefUrl.startsWith('https://')) {
        hrefUrl = `https://${hrefUrl}`;
      }

      // Add the link
      parts.push(
        <a
          key={`link-${key++}`}
          href={hrefUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      );
      
      // Add trailing punctuation as regular text
      if (trailingPunct) {
        parts.push(<span key={`text-${key++}`}>{trailingPunct}</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last URL
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(<span key={`text-${key++}`}>{remainingText}</span>);
    }

    // If no URLs found, return the original text
    return parts.length > 0 ? parts : text;
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
    renderTextWithLinks,
    userPhotoMap,
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
    renderTextWithLinks: (text: string) => React.ReactNode;
    userPhotoMap: Map<number, string | null>;
    depth?: number;
  }) => {
    const isReplying = replyingTo === comment.id;
    const isRootComment = depth === 0;
    const replyText = replyTexts[comment.id] || '';
    const isExpanded = expandedComments.has(comment.id);
    const isLong = isCommentLong(comment.comment_text);
    const profilePhotoUrl = comment.user_id ? userPhotoMap.get(comment.user_id) : null;
    const photoUrl = getProfilePhotoUrl(profilePhotoUrl || null);
    const userInitials = comment.user_name ? comment.user_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

    return (
      <div className="space-y-2">
        <div className={`flex items-start gap-3 p-3 rounded-lg ${
          isRootComment 
            ? 'bg-muted border border-border' 
            : 'bg-muted/80 border border-border/50'
        }`}>
          <Avatar className={`${isRootComment ? 'h-8 w-8' : 'h-6 w-6'} flex-shrink-0`}>
            <AvatarImage 
              src={photoUrl} 
              alt={comment.user_name || 'User'}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/20 text-primary border border-primary/30">
              {userInitials}
            </AvatarFallback>
          </Avatar>
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
              <div 
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
                {renderTextWithLinks(comment.comment_text)}
              </div>
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
          <div className="ml-11 space-y-2 p-3 rounded-lg bg-muted/90 border border-primary/30" dir="ltr">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.setAttribute('dir', 'ltr');
                target.setAttribute('lang', 'en');
                target.style.direction = 'ltr';
                target.style.textAlign = 'left';
                target.style.unicodeBidi = 'embed';
                target.style.writingMode = 'horizontal-tb';
                onReplyTextChange(comment.id, e.target.value);
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
                
                // Handle Enter key to submit reply (Shift+Enter for new line)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const replyText = replyTexts[comment.id] || '';
                  if (replyText.trim() && !createCommentMutation.isPending) {
                    onReplySubmit(comment.id);
                  }
                }
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
              className="text-sm"
              autoFocus
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
                renderTextWithLinks={renderTextWithLinks}
                userPhotoMap={userPhotoMap}
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
            
            // Handle Enter key to submit (Shift+Enter for new line)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (commentText.trim() && !createCommentMutation.isPending) {
                handleSubmit();
              }
            }
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
              renderTextWithLinks={renderTextWithLinks}
              userPhotoMap={userPhotoMap}
            />
          ))}
        </div>
      )}
    </div>
  );
});
