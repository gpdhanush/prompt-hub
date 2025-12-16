import { memo, useMemo, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/features/reports/api";
import { auditLogsApi } from "@/features/audit-logs/api";
import { format } from "date-fns";
import ReminderCalendar from "./ReminderCalendar";

interface AdminDashboardProps {
  formatTimeAgo: (date: string) => string;
}

const AdminDashboard = memo(function AdminDashboard({
  formatTimeAgo,
}: AdminDashboardProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Fetch project stats for analysis
  const { data: projectStatsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["reports", "projects"],
    queryFn: () => reportsApi.getProjectStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch recent audit logs
  const { data: auditLogsData, isLoading: isLoadingAuditLogs } = useQuery({
    queryKey: ["audit-logs", "recent"],
    queryFn: () => auditLogsApi.getAll({ page: 1, limit: 10 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const projectStats = useMemo(
    () => projectStatsData?.data || [],
    [projectStatsData]
  );
  const recentAuditLogs = useMemo(
    () => auditLogsData?.data || [],
    [auditLogsData]
  );

  // Calculate project analysis stats
  const projectAnalysis = useMemo(
    () => ({
      total: projectStats.length,
      inProgress: projectStats.filter(
        (p: any) =>
          p.status === "In Progress" ||
          p.status === "Testing" ||
          p.status === "Pre-Prod" ||
          p.status === "Production"
      ).length,
      completed: projectStats.filter(
        (p: any) => p.status === "Completed"
      ).length,
      onHold: projectStats.filter((p: any) => p.status === "On Hold").length,
      averageProgress:
        projectStats.length > 0
          ? Math.round(
              projectStats.reduce(
                (acc: number, p: any) => acc + (p.progress || 0),
                0
              ) / projectStats.length
            )
          : 0,
      totalTasks: projectStats.reduce(
        (acc: number, p: any) => acc + (p.tasks || 0),
        0
      ),
      totalBugs: projectStats.reduce(
        (acc: number, p: any) => acc + (p.bugs || 0),
        0
      ),
    }),
    [projectStats]
  );

  const getActionIcon = useCallback((action: string) => {
    switch (action) {
      case "CREATE":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "UPDATE":
        return <Activity className="h-4 w-4 text-blue-600" />;
      case "DELETE":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  }, []);

  const getActionColor = useCallback((action: string) => {
    switch (action) {
      case "CREATE":
        return "text-green-600 bg-green-50 dark:bg-green-950/20";
      case "UPDATE":
        return "text-blue-600 bg-blue-50 dark:bg-blue-950/20";
      case "DELETE":
        return "text-red-600 bg-red-50 dark:bg-red-950/20";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-950/20";
    }
  }, []);

  return (
    <>
      {/* Project Analysis Section */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Overall Project Analysis
              </CardTitle>
              <CardDescription className="mt-1">
                Comprehensive overview of all projects
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/projects")}
            >
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingProjects ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Project Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Projects
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {projectAnalysis.total}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                  <p className="text-sm text-muted-foreground mb-1">
                    In Progress
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {projectAnalysis.inProgress}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
                  <p className="text-sm text-muted-foreground mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {projectAnalysis.completed}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                  <p className="text-sm text-muted-foreground mb-1">On Hold</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {projectAnalysis.onHold}
                  </p>
                </div>
              </div>

              {/* Average Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Average Project Progress</p>
                  <p className="text-sm font-bold text-primary">
                    {projectAnalysis.averageProgress}%
                  </p>
                </div>
                <Progress
                  value={projectAnalysis.averageProgress}
                  className="h-2"
                />
              </div>

              {/* Project Summary */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Tasks
                  </p>
                  <p className="text-lg font-semibold">
                    {projectAnalysis.totalTasks}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Bugs
                  </p>
                  <p className="text-lg font-semibold">
                    {projectAnalysis.totalBugs}
                  </p>
                </div>
              </div>

              {/* Top Projects by Progress */}
              {projectStats.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-semibold">Top Projects by Progress</p>
                  <div className="space-y-2">
                    {projectStats
                      .sort((a: any, b: any) => (b.progress || 0) - (a.progress || 0))
                      .slice(0, 5)
                      .map((project: any) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {project.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress
                                value={project.progress || 0}
                                className="h-1.5 flex-1"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {project.progress || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity & Calendar - Side by Side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Calendar for Reminders */}
        <ReminderCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        {/* Recent Activity (from Audit Logs) */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/audit-logs")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAuditLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : recentAuditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAuditLogs.slice(0, 5).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate("/audit-logs")}
                  >
                    <div
                      className={cn("p-1.5 rounded-md", getActionColor(log.action))}
                    >
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {log.user_name || "System"}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {log.action}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.module} • {formatTimeAgo(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
});

AdminDashboard.displayName = "AdminDashboard";

export default AdminDashboard;

