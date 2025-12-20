import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageTitle } from "@/components/ui/page-title";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectsApi } from "@/features/projects/api";
import { format } from "date-fns";

export default function ClientReleases() {
  const navigate = useNavigate();

  // Fetch assigned projects for client
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["client-projects-releases"],
    queryFn: () => projectsApi.getAll({ my_projects: 1 }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projects = projectsData?.data || [];

  // Get all releases from assigned projects
  // Note: This assumes projects have a releases array. If not, we'll need to fetch separately
  const allReleases = projects
    .flatMap((project: any) => {
      // If project has releases array, use it. Otherwise, we might need a separate API call
      if (!project.releases || !Array.isArray(project.releases)) return [];
      return project.releases.map((release: any) => ({
        ...release,
        projectName: project.name,
        projectId: project.id,
        projectUuid: project.uuid,
      }));
    })
    .sort((a: any, b: any) => {
      const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
      const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
      return dateB - dateA; // Most recent first
    });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Releases"
        icon={FileText}
        description="View release versions for your assigned projects"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : allReleases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No releases found for your assigned projects.</p>
            <p className="text-sm text-muted-foreground">
              Release information will appear here when available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allReleases.map((release: any, index: number) => (
            <Card key={release.id || index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {release.version || `Release ${index + 1}`}
                      {release.is_current && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {release.projectName}
                    </CardDescription>
                  </div>
                  {release.release_date && (
                    <div className="text-right">
                      <div className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(release.release_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              {release.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{release.notes}</p>
                  {release.projectUuid && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => navigate(`/client/projects/${release.projectUuid || release.projectId}`)}
                    >
                      View Project
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

