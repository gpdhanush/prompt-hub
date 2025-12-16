import { Outlet, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { isAuthenticated, getCurrentUserAsync, getAuthTokenAsync } from "@/lib/auth";
import { initializeSecureStorage, getItemSync } from "@/lib/secureStorage";
import { Loader2 } from "lucide-react";
import { useFCM } from "@/hooks/useFCM";
import { logger } from "@/lib/logger";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api";
import { PWAService } from "@/lib/pwaService";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { NotificationPermissionDialog } from "@/components/NotificationPermissionDialog";

export function AdminLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  
  // Initialize FCM for push notifications (only for authenticated users)
  const { permission, requestPermission, isRegistered } = useFCM();

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
    // Register PWA service worker (includes Firebase messaging)
    const registerServiceWorkers = async () => {
      // Register main PWA service worker
      await PWAService.register();
      
      // Also register Firebase messaging service worker for push notifications
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          });
          logger.info('✅ Firebase Service Worker registered:', registration.scope);
        } catch (error: any) {
          logger.error('❌ Firebase Service Worker registration failed:', error);
          // Non-critical, continue without Firebase messaging
        }
      }
    };

    registerServiceWorkers();

    // Initialize secure storage and check authentication
    const checkAuth = async () => {
      try {
        // Initialize secure storage first (loads encrypted data into cache)
        await initializeSecureStorage();
        
        // Check authentication after initialization
        const token = await getAuthTokenAsync();
        const user = await getCurrentUserAsync();
        
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

  // Show notification permission dialog after user is authenticated
  useEffect(() => {
    if (isAuth && !isLoading) {
      // Check if dialog was dismissed in this session
      const wasDismissed = localStorage.getItem('notification_permission_dismissed');
      
      // Show dialog if:
      // 1. Permission is default (not asked yet)
      // 2. Dialog wasn't dismissed in this session
      // 3. Notifications are supported
      if (
        'Notification' in window &&
        Notification.permission === 'default' &&
        !wasDismissed
      ) {
        // Show dialog after a short delay for better UX
        const timer = setTimeout(() => {
          setShowNotificationDialog(true);
        }, 2000); // 2 second delay after page load
        
        return () => clearTimeout(timer);
      }
    }
  }, [isAuth, isLoading, permission]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      {/* PWA Components */}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      
      {/* Notification Permission Dialog */}
      <NotificationPermissionDialog
        open={showNotificationDialog}
        onOpenChange={setShowNotificationDialog}
        onRequestPermission={requestPermission}
        permission={permission}
      />
    </div>
  );
}
