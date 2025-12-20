import { useQuery } from "@tanstack/react-query";
import { Loader2, FolderKanban, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/auth";
import { PageTitle } from "@/components/ui/page-title";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectsApi } from "@/features/projects/api";
import { holidaysApi } from "@/features/holidays/api";
import { format, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || "Client";

  // Fetch assigned projects for client
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["client-projects"],
    queryFn: () => projectsApi.getAll({ my_projects: 1 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch next holidays
  const { data: holidaysData, isLoading: isLoadingHolidays } = useQuery({
    queryKey: ["next-holidays"],
    queryFn: () => holidaysApi.getAll({ is_restricted: false }),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projects = projectsData?.data || [];
  const allHolidays = holidaysData?.data || [];

  // Get next 5 upcoming holidays
  const nextHolidays = allHolidays
    .filter((holiday: any) => {
      const holidayDate = new Date(holiday.date);
      return isAfter(holidayDate, new Date()) || format(holidayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // Calculate project stats
  const projectStats = {
    total: projects.length,
    inProgress: projects.filter((p: any) => p.status === 'In Progress').length,
    completed: projects.filter((p: any) => p.status === 'Completed').length,
    onHold: projects.filter((p: any) => p.status === 'On Hold').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-500';
      case 'Completed':
        return 'bg-green-500';
      case 'On Hold':
        return 'bg-amber-500';
      case 'Planning':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'default';
      case 'Completed':
        return 'success';
      case 'On Hold':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle
          title="Dashboard"
          icon={FolderKanban}
          description={`Welcome back, ${userName}`}
        />
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{projectStats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{projectStats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{projectStats.onHold}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Projects</CardTitle>
            <CardDescription>Projects you have access to</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No projects assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project: any) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      // Use UUID if available, otherwise use numeric ID
                      const projectIdentifier = project.uuid || project.id;
                      navigate(`/client/projects/${projectIdentifier}`);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{project.name}</h4>
                        <Badge variant={getStatusBadgeVariant(project.status) as any}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.project_code || `PRJ-${String(project.id).padStart(3, '0')}`}
                      </p>
                      {project.progress !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                getStatusColor(project.status)
                              )}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {projects.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate('/client/projects')}
                  >
                    View All Projects ({projects.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Holidays */}
        <Card>
          <CardHeader>
            <CardTitle>Next Holidays</CardTitle>
            <CardDescription>Upcoming holidays</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHolidays ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : nextHolidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming holidays</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nextHolidays.map((holiday: any) => {
                  const holidayDate = new Date(holiday.date);
                  const isToday = format(holidayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const daysUntil = Math.ceil((holidayDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={holiday.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        isToday && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-12 h-12 rounded-lg",
                          isToday ? "bg-blue-500 text-white" : "bg-primary/10 text-primary"
                        )}>
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{holiday.holiday_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(holidayDate, 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isToday ? (
                          <Badge variant="default">Today</Badge>
                        ) : daysUntil === 1 ? (
                          <Badge variant="secondary">Tomorrow</Badge>
                        ) : (
                          <Badge variant="outline">{daysUntil} days</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

