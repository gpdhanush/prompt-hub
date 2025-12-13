import { Outlet, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { isAuthenticated, getCurrentUserAsync, getAuthTokenAsync } from "@/lib/auth";
import { initializeSecureStorage } from "@/lib/secureStorage";
import { Loader2 } from "lucide-react";
import { useFCM } from "@/hooks/useFCM";
import { logger } from "@/lib/logger";

export function AdminLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  
  // Initialize FCM for push notifications (only for authenticated users)
  const { permission, requestPermission, isRegistered } = useFCM();

  useEffect(() => {
    // Register service worker for push notifications
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          });
          logger.info('✅ Service Worker registered:', registration.scope);
          
          // Wait for service worker to be ready
          await navigator.serviceWorker.ready;
          logger.info('✅ Service Worker ready');
        } catch (error: any) {
          logger.error('❌ Service Worker registration failed:', error);
          logger.error('Error details:', error.message);
        }
      } else {
        logger.warn('⚠️  Service Workers are not supported in this browser');
      }
    };

    registerServiceWorker();

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
    </div>
  );
}
