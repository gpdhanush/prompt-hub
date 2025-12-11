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
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { reportsApi, settingsApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // Get current user from secure storage
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || 'User';
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';

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

  const stats = dashboardData?.data || {
    employees: 0,
    projects: 0,
    tasksInProgress: 0,
    openBugs: 0,
    pendingReimbursements: 0,
    pendingReimbursementsAmount: 0,
    avgResolutionTime: '0 days',
  };

  const leaderboard = leaderboardData?.data || [];
  const avgResolutionTime = taskMetricsData?.data?.avgResolutionTime || stats.avgResolutionTime;

  // Update currency symbol when settings load from database
  useEffect(() => {
    if (settingsData?.data?.currency_symbol) {
      setCurrencySymbol(settingsData.data.currency_symbol);
      // Also update localStorage for backward compatibility
      localStorage.setItem('currency_symbol', settingsData.data.currency_symbol);
    }
  }, [settingsData]);

  // Listen for currency symbol changes (when Super Admin updates it in Settings)
  useEffect(() => {
    const handleCurrencyChange = () => {
      // Refetch settings when currency changes
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

  const isLoading = isLoadingStats || isLoadingLeaderboard;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userName}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
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
    </div>
  );
}
