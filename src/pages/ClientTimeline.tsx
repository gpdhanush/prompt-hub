import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { projectsApi } from "@/features/projects/api";
import { format } from "date-fns";

export default function ClientTimeline() {
  // Fetch assigned projects for client
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["client-projects-timeline"],
    queryFn: () => projectsApi.getAll({ my_projects: 1 }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projects = projectsData?.data || [];

  // Get all milestones from assigned projects
  const allMilestones = projects
    .flatMap((project: any) => {
      if (!project.milestones || !Array.isArray(project.milestones)) return [];
      return project.milestones.map((milestone: any) => ({
        ...milestone,
        projectName: project.name,
        projectCode: project.project_code || `PRJ-${String(project.id).padStart(3, '0')}`,
      }));
    })
    .sort((a: any, b: any) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return dateA - dateB;
    });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Project Timeline"
        icon={Calendar}
        description="View milestones and timelines for your assigned projects"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : allMilestones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">No milestones found for your assigned projects.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allMilestones.map((milestone: any, index: number) => (
            <Card key={milestone.id || index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{milestone.name}</CardTitle>
                    <CardDescription>
                      {milestone.projectName} ({milestone.projectCode})
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {milestone.start_date && format(new Date(milestone.start_date), 'MMM d, yyyy')}
                      {milestone.end_date && ` - ${format(new Date(milestone.end_date), 'MMM d, yyyy')}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Status: {milestone.status || 'Not Started'}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

