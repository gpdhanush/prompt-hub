import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageTitle } from "@/components/ui/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectsApi } from "@/features/projects/api";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ClientComments() {
  const navigate = useNavigate();

  // Fetch assigned projects for client
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["client-projects-comments"],
    queryFn: () => projectsApi.getAll({ my_projects: 1 }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projects = projectsData?.data || [];

  // Fetch comments for each project
  const projectIds = projects.map((p: any) => p.id).filter(Boolean);
  
  const { data: commentsData, isLoading: isLoadingComments } = useQuery({
    queryKey: ["client-project-comments", projectIds],
    queryFn: async () => {
      const commentsPromises = projectIds.map((projectId: number) =>
        projectsApi.getComments(projectId).catch(() => ({ data: [] }))
      );
      const results = await Promise.all(commentsPromises);
      return results.flatMap((result: any, index: number) => {
        const project = projects[index];
        return (result.data || []).map((comment: any) => ({
          ...comment,
          projectName: project?.name,
          projectId: project?.id,
          projectUuid: project?.uuid,
        }));
      });
    },
    enabled: projectIds.length > 0,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const allComments = (commentsData || []).sort((a: any, b: any) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA; // Most recent first
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Comments"
        icon={MessageSquare}
        description="View comments from your assigned projects"
      />

      {(isLoading || isLoadingComments) ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : allComments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No comments found for your assigned projects.</p>
            <p className="text-sm text-muted-foreground">
              Comments from project members will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allComments.map((comment: any, index: number) => {
            const userName = comment.user_name || comment.created_by_name || 'Unknown User';
            const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            
            return (
              <Card key={comment.id || index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{userName}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {comment.projectName}
                          </span>
                          {comment.comment_type && (
                            <Badge variant="outline" className="text-xs">
                              {comment.comment_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {comment.created_at && (
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{comment.comment || comment.encrypted_comment}</p>
                  {comment.projectUuid && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => navigate(`/client/projects/${comment.projectUuid || comment.projectId}`)}
                    >
                      View Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

