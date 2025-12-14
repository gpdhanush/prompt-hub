import { useState } from "react";
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
  Calendar,
  Search,
  FileSpreadsheet,
  Users,
  CalendarDays,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  PaginationWrapper as Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { reportsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { exportLeaveReport } from "@/utils/excelExport";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Leave report filters
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveStatus, setLeaveStatus] = useState<string>("all");
  const [leavePage, setLeavePage] = useState<number>(1);
  const [leaveLimit, setLeaveLimit] = useState<number>(10);

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

  // Fetch leave report
  const { data: leaveReportData, isLoading: isLoadingLeaves, refetch: refetchLeaves } = useQuery({
    queryKey: ['reports', 'leaves', selectedMonth, selectedYear, searchQuery, leaveStatus, leavePage, leaveLimit],
    queryFn: () => reportsApi.getLeaveReport({
      month: selectedMonth,
      year: selectedYear,
      search: searchQuery || undefined,
      status: leaveStatus !== 'all' ? leaveStatus : undefined,
      page: leavePage,
      limit: leaveLimit,
    }),
    enabled: activeTab === 'leaves',
  });

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    if (leavePage !== 1) {
      setLeavePage(1);
    }
  };

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
  const leaveReport = leaveReportData?.data || [];
  const leavePagination = leaveReportData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  const leaveSummary = leaveReportData?.summary || {
    total_leaves: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    cancelled: 0,
    total_days: 0,
  };

  const isLoading = isLoadingTasks || isLoadingBugs || isLoadingLeaderboard || isLoadingProjects || isLoadingTopPerformer;

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i).toLocaleString('default', { month: 'long' }),
  }));

  // Generate year options (last 5 years + current + next year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  // Handle CSV export - exports all filtered records, not just current page
  const handleExportLeaves = async () => {
    try {
      // Fetch all records for export (without pagination limit)
      const exportData = await reportsApi.getLeaveReport({
        month: selectedMonth,
        year: selectedYear,
        search: searchQuery || undefined,
        status: leaveStatus !== 'all' ? leaveStatus : undefined,
        page: 1,
        limit: 10000, // Large limit to get all records
      });
      
      exportLeaveReport(exportData.data, exportData.summary, selectedMonth, selectedYear);
      toast({
        title: "Success",
        description: "Leave report exported to CSV successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export leave report.",
        variant: "destructive",
      });
    }
  };

  // Menu items configuration
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Award },
    { id: 'projects', label: 'Projects', icon: Target },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'bugs', label: 'Bugs', icon: Bug },
    { id: 'leaves', label: 'Leaves', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          {activeTab !== 'leaves' && (
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
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Side Menu */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <Card className="glass-card border-2 lg:sticky lg:top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Report Sections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="grid grid-cols-2 lg:grid-cols-1 gap-1 p-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary-foreground' : ''}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">

          {/* Overview Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Key Metrics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card border-2 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Task Completion Rate</CardTitle>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CheckSquare className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{taskMetrics.completionRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {taskMetrics.completed} of {taskMetrics.total} tasks
                    </p>
                    <div className="mt-3 flex items-center text-xs">
                      <TrendingUp className="mr-1 h-3 w-3 text-status-success" />
                      <span className="text-status-success">Completion rate</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-2 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bug Fix Rate</CardTitle>
                    <div className="p-2 rounded-lg bg-status-error/10">
                      <Bug className="h-4 w-4 text-status-error" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{bugMetrics.fixRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bugMetrics.fixed} of {bugMetrics.total} bugs fixed
                    </p>
                    <div className="mt-3 flex items-center text-xs">
                      <TrendingUp className="mr-1 h-3 w-3 text-status-success" />
                      <span className="text-status-success">Fix rate</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-2 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                    <div className="p-2 rounded-lg bg-status-info/10">
                      <Clock className="h-4 w-4 text-status-info" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{taskMetrics.avgResolutionTime}</div>
                    <p className="text-xs text-muted-foreground mt-1">Task completion time</p>
                    <div className="mt-3 flex items-center text-xs">
                      <TrendingDown className="mr-1 h-3 w-3 text-status-success" />
                      <span className="text-status-success">Average time</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card border-2 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                    <div className="p-2 rounded-lg bg-status-warning/10">
                      <Award className="h-4 w-4 text-status-warning" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {topPerformer ? (
                      <>
                        <div className="text-2xl font-bold">{topPerformer.name || "N/A"}</div>
                        <p className="text-xs text-muted-foreground mt-1">Score: {topPerformer.score || 0}</p>
                        <div className="mt-3 flex items-center text-xs">
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
            </>
          )}
          </div>
          )}

          {/* Leaderboard Content */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
          <Card className="glass-card border-2">
            <CardHeader>
              <CardTitle>Employee Leaderboard - {period.charAt(0).toUpperCase() + period.slice(1)}</CardTitle>
              <CardDescription>Top performers based on tasks completed, bugs fixed, and productivity</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No leaderboard data available
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                        <TableRow key={employee.rank} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <Badge variant={employee.rank <= 3 ? "default" : "secondary"}>
                              #{employee.rank}
                            </Badge>
                          </TableCell>
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
                </div>
              )}
            </CardContent>
          </Card>
          </div>
          )}

          {/* Projects Content */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
          <Card className="glass-card border-2">
            <CardHeader>
              <CardTitle>Project Performance</CardTitle>
              <CardDescription>Progress and metrics for all active projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projectStats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No project data available
                </div>
              ) : (
                <div className="overflow-x-auto">
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
                        <TableRow key={project.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[150px]">
                              <div className="h-2 flex-1 rounded-full bg-muted">
                                <div
                                  className="h-2 rounded-full bg-primary transition-all"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground whitespace-nowrap">{project.progress}%</span>
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
                </div>
              )}
            </CardContent>
          </Card>
          </div>
          )}

          {/* Tasks Content */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card border-2">
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
                <CardDescription>Breakdown of tasks by status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-status-success transition-all" 
                        style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0}%` }} 
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{taskMetrics.completed}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">In Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-status-info transition-all" 
                        style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.inProgress / taskMetrics.total) * 100 : 0}%` }} 
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{taskMetrics.inProgress}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-status-warning transition-all" 
                        style={{ width: `${taskMetrics.total > 0 ? (taskMetrics.pending / taskMetrics.total) * 100 : 0}%` }} 
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{taskMetrics.pending}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-2">
              <CardHeader>
                <CardTitle>Task Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Tasks</span>
                  <span className="font-semibold text-lg">{taskMetrics.total}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="font-semibold text-lg">{taskMetrics.completionRate}%</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
                  <span className="font-semibold text-lg">{taskMetrics.avgResolutionTime}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
          )}

          {/* Bugs Content */}
          {activeTab === 'bugs' && (
            <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card border-2">
              <CardHeader>
                <CardTitle>Bug Status Distribution</CardTitle>
                <CardDescription>Breakdown of bugs by status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Open</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-status-error transition-all" 
                        style={{ width: `${bugMetrics.total > 0 ? (bugMetrics.open / bugMetrics.total) * 100 : 0}%` }} 
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{bugMetrics.open}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fixed</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-status-success transition-all" 
                        style={{ width: `${bugMetrics.total > 0 ? (bugMetrics.fixed / bugMetrics.total) * 100 : 0}%` }} 
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{bugMetrics.fixed}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rejected</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-status-neutral transition-all" 
                        style={{ width: `${bugMetrics.total > 0 ? (bugMetrics.rejected / bugMetrics.total) * 100 : 0}%` }} 
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{bugMetrics.rejected}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-2">
              <CardHeader>
                <CardTitle>Bug Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Bugs</span>
                  <span className="font-semibold text-lg">{bugMetrics.total}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Fix Rate</span>
                  <span className="font-semibold text-lg">{bugMetrics.fixRate}%</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Avg Fix Time</span>
                  <span className="font-semibold text-lg">{bugMetrics.avgFixTime}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
          )}

          {/* Leaves Content */}
          {activeTab === 'leaves' && (
            <div className="space-y-6">
          <Card className="glass-card border-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Leave Report
                  </CardTitle>
                  <CardDescription>Comprehensive leave analytics and records</CardDescription>
                </div>
                <Button
                  onClick={handleExportLeaves}
                  disabled={isLoadingLeaves || leaveReport.length === 0}
                  className="w-full sm:w-auto"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search by Name
                  </Label>
                  <Input
                    placeholder="Search employee name, email, or code..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleFilterChange();
                    }}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Month
                    </Label>
                    <Select value={selectedMonth.toString()} onValueChange={(val) => {
                      setSelectedMonth(parseInt(val));
                      handleFilterChange();
                    }}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={(val) => {
                      setSelectedYear(parseInt(val));
                      handleFilterChange();
                    }}>
                      <SelectTrigger className="w-full sm:w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Status
                    </Label>
                    <Select value={leaveStatus} onValueChange={(val) => {
                      setLeaveStatus(val);
                      handleFilterChange();
                    }}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{leaveSummary.total_leaves}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total Leaves</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-status-success/20 bg-status-success/5">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-status-success">{leaveSummary.approved}</div>
                    <p className="text-xs text-muted-foreground mt-1">Approved</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-status-warning/20 bg-status-warning/5">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-status-warning">{leaveSummary.pending}</div>
                    <p className="text-xs text-muted-foreground mt-1">Pending</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-status-error/20 bg-status-error/5">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-status-error">{leaveSummary.rejected}</div>
                    <p className="text-xs text-muted-foreground mt-1">Rejected</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{leaveSummary.total_days || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total Days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Leave Table */}
              {isLoadingLeaves ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : leaveReport.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leave records found for the selected filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Employee Code</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-center">Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveReport.map((leave: any) => (
                        <TableRow key={leave.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{leave.employee_name}</TableCell>
                          <TableCell>{leave.emp_code || 'N/A'}</TableCell>
                          <TableCell>{leave.leave_type}</TableCell>
                          <TableCell>{new Date(leave.start_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(leave.end_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-center">{leave.duration} days</TableCell>
                          <TableCell>
                            <StatusBadge
                              variant={
                                leave.status === 'Approved'
                                  ? 'success'
                                  : leave.status === 'Pending'
                                  ? 'warning'
                                  : leave.status === 'Rejected'
                                  ? 'error'
                                  : 'neutral'
                              }
                            >
                              {leave.status}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>{leave.approved_by_name || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls */}
              {leavePagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((leavePagination.page - 1) * leavePagination.limit) + 1} to {Math.min(leavePagination.page * leavePagination.limit, leavePagination.total)} of {leavePagination.total} entries
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {leavePagination.totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setLeavePage(p => Math.max(1, p - 1))}
                              className={leavePagination.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(5, leavePagination.totalPages) }, (_, i) => {
                            let pageNum;
                            if (leavePagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (leavePagination.page <= 3) {
                              pageNum = i + 1;
                            } else if (leavePagination.page >= leavePagination.totalPages - 2) {
                              pageNum = leavePagination.totalPages - 4 + i;
                            } else {
                              pageNum = leavePagination.page - 2 + i;
                            }
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => setLeavePage(pageNum)}
                                  isActive={leavePagination.page === pageNum}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setLeavePage(p => Math.min(leavePagination.totalPages, p + 1))}
                              className={leavePagination.page >= leavePagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Label htmlFor="leave-page-limit" className="text-sm text-muted-foreground whitespace-nowrap">
                        Rows per page:
                      </Label>
                      <Select 
                        value={leaveLimit.toString()} 
                        onValueChange={(val) => {
                          setLeaveLimit(Number(val));
                          setLeavePage(1);
                        }}
                      >
                        <SelectTrigger id="leave-page-limit" className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
