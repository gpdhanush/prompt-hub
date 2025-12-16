import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  FolderKanban,
  CheckSquare,
  Bug,
  Receipt,
  Sparkles,
  TrendingUp,
  Loader2,
  Activity,
  FileText,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { reportsApi, settingsApi, auditLogsApi, employeesApi, reimbursementsApi, tasksApi, bugsApi, projectsApi, assetsApi, remindersApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MessageSquare, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Get current user from secure storage
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || 'User';
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';
  const isTL = userRole === 'Team Lead' || userRole === 'Team Leader';
  const isAdmin = userRole === 'Admin';
  const isTLOrAdmin = isTL || isAdmin;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    reminder_time: '',
    reminder_type: 'other',
  });

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; reminder_date: string; reminder_time: string; reminder_type?: string }) =>
      remindersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setShowReminderDialog(false);
      setReminderForm({ title: '', description: '', reminder_time: '', reminder_type: 'other' });
    },
  });

  const handleAddReminder = () => {
    if (!selectedDate) return;
    setShowReminderDialog(true);
  };

  const handleSubmitReminder = () => {
    if (!selectedDate || !reminderForm.title || !reminderForm.reminder_time) return;
    
    const reminderDate = format(selectedDate, 'yyyy-MM-dd');
    createReminderMutation.mutate({
      title: reminderForm.title,
      description: reminderForm.description || undefined,
      reminder_date: reminderDate,
      reminder_time: reminderForm.reminder_time,
      reminder_type: reminderForm.reminder_type,
    });
  };

  // Currency symbol - loaded from database
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Fetch settings from database
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => reportsApi.getDashboard(),
  });

  // Fetch project stats for analysis
  const { data: projectStatsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['reports', 'projects'],
    queryFn: () => reportsApi.getProjectStats(),
    enabled: isSuperAdmin,
  });

  // Fetch recent audit logs
  const { data: auditLogsData, isLoading: isLoadingAuditLogs } = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: () => auditLogsApi.getAll({ page: 1, limit: 10 }),
    enabled: isSuperAdmin,
  });


  // Fetch leaderboard
  const { data: leaderboardData, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['reports', 'leaderboard', 'month'],
    queryFn: () => reportsApi.getLeaderboard({ period: 'month', limit: 5 }),
  });

  // Fetch task metrics for avg resolution time
  const { data: taskMetricsData } = useQuery({
    queryKey: ['reports', 'tasks', 'month'],
    queryFn: () => reportsApi.getTaskMetrics({ period: 'month' }),
  });

  // Fetch current user's employee record to get team members
  const { data: currentEmployeeData } = useQuery({
    queryKey: ['current-employee', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const result = await employeesApi.getByUserId(currentUser.id);
      return result?.data || null;
    },
    enabled: isTLOrAdmin && !!currentUser?.id,
  });

  // Fetch team members (employees where team_lead_id matches current user's employee.id)
  const { data: teamMembersData, isLoading: isLoadingTeamMembers } = useQuery({
    queryKey: ['team-members', currentEmployeeData?.id],
    queryFn: async () => {
      if (!currentEmployeeData?.id) return { data: [] };
      const allEmployees = await employeesApi.getAll({ page: 1, limit: 1000 });
      const teamMembers = allEmployees?.data?.filter((emp: any) => 
        emp.team_lead_id === currentEmployeeData.id
      ) || [];
      return { data: teamMembers };
    },
    enabled: isTLOrAdmin && !!currentEmployeeData?.id,
  });

  const teamMembers = teamMembersData?.data || [];
  const teamMemberUserIds = teamMembers.map((emp: any) => emp.user_id).filter(Boolean);

  // Fetch recent team activity (tasks, bugs, projects)
  const { data: teamTasksData } = useQuery({
    queryKey: ['team-tasks', teamMemberUserIds],
    queryFn: async () => {
      if (teamMemberUserIds.length === 0) return { data: [] };
      const allTasks = await tasksApi.getAll({ page: 1, limit: 10 });
      const teamTasks = allTasks?.data?.filter((task: any) => 
        teamMemberUserIds.includes(task.assigned_to) || teamMemberUserIds.includes(task.created_by)
      ) || [];
      return { data: teamTasks.slice(0, 5) };
    },
    enabled: isTLOrAdmin && teamMemberUserIds.length > 0,
  });

  const { data: teamBugsData } = useQuery({
    queryKey: ['team-bugs', teamMemberUserIds],
    queryFn: async () => {
      if (teamMemberUserIds.length === 0) return { data: [] };
      const allBugs = await bugsApi.getAll({ page: 1, limit: 10 });
      const teamBugs = allBugs?.data?.filter((bug: any) => 
        teamMemberUserIds.includes(bug.assigned_to) || teamMemberUserIds.includes(bug.created_by)
      ) || [];
      return { data: teamBugs.slice(0, 5) };
    },
    enabled: isTLOrAdmin && teamMemberUserIds.length > 0,
  });

  // Fetch team claims (reimbursements)
  const { data: teamClaimsData, isLoading: isLoadingTeamClaims } = useQuery({
    queryKey: ['team-claims', currentEmployeeData?.id],
    queryFn: () => reimbursementsApi.getAll({ page: 1, limit: 10 }),
    enabled: isTLOrAdmin && !!currentEmployeeData?.id,
  });

  // Fetch support ticket replies/comments
  const teamMemberEmployeeIds = teamMembers.map((emp: any) => emp.id).filter(Boolean);
  const { data: supportTicketsData } = useQuery({
    queryKey: ['support-tickets', teamMemberEmployeeIds],
    queryFn: async () => {
      if (teamMemberEmployeeIds.length === 0) return { data: [] };
      const allTickets = await assetsApi.getTickets({ page: 1, limit: 20 });
      const teamTickets = allTickets?.data?.filter((ticket: any) => 
        teamMemberEmployeeIds.includes(ticket.employee_id)
      ) || [];
      
      // Fetch comments for each ticket
      const ticketsWithComments = await Promise.all(
        teamTickets.slice(0, 5).map(async (ticket: any) => {
          try {
            const comments = await assetsApi.getTicketComments(ticket.id);
            return {
              ...ticket,
              recentComments: comments?.data?.slice(-3) || [],
            };
          } catch {
            return { ...ticket, recentComments: [] };
          }
        })
      );
      
      return { data: ticketsWithComments };
    },
    enabled: isTLOrAdmin && teamMemberEmployeeIds.length > 0,
  });

  const teamTasks = teamTasksData?.data || [];
  const teamBugs = teamBugsData?.data || [];
  const teamClaims = teamClaimsData?.data || [];
  const supportTickets = supportTicketsData?.data || [];

  // Fetch reminders for the current month
  const currentMonth = selectedDate || new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  const { data: remindersData } = useQuery({
    queryKey: ['reminders', format(startOfMonth, 'yyyy-MM-dd'), format(endOfMonth, 'yyyy-MM-dd')],
    queryFn: () => remindersApi.getAll({
      start_date: format(startOfMonth, 'yyyy-MM-dd'),
      end_date: format(endOfMonth, 'yyyy-MM-dd'),
    }),
  });

  const reminders = remindersData?.data || [];
  
  // Normalize reminder dates to yyyy-MM-dd format for comparison
  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Handle both date strings and Date objects
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return format(date, 'yyyy-MM-dd');
  };
  
  // Get reminders for selected date
  const selectedDateReminders = selectedDate
    ? reminders.filter((r: any) => {
        const reminderDate = normalizeDate(r.reminder_date);
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        return reminderDate === selectedDateStr;
      })
    : [];

  // Create modifiers for calendar to mark dates with reminders
  const reminderDates = reminders
    .map((r: any) => {
      try {
        const dateStr = normalizeDate(r.reminder_date);
        return dateStr ? new Date(dateStr) : null;
      } catch {
        return null;
      }
    })
    .filter((date): date is Date => date !== null);

  const stats = dashboardData?.data || {
    employees: 0,
    projects: 0,
    tasksInProgress: 0,
    openBugs: 0,
    pendingReimbursements: 0,
    pendingReimbursementsAmount: 0,
    avgResolutionTime: '0 days',
  };

  const projectStats = projectStatsData?.data || [];
  const recentAuditLogs = auditLogsData?.data || [];
  const leaderboard = leaderboardData?.data || [];
  const avgResolutionTime = taskMetricsData?.data?.avgResolutionTime || stats.avgResolutionTime;

  // Calculate project analysis stats
  const projectAnalysis = {
    total: projectStats.length,
    inProgress: projectStats.filter((p: any) => p.status === 'In Progress' || p.status === 'Testing' || p.status === 'Pre-Prod' || p.status === 'Production').length,
    completed: projectStats.filter((p: any) => p.status === 'Completed').length,
    onHold: projectStats.filter((p: any) => p.status === 'On Hold').length,
    averageProgress: projectStats.length > 0 
      ? Math.round(projectStats.reduce((acc: number, p: any) => acc + (p.progress || 0), 0) / projectStats.length)
      : 0,
    totalTasks: projectStats.reduce((acc: number, p: any) => acc + (p.tasks || 0), 0),
    totalBugs: projectStats.reduce((acc: number, p: any) => acc + (p.bugs || 0), 0),
  };

  // Update currency symbol when settings load from database
  useEffect(() => {
    if (settingsData?.data?.currency_symbol) {
      setCurrencySymbol(settingsData.data.currency_symbol);
      localStorage.setItem('currency_symbol', settingsData.data.currency_symbol);
    }
  }, [settingsData]);

  // Listen for currency symbol changes
  useEffect(() => {
    const handleCurrencyChange = () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    };
    window.addEventListener('currencySymbolChanged', handleCurrencyChange);
    return () => {
      window.removeEventListener('currencySymbolChanged', handleCurrencyChange);
    };
  }, [queryClient]);

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'UPDATE':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20';
      case 'DELETE':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const isLoading = isLoadingStats || isLoadingLeaderboard;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back, {userName}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-3xl font-bold text-foreground">
            {format(currentTime, "hh:mm:ss a")}
          </div>
          {selectedDate && (
            <div className="text-sm text-muted-foreground mt-1">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Main Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Employees"
              value={stats.employees || 0}
              icon={Users}
              className="border-l-4 border-l-blue-500"
            />
            <StatCard
              title="Active Projects"
              value={stats.projects || 0}
              icon={FolderKanban}
              className="border-l-4 border-l-purple-500"
            />
            <StatCard
              title="Tasks in Progress"
              value={stats.tasksInProgress || 0}
              icon={CheckSquare}
              className="border-l-4 border-l-yellow-500"
            />
            <StatCard
              title="Open Bugs"
              value={stats.openBugs || 0}
              icon={Bug}
              className="border-l-4 border-l-red-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Pending Reimbursements"
              value={formatCurrency(stats.pendingReimbursementsAmount || 0)}
              icon={Receipt}
              className="border-l-4 border-l-green-500"
            />
            <StatCard
              title="Avg Resolution Time"
              value={avgResolutionTime}
              icon={TrendingUp}
              className="border-l-4 border-l-indigo-500"
            />
            <StatCard
              title="Pending Requests"
              value={stats.pendingReimbursements || 0}
              icon={Receipt}
              className="border-l-4 border-l-orange-500"
            />
          </div>

          {/* Super Admin Specific Sections */}
          {isSuperAdmin && (
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
                      onClick={() => navigate('/projects')}
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
                          <p className="text-sm text-muted-foreground mb-1">Total Projects</p>
                          <p className="text-2xl font-bold text-blue-600">{projectAnalysis.total}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                          <p className="text-sm text-muted-foreground mb-1">In Progress</p>
                          <p className="text-2xl font-bold text-purple-600">{projectAnalysis.inProgress}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
                          <p className="text-sm text-muted-foreground mb-1">Completed</p>
                          <p className="text-2xl font-bold text-green-600">{projectAnalysis.completed}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                          <p className="text-sm text-muted-foreground mb-1">On Hold</p>
                          <p className="text-2xl font-bold text-amber-600">{projectAnalysis.onHold}</p>
                        </div>
                      </div>

                      {/* Average Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Average Project Progress</p>
                          <p className="text-sm font-bold text-primary">{projectAnalysis.averageProgress}%</p>
                        </div>
                        <Progress value={projectAnalysis.averageProgress} className="h-2" />
                      </div>

                      {/* Project Summary */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Total Tasks</p>
                          <p className="text-lg font-semibold">{projectAnalysis.totalTasks}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Total Bugs</p>
                          <p className="text-lg font-semibold">{projectAnalysis.totalBugs}</p>
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
                                <div key={project.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{project.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Progress value={project.progress || 0} className="h-1.5 flex-1" />
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">{project.progress || 0}%</span>
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
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      Calendar
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select a date to add reminders
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Calendar on the left */}
                      <div className="flex flex-col lg:w-1/2">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="rounded-md border-0"
                          modifiers={{
                            hasReminder: reminderDates,
                          }}
                          modifiersClassNames={{
                            hasReminder: "bg-primary/20 text-primary font-semibold",
                          }}
                        />
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={handleAddReminder}
                            disabled={!selectedDate}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Add Reminder
                          </Button>
                        </div>
                      </div>
                      {/* Reminders on the right */}
                      <div className="lg:w-1/2 lg:border-l lg:pl-6 pt-4 lg:pt-0">
                        {selectedDate ? (
                          <>
                            <p className="text-sm font-semibold mb-3">Reminders for {format(selectedDate, 'MMM d, yyyy')}</p>
                            {selectedDateReminders.length > 0 ? (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {selectedDateReminders.map((reminder: any) => (
                                  <div
                                    key={reminder.id}
                                    className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border"
                                  >
                                    <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{reminder.title}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {reminder.reminder_time} • {reminder.reminder_type}
                                      </p>
                                      {reminder.description && (
                                        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{reminder.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-8">
                                <p className="text-sm text-muted-foreground text-center">
                                  No reminders for {format(selectedDate, 'MMM d, yyyy')}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center py-8">
                            <p className="text-sm text-muted-foreground text-center">
                              Select a date to view reminders
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                        onClick={() => navigate('/audit-logs')}
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
                            onClick={() => navigate('/audit-logs')}
                          >
                            <div className={cn("p-1.5 rounded-md", getActionColor(log.action))}>
                              {getActionIcon(log.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium truncate">{log.user_name || 'System'}</p>
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
          )}

          {/* TL and Admin Specific Sections */}
          {isTLOrAdmin && (
            <>
              {/* Team Members & Calendar - Side by Side */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Team Members */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        My Team ({teamMembers.length})
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/employees')}
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTeamMembers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : teamMembers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No team members assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teamMembers.slice(0, 6).map((member: any) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/employees/${member.id}`)}
                          >
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              {member.profile_photo_url ? (
                                <img
                                  src={member.profile_photo_url}
                                  alt={member.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{member.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.role} • {member.position || 'Employee'}
                              </p>
                            </div>
                            <StatusBadge variant={member.status === 'Active' ? 'success' : 'neutral'} className="text-xs">
                              {member.status}
                            </StatusBadge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Calendar for Reminders */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      Calendar
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select a date to add reminders for scheduled calls and important dates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Calendar on the left */}
                      <div className="flex flex-col lg:w-1/2">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="rounded-md border-0"
                          modifiers={{
                            hasReminder: reminderDates,
                          }}
                          modifiersClassNames={{
                            hasReminder: "bg-primary/20 text-primary font-semibold",
                          }}
                        />
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={handleAddReminder}
                            disabled={!selectedDate}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Add Reminder
                          </Button>
                        </div>
                      </div>
                      {/* Reminders on the right */}
                      <div className="lg:w-1/2 lg:border-l lg:pl-6 pt-4 lg:pt-0">
                        {selectedDate ? (
                          <>
                            <p className="text-sm font-semibold mb-3">Reminders for {format(selectedDate, 'MMM d, yyyy')}</p>
                            {selectedDateReminders.length > 0 ? (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {selectedDateReminders.map((reminder: any) => (
                                  <div
                                    key={reminder.id}
                                    className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border"
                                  >
                                    <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{reminder.title}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {reminder.reminder_time} • {reminder.reminder_type}
                                      </p>
                                      {reminder.description && (
                                        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{reminder.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-8">
                                <p className="text-sm text-muted-foreground text-center">
                                  No reminders for {format(selectedDate, 'MMM d, yyyy')}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center py-8">
                            <p className="text-sm text-muted-foreground text-center">
                              Select a date to view reminders
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity & Claims - Side by Side */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Recent Team Activity */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Recent Team Activity
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/tasks')}
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Recent Tasks */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                          Recent Tasks
                        </p>
                        {teamTasks.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No recent tasks</p>
                        ) : (
                          <div className="space-y-2">
                            {teamTasks.map((task: any) => (
                              <div
                                key={task.id}
                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/tasks?task=${task.id}`)}
                              >
                                <CheckSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{task.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {task.assigned_to_name || 'Unassigned'} • {formatTimeAgo(task.created_at)}
                                  </p>
                                </div>
                                <StatusBadge variant={task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'info' : 'neutral'} className="text-xs">
                                  {task.status}
                                </StatusBadge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recent Bugs */}
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                          Recent Bugs
                        </p>
                        {teamBugs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No recent bugs</p>
                        ) : (
                          <div className="space-y-2">
                            {teamBugs.map((bug: any) => (
                              <div
                                key={bug.id}
                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => navigate(`/bugs?bug=${bug.id}`)}
                              >
                                <Bug className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{bug.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {bug.assigned_to_name || 'Unassigned'} • {formatTimeAgo(bug.created_at)}
                                  </p>
                                </div>
                                <StatusBadge variant={bug.status === 'Resolved' ? 'success' : bug.status === 'In Progress' ? 'info' : 'neutral'} className="text-xs">
                                  {bug.status}
                                </StatusBadge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Claims */}
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Team Claims
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/reimbursements')}
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTeamClaims ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : teamClaims.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No claims from team members</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teamClaims.slice(0, 5).map((claim: any) => (
                          <div
                            key={claim.id}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/reimbursements/${claim.id}`)}
                          >
                            <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-950/20">
                              <Receipt className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium truncate">{claim.employee_name || 'Unknown'}</p>
                                <Badge variant="outline" className="text-xs">
                                  {claim.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mb-1">
                                {claim.category} • {formatCurrency(claim.amount || 0)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAgo(claim.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Support Replies */}
              {supportTickets.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Support Replies
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/it-assets/tickets')}
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {supportTickets.map((ticket: any) => (
                        <div
                          key={ticket.id}
                          className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/it-assets/tickets/${ticket.id}`)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{ticket.subject || `Ticket #${ticket.id}`}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {ticket.employee_name || 'Team Member'} • {formatTimeAgo(ticket.created_at)}
                              </p>
                            </div>
                            <StatusBadge variant={ticket.status === 'Resolved' ? 'success' : ticket.status === 'In Progress' ? 'info' : 'neutral'} className="text-xs ml-2">
                              {ticket.status}
                            </StatusBadge>
                          </div>
                          {ticket.recentComments && ticket.recentComments.length > 0 && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Recent Replies:</p>
                              {ticket.recentComments.map((comment: any, idx: number) => (
                                <div key={idx} className="text-xs text-muted-foreground mb-1 pl-2 border-l-2 border-muted">
                                  <span className="font-medium">{comment.user_name || 'Admin'}:</span> {comment.comment?.substring(0, 60)}
                                  {comment.comment?.length > 60 ? '...' : ''}
                                  <span className="ml-2">• {formatTimeAgo(comment.created_at)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top Performers - This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Tasks Completed</TableHead>
                      <TableHead className="text-center">Bugs Fixed</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((performer: any, index: number) => (
                      <TableRow key={performer.rank}>
                        <TableCell className="font-medium">{performer.rank}</TableCell>
                        <TableCell className="font-medium">{performer.name}</TableCell>
                        <TableCell className="text-center">{performer.tasks}</TableCell>
                        <TableCell className="text-center">{performer.bugs}</TableCell>
                        <TableCell className="text-right">
                          <StatusBadge variant={performer.score >= 95 ? "success" : performer.score >= 90 ? "info" : "neutral"}>
                            {performer.score}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>
              {selectedDate && `Set a reminder for ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Team Meeting, Client Call"
                value={reminderForm.title}
                onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={reminderForm.reminder_time}
                onChange={(e) => setReminderForm({ ...reminderForm, reminder_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={reminderForm.reminder_type}
                onValueChange={(value) => setReminderForm({ ...reminderForm, reminder_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="important_date">Important Date</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional notes..."
                value={reminderForm.description}
                onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReminderDialog(false);
                setReminderForm({ title: '', description: '', reminder_time: '', reminder_type: 'other' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReminder}
              disabled={!reminderForm.title || !reminderForm.reminder_time || createReminderMutation.isPending}
            >
              {createReminderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Reminder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
