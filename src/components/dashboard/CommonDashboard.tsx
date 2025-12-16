import { memo, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FolderKanban,
  CheckSquare,
  Bug,
  Receipt,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { reportsApi } from "@/features/reports/api";
import { settingsApi } from "@/features/settings/api";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface CommonDashboardProps {
  isLoading: boolean;
}

const CommonDashboard = memo(function CommonDashboard({
  isLoading,
}: CommonDashboardProps) {
  const queryClient = useQueryClient();
  const [currencySymbol, setCurrencySymbol] = useState("$");

  // Fetch settings from database
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => reportsApi.getDashboard(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch task metrics for avg resolution time
  const { data: taskMetricsData } = useQuery({
    queryKey: ["reports", "tasks", "month"],
    queryFn: () => reportsApi.getTaskMetrics({ period: "month" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch leaderboard
  const { data: leaderboardData } = useQuery({
    queryKey: ["reports", "leaderboard", "month"],
    queryFn: () => reportsApi.getLeaderboard({ period: "month", limit: 5 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update currency symbol when settings load from database
  useEffect(() => {
    if (settingsData?.data?.currency_symbol) {
      setCurrencySymbol(settingsData.data.currency_symbol);
      localStorage.setItem("currency_symbol", settingsData.data.currency_symbol);
    }
  }, [settingsData]);

  // Listen for currency symbol changes
  useEffect(() => {
    const handleCurrencyChange = () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    };
    window.addEventListener("currencySymbolChanged", handleCurrencyChange);
    return () => {
      window.removeEventListener("currencySymbolChanged", handleCurrencyChange);
    };
  }, [queryClient]);

  const formatCurrency = useCallback(
    (amount: number) => {
      return `${currencySymbol}${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currencySymbol]
  );

  const stats = useMemo(
    () =>
      dashboardData?.data || {
        employees: 0,
        projects: 0,
        tasksInProgress: 0,
        openBugs: 0,
        pendingReimbursements: 0,
        pendingReimbursementsAmount: 0,
        avgResolutionTime: "0 days",
      },
    [dashboardData]
  );

  const avgResolutionTime = useMemo(
    () =>
      taskMetricsData?.data?.avgResolutionTime || stats.avgResolutionTime,
    [taskMetricsData, stats.avgResolutionTime]
  );

  const leaderboard = useMemo(
    () => leaderboardData?.data || [],
    [leaderboardData]
  );

  if (isLoading || isLoadingStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
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

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-6">
          {/* Leaderboard will be rendered here by parent if needed */}
        </div>
      )}
    </>
  );
});

CommonDashboard.displayName = "CommonDashboard";

export default CommonDashboard;

