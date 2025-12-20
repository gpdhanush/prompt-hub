import { Outlet, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ClientSidebar } from "./ClientSidebar";
import { ClientHeader } from "./ClientHeader";
import { AppFooter } from "./AppFooter";
import { isAuthenticated, getCurrentUserAsync, getAuthTokenAsync } from "@/lib/auth";
import { initializeSecureStorage } from "@/lib/secureStorage";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api";

export function ClientLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  
  // Fetch user profile to get session timeout
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getMe(),
    enabled: isAuth,
    refetchOnWindowFocus: false,
  });

  const sessionTimeout = userProfile?.data?.session_timeout || 30; // Default 30 minutes

  // Setup idle timeout
  useIdleTimeout({
    timeoutMinutes: sessionTimeout,
    enabled: isAuth && sessionTimeout > 0,
  });

  useEffect(() => {
    // Initialize secure storage and check authentication
    const checkAuth = async () => {
      try {
        // Initialize secure storage first (loads encrypted data into cache)
        await initializeSecureStorage();
        
        // Check authentication after initialization
        const token = await getAuthTokenAsync();
        const user = await getCurrentUserAsync();
        
        // Verify user is CLIENT role (case-insensitive check)
        if (user && user.role && user.role.toUpperCase() !== 'CLIENT') {
          logger.warn('Non-client user attempting to access client layout');
          setIsAuth(false);
          return;
        }
        
        setIsAuth(!!(token && user));
      } catch (error) {
        logger.error('Authentication check failed:', error);
        setIsAuth(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ClientSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ClientHeader />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-scroll overflow-x-hidden p-6" style={{ scrollbarGutter: 'stable', minHeight: 0 }}>
            <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-200">
              <strong>Client View – Limited Access</strong>
            </div>
            <Outlet />
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}

