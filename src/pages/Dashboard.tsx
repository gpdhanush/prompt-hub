import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { PageTitle } from "@/components/ui/page-title";
import { settingsApi } from "@/features/settings/api";
import { reportsApi } from "@/features/reports/api";
import CommonDashboard from "@/components/dashboard/CommonDashboard";
import Clock from "@/components/dashboard/Clock";
import Leaderboard from "@/components/dashboard/Leaderboard";
// LazyRoute is not needed here - using Suspense directly

// Lazy load heavy dashboard components
const TeamDashboard = lazy(() => import("@/components/dashboard/TeamDashboard"));
const AdminDashboard = lazy(() => import("@/components/dashboard/AdminDashboard"));

export default function Dashboard() {
  const navigate = useNavigate();

  // Get current user from secure storage
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || "User";
  const userRole = currentUser?.role || "";
  const isSuperAdmin = userRole === "Super Admin";
  const isTL = userRole === "Team Lead" || userRole === "Team Leader";
  const isAdmin = userRole === "Admin";
  const isTLOrAdmin = isTL || isAdmin;

  // Redirect Admin users to IT Asset Dashboard
  useEffect(() => {
    if (isAdmin && !isSuperAdmin) {
      navigate("/it-assets/dashboard", { replace: true });
    }
  }, [isAdmin, isSuperAdmin, navigate]);

  const [selectedDate] = useState<Date | undefined>(new Date());
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

  // Fetch dashboard stats (for CommonDashboard)
  const { data: dashboardData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => reportsApi.getDashboard(),
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

  const formatCurrency = useCallback(
    (amount: number) => {
      return `${currencySymbol}${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currencySymbol]
  );

  const formatTimeAgo = useCallback((date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  const leaderboard = useMemo(
    () => leaderboardData?.data || [],
    [leaderboardData]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <PageTitle
            title="Dashboard"
            icon={Sparkles}
            description={`Welcome back, ${userName}`}
          />
        </div>
        <Clock selectedDate={selectedDate} />
      </div>

      {/* Common Dashboard - Always visible */}
      <CommonDashboard isLoading={isLoadingStats} />

      {/* Super Admin Specific Sections - Lazy loaded */}
      {isSuperAdmin && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <AdminDashboard formatTimeAgo={formatTimeAgo} />
        </Suspense>
      )}

      {/* TL and Admin Specific Sections - Lazy loaded */}
      {isTLOrAdmin && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <TeamDashboard
            currencySymbol={currencySymbol}
            formatCurrency={formatCurrency}
            formatTimeAgo={formatTimeAgo}
          />
        </Suspense>
      )}

      {/* Leaderboard - Always visible if data exists */}
      <Leaderboard leaderboard={leaderboard} />
    </div>
  );
}
