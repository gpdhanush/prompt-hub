import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Clock,
  CheckSquare,
  Bug,
  Award,
  Target,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reportsApi } from "@/lib/api";

export default function Reports() {
  const [period, setPeriod] = useState("month");

  // Fetch task metrics
  const { data: taskMetricsData, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['reports', 'tasks', period],
    queryFn: () => reportsApi.getTaskMetrics({ period }),
  });

  // Fetch bug metrics
  const { data: bugMetricsData, isLoading: isLoadingBugs } = useQuery({
    queryKey: ['reports', 'bugs', period],
    queryFn: () => reportsApi.getBugMetrics({ period }),
  });

  // Fetch leaderboard
  const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['reports', 'leaderboard', period],
    queryFn: () => reportsApi.getLeaderboard({ period, limit: 10 }),
  });

  // Fetch project stats
  const { data: projectStatsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['reports', 'projects'],
    queryFn: () => reportsApi.getProjectStats(),
  });

  // Fetch top performer
  const { data: topPerformerData, isLoading: isLoadingTopPerformer } = useQuery({
    queryKey: ['reports', 'top-performer', period],
    queryFn: () => reportsApi.getTopPerformer({ period }),
  });

  const taskMetrics = taskMetricsData?.data || {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    completionRate: 0,
    avgResolutionTime: "0 days",
  };

  const bugMetrics = bugMetricsData?.data || {
    total: 0,
    open: 0,
    fixed: 0,
    rejected: 0,
    fixRate: 0,
    avgFixTime: "0 days",
  };

  const leaderboard = leaderboardData?.data || [];
  const projectStats = projectStatsData?.data || [];
  const topPerformer = topPerformerData?.data;

  const isLoading = isLoadingTasks || isLoadingBugs || isLoadingLeaderboard || isLoadingProjects || isLoadingTopPerformer;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports & Leaderboard
          </h1>
          <p className="text-muted-foreground">Analytics, metrics, and performance reports</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Task Completion Rate</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskMetrics.completionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {taskMetrics.completed} of {taskMetrics.total} tasks
                </p>
                <div className="mt-2 flex items-center text-xs">
                  <TrendingUp className="mr-1 h-3 w-3 text-status-success" />
                  <span className="text-status-success">Completion rate</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bug Fix Rate</CardTitle>
                <Bug className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bugMetrics.fixRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {bugMetrics.fixed} of {bugMetrics.total} bugs fixed
                </p>
                <div className="mt-2 flex items-center text-xs">
                  <TrendingUp className="mr-1 h-3 w-3 text-status-success" />
                  <span className="text-status-success">Fix rate</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskMetrics.avgResolutionTime}</div>
                <p className="text-xs text-muted-foreground">Task completion time</p>
                <div className="mt-2 flex items-center text-xs">
                  <TrendingDown className="mr-1 h-3 w-3 text-status-success" />
                  <span className="text-status-success">Average time</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {topPerformer ? (
                  <>
                    <div className="text-2xl font-bold">{topPerformer.name || "N/A"}</div>
                    <p className="text-xs text-muted-foreground">Score: {topPerformer.score || 0}</p>
                    <div className="mt-2 flex items-center text-xs">
                      <Target className="mr-1 h-3 w-3 text-status-warning" />
                      <span className="text-status-warning">{topPerformer.productivity || 0}% productivity</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">N/A</div>
                    <p className="text-xs text-muted-foreground">No data available</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="leaderboard" className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="projects">Project Reports</TabsTrigger>
              <TabsTrigger value="tasks">Task Analytics</TabsTrigger>
              <TabsTrigger value="bugs">Bug Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Employee Leaderboard - {period.charAt(0).toUpperCase() + period.slice(1)}</CardTitle>
                  <CardDescription>Top performers based on tasks completed, bugs fixed, and productivity</CardDescription>
                </CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No leaderboard data available
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-center">Tasks</TableHead>
                          <TableHead className="text-center">Bugs Fixed</TableHead>
                          <TableHead className="text-center">Productivity</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboard.map((employee: any) => (
                          <TableRow key={employee.rank}>
                            <TableCell className="font-medium">{employee.rank}</TableCell>
                            <TableCell className="font-medium">{employee.name}</TableCell>
                            <TableCell className="text-center">{employee.tasks}</TableCell>
                            <TableCell className="text-center">{employee.bugs}</TableCell>
                            <TableCell className="text-center">
                              <StatusBadge variant={employee.productivity >= 90 ? "success" : employee.productivity >= 80 ? "info" : "neutral"}>
                                {employee.productivity}%
                              </StatusBadge>
                            </TableCell>
                            <TableCell className="text-right">
                              <StatusBadge variant={employee.score >= 95 ? "success" : employee.score >= 90 ? "info" : "neutral"}>
                                {employee.score}
                              </StatusBadge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Project Performance</CardTitle>
                  <CardDescription>Progress and metrics for all active projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {projectStats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No project data available
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead className="text-center">Tasks</TableHead>
                          <TableHead className="text-center">Bugs</TableHead>
                          <TableHead className="text-center">Members</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectStats.map((project: any) => (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">{project.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-muted">
                                  <div
                                    className="h-2 rounded-full bg-primary"
                                    style={{ width: `${project.progress}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground">{project.progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{project.tasks}</TableCell>
                            <TableCell className="text-center">{project.bugs}</TableCell>
                            <TableCell className="text-center">{project.members}</TableCell>
                            <TableCell className="text-right">
                              <StatusBadge variant={project.progress >= 80 ? "success" : project.progress >= 50 ? "info" : "warning"}>
                                {project.progress >= 80 ? "On Track" : project.progress >= 50 ? "In Progress" : "Planning"}
                              </StatusBadge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Task Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completed</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 rounded-full bg-muted">
                          <div 
                            className="h-2 rounded-full bg-status-success" 
                            style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{taskMetrics.completed}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">In Progress</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 rounded-full bg-muted">
                          <div 
                            className="h-2 rounded-full bg-status-info" 
                            style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.inProgress / taskMetrics.total) * 100 : 0}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{taskMetrics.inProgress}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 rounded-full bg-muted">
                          <div 
                            className="h-2 rounded-full bg-status-warning" 
                            style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.pending / taskMetrics.total) * 100 : 0}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{taskMetrics.pending}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Task Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Tasks</span>
                      <span className="font-medium">{taskMetrics.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Completion Rate</span>
                      <span className="font-medium">{taskMetrics.completionRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
                      <span className="font-medium">{taskMetrics.avgResolutionTime}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bugs" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Bug Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Open</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 rounded-full bg-muted">
                          <div 
                            className="h-2 rounded-full bg-status-error" 
                            style={{ width: `${bugMetrics.total > 0 ? (bugMetrics.open / bugMetrics.total) * 100 : 0}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{bugMetrics.open}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fixed</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 rounded-full bg-muted">
                          <div 
                            className="h-2 rounded-full bg-status-success" 
                            style={{ width: `${bugMetrics.total > 0 ? (bugMetrics.fixed / bugMetrics.total) * 100 : 0}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{bugMetrics.fixed}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rejected</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 rounded-full bg-muted">
                          <div 
                            className="h-2 rounded-full bg-status-neutral" 
                            style={{ width: `${bugMetrics.total > 0 ? (bugMetrics.rejected / bugMetrics.total) * 100 : 0}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{bugMetrics.rejected}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Bug Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Bugs</span>
                      <span className="font-medium">{bugMetrics.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fix Rate</span>
                      <span className="font-medium">{bugMetrics.fixRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Avg Fix Time</span>
                      <span className="font-medium">{bugMetrics.avgFixTime}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
