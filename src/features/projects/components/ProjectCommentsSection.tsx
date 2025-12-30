import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, MessageSquare, Send, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { projectsApi } from "@/features/projects/api";
import { employeesApi } from "@/features/employees/api";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { getProfilePhotoUrl } from "@/lib/imageUtils";

interface ProjectCommentsSectionProps {
  projectId: number;
}

export const ProjectCommentsSection = memo(function ProjectCommentsSection({ projectId }: ProjectCommentsSectionProps) {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const isClient = currentUser?.role === 'CLIENT' || currentUser?.role === 'Client';
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRefs = useRef<Record<number, HTMLTextAreaElement>>({});

  const { data: commentsData, isLoading, refetch } = useQuery({
    queryKey: ['project-comments', projectId],
    queryFn: () => projectsApi.getComments(projectId),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 10, // Poll every 10 seconds
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
    mutationFn: (data: { comment: string; comment_type?: string; parent_comment_id?: number }) =>
      projectsApi.createComment(projectId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-comments', projectId] });
      await queryClient.refetchQueries({ queryKey: ['project-comments', projectId] });
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
      comment_type: isClient ? 'Client' : 'General',
      parent_comment_id: undefined,
    });
  }, [commentText, createCommentMutation, isClient]);

  const handleReply = useCallback((commentId: number) => {
    setReplyingTo(commentId);
    setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
  }, []);

  const handleReplySubmit = useCallback((parentCommentId: number) => {
    const replyText = replyTexts[parentCommentId];
    if (!replyText?.trim()) return;
    
    createCommentMutation.mutate({
      comment: replyText,
      comment_type: isClient ? 'Client' : 'General',
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
  }, [replyTexts, createCommentMutation, isClient]);

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

  const isCommentLong = useCallback((text: string) => {
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

  // Generate initials from user name
  const getInitials = useCallback((name: string | null | undefined): string => {
    if (!name || !name.trim()) return 'U';
    
    const parts = name.trim().split(/\s+/);
    
    if (parts.length >= 2) {
      // 2+ words: use first letter of first 2 words
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else {
      // 1 word: use first 2 letters
      return parts[0].substring(0, 2).toUpperCase();
    }
  }, []);

  const renderTextWithLinks = useCallback((text: string): React.ReactNode => {
    if (!text) return text;

    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = urlRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        parts.push(<span key={`text-${key++}`}>{beforeText}</span>);
      }

      let url = match[0];
      const trailingPunctuation = /[.,!?;:]+$/.exec(url);
      let trailingPunct = '';
      if (trailingPunctuation) {
        trailingPunct = trailingPunctuation[0];
        url = url.slice(0, -trailingPunct.length);
      }

      let hrefUrl = url;
      if (!hrefUrl.startsWith('http://') && !hrefUrl.startsWith('https://')) {
        hrefUrl = `https://${hrefUrl}`;
      }

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
      
      if (trailingPunct) {
        parts.push(<span key={`text-${key++}`}>{trailingPunct}</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(<span key={`text-${key++}`}>{remainingText}</span>);
    }

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
    getInitials,
    replyTextareaRefs,
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
    getInitials: (name: string | null | undefined) => string;
    replyTextareaRefs: React.MutableRefObject<Record<number, HTMLTextAreaElement>>;
    depth?: number;
  }) => {
    const isReplying = replyingTo === comment.id;
    const isRootComment = depth === 0;
    const replyText = replyTexts[comment.id] || '';
    const isExpanded = expandedComments.has(comment.id);
    const isLong = isCommentLong(comment.comment);
    const profilePhotoUrl = comment.user_id ? userPhotoMap.get(comment.user_id) : null;
    const photoUrl = getProfilePhotoUrl(profilePhotoUrl || null);
    const userInitials = getInitials(comment.user_name);

    // Ensure textarea maintains LTR direction when replying starts
    useEffect(() => {
      if (isReplying && replyTextareaRefs.current[comment.id]) {
        const textarea = replyTextareaRefs.current[comment.id];
        // Force LTR direction
        textarea.setAttribute('dir', 'ltr');
        textarea.setAttribute('lang', 'en');
        textarea.style.direction = 'ltr';
        textarea.style.textAlign = 'left';
        textarea.style.unicodeBidi = 'embed';
        textarea.style.writingMode = 'horizontal-tb';
      }
    }, [isReplying, comment.id]);

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
              {comment.comment_type && isRootComment && (
                <Badge variant="outline" className="text-xs">
                  {comment.comment_type}
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
                {renderTextWithLinks(comment.comment)}
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

        {/* Reply Input Box */}
        {isReplying && (
          <div className="ml-11 space-y-2 p-3 rounded-lg bg-muted/90 border border-primary/30" dir="ltr" style={{ direction: 'ltr' }}>
            <Textarea
              ref={(el) => {
                if (el) {
                  replyTextareaRefs.current[comment.id] = el;
                  // Force LTR direction
                  el.setAttribute('dir', 'ltr');
                  el.setAttribute('lang', 'en');
                  el.style.direction = 'ltr';
                  el.style.textAlign = 'left';
                  el.style.unicodeBidi = 'embed';
                  el.style.writingMode = 'horizontal-tb';
                } else {
                  delete replyTextareaRefs.current[comment.id];
                }
              }}
              key={`reply-textarea-${comment.id}`}
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const newValue = target.value;
                const cursorPosition = target.selectionStart;
                
                // Update state
                onReplyTextChange(comment.id, newValue);
                
                // Preserve cursor position after state update
                requestAnimationFrame(() => {
                  if (replyTextareaRefs.current[comment.id]) {
                    const textarea = replyTextareaRefs.current[comment.id];
                    const newPosition = Math.min(cursorPosition, newValue.length);
                    textarea.setSelectionRange(newPosition, newPosition);
                    textarea.focus();
                  }
                });
              }}
              onInput={(e) => {
                // Additional safeguard on input event
                const target = e.target as HTMLTextAreaElement;
                target.setAttribute('dir', 'ltr');
                target.style.direction = 'ltr';
                target.style.textAlign = 'left';
              }}
              rows={3}
              className="text-sm"
              autoFocus
              dir="ltr"
              style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'embed' }}
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
                getInitials={getInitials}
                replyTextareaRefs={replyTextareaRefs}
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
      {/* Add Comment Form */}
      <div className="space-y-2">
        <Label>Add Comment</Label>
        <Textarea
          ref={commentTextareaRef}
          placeholder="Write a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (commentText.trim() && !createCommentMutation.isPending) {
                handleSubmit();
              }
            }
          }}
          rows={3}
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
              getInitials={getInitials}
              replyTextareaRefs={replyTextareaRefs}
            />
          ))}
        </div>
      )}
    </div>
  );
});

