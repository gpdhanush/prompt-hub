import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { LoadingProvider, useLoading } from "./contexts/LoadingContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./lib/logger";
import { ENV_CONFIG } from "./lib/config";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Employees from "./pages/Employees";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Bugs from "./pages/Bugs";
import Leaves from "./pages/Leaves";
import Reimbursements from "./pages/Reimbursements";
import AIPrompts from "./pages/AIPrompts";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import FileManager from "./pages/FileManager";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeCreate from "./pages/EmployeeCreate";
import EmployeeEdit from "./pages/EmployeeEdit";
import BugDetail from "./pages/BugDetail";
import BugCreate from "./pages/BugCreate";
import BugEdit from "./pages/BugEdit";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectEdit from "./pages/ProjectEdit";
import RolesPositions from "./pages/RolesPositions";
import RolesPermissions from "./pages/RolesPermissions";
import Permissions from "./pages/Permissions";
import ProfileSetup from "./pages/ProfileSetup";
import NotFound from "./pages/NotFound";
import MFASetup from "./pages/MFASetup";
import MFAVerify from "./pages/MFAVerify";
import ITAssetDashboard from "./pages/ITAssetDashboard";
import Assets from "./pages/Assets";
import AssetCreate from "./pages/AssetCreate";
import AssetView from "./pages/AssetView";
import AssetEdit from "./pages/AssetEdit";
import AssetAssignments from "./pages/AssetAssignments";
import AssignAsset from "./pages/AssignAsset";
import ReturnAsset from "./pages/ReturnAsset";
import AssetTickets from "./pages/AssetTickets";
import AssetMaintenance from "./pages/AssetMaintenance";
import AssetInventory from "./pages/AssetInventory";
import AssetReports from "./pages/AssetReports";
import AssetApprovals from "./pages/AssetApprovals";
import AssetSettings from "./pages/AssetSettings";
import MyITAssets from "./pages/MyITAssets";
import RaiseTicket from "./pages/RaiseTicket";
import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { initializeSecureStorage, getItemSync } from "@/lib/secureStorage";
import { registerLoadingCallback } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { clearAuth } from "@/lib/auth";

const queryClient = new QueryClient();

// Expose QueryClient globally for logout function
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_CLIENT__ = queryClient;
}

// Protected Route Component - checks user role or permission before allowing access
function ProtectedRoute({ 
  children, 
  allowedRoles,
  requiredPermission
}: { 
  children: React.ReactNode; 
  allowedRoles?: string[];
  requiredPermission?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutInProgress = useRef(false);
  const userStr = getItemSync('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userRole = currentUser?.role || '';
  const { hasPermission, isLoading } = usePermissions();

  // Check access based on role or permission
  let hasAccess = false;
  
  if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = allowedRoles.includes(userRole);
  } else if (requiredPermission) {
    hasAccess = hasPermission(requiredPermission);
  } else {
    // If neither is specified, allow access (for backward compatibility)
    hasAccess = true;
  }

  useEffect(() => {
    if (!isLoading && !hasAccess && !logoutInProgress.current) {
      // Prevent multiple simultaneous logout calls
      logoutInProgress.current = true;
      
      // Clear cache, logout, and navigate to login
      const handleAccessDenied = async () => {
        try {
          // Show toast notification
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page. You will be logged out.",
            variant: "destructive",
          });

          // Clear authentication data from secure storage
          await clearAuth();
          
          // Clear auth-related items from localStorage (fallback for non-encrypted storage)
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          localStorage.removeItem('remember_me');
          
          // Clear session storage
          sessionStorage.clear();
          
          // Clear all React Query cache
          queryClient.clear();
          
          // Navigate to login page
          navigate('/login', { replace: true });
        } catch (error) {
          logger.error('Error during access denied logout:', error);
          // Still navigate to login even if there's an error
          navigate('/login', { replace: true });
        }
      };

      handleAccessDenied();
    }
  }, [hasAccess, isLoading, navigate, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    // Show loading state while logout is in progress
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Inner app component that uses loading context
const AppContent = () => {
  const { setLoading } = useLoading();

  // Initialize secure storage on app startup
  useEffect(() => {
    initializeSecureStorage().catch(error => {
      logger.error('Failed to initialize secure storage:', error);
    });
  }, []);

  // Register loading callback for API calls
  useEffect(() => {
    const unregister = registerLoadingCallback(setLoading);
    return unregister;
  }, [setLoading]);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/mfa/setup" element={<MFASetup />} />
            <Route path="/mfa/verify" element={<MFAVerify />} />
            
            {/* Protected Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute requiredPermission="users.view">
                    <Users />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employees" 
                element={
                  <ProtectedRoute requiredPermission="employees.view">
                    <Employees />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employees/new" 
                element={
                  <ProtectedRoute requiredPermission="employees.create">
                    <EmployeeCreate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employees/:id/edit" 
                element={<EmployeeEdit />} 
              />
              <Route 
                path="/projects" 
                element={
                  <ProtectedRoute requiredPermission="projects.view">
                    <Projects />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/new" 
                element={
                  <ProtectedRoute requiredPermission="projects.create">
                    <ProjectCreate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/:id" 
                element={
                  <ProtectedRoute requiredPermission="projects.view">
                    <ProjectDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/:id/edit" 
                element={
                  <ProtectedRoute requiredPermission="projects.edit">
                    <ProjectEdit />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tasks" 
                element={
                  <ProtectedRoute requiredPermission="tasks.view">
                    <Tasks />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bugs" 
                element={
                  <ProtectedRoute requiredPermission="bugs.view">
                    <Bugs />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bugs/new" 
                element={
                  <ProtectedRoute requiredPermission="bugs.create">
                    <BugCreate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bugs/:id" 
                element={
                  <ProtectedRoute requiredPermission="bugs.view">
                    <BugDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bugs/:id/edit" 
                element={
                  <ProtectedRoute requiredPermission="bugs.edit">
                    <BugEdit />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/leaves" 
                element={<Leaves />} 
              />
              <Route 
                path="/reimbursements" 
                element={<Reimbursements />} 
              />
              <Route path="/prompts" element={<AIPrompts />} />
              <Route 
                path="/audit-logs" 
                element={
                  <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                    <AuditLogs />
                  </ProtectedRoute>
                } 
              />
              <Route path="/files" element={<FileManager />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute allowedRoles={['Super Admin', 'Admin', 'Team Leader', 'Team Lead']}>
                    <Reports />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/roles-positions" 
                element={
                  <ProtectedRoute allowedRoles={['Super Admin']}>
                    <RolesPositions />
                  </ProtectedRoute>
                } 
              />
              <Route path="/employee-profile/:id" element={<EmployeeProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route 
                path="/profile-setup" 
                element={<ProfileSetup />} 
              />
              <Route 
                path="/roles-permissions" 
                element={
                  <ProtectedRoute requiredPermission="roles_permissions.view">
                    <RolesPermissions />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/permissions" 
                element={
                  <ProtectedRoute allowedRoles={['Super Admin']}>
                    <Permissions />
                  </ProtectedRoute>
                } 
              />
              {/* IT Asset Management Routes - Admin Only */}
              <Route 
                path="/it-assets/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <ITAssetDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assets" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <Assets />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assets/new" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetCreate />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assets/:id" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetView />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assets/:id/edit" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetEdit />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assignments" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetAssignments />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assignments/new" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssignAsset />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assignments/:id/return" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <ReturnAsset />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/tickets" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetTickets />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/maintenance" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetMaintenance />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/inventory" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetInventory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/reports" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetReports />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/approvals" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetApprovals />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/settings" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <AssetSettings />
                  </ProtectedRoute>
                } 
              />
              {/* Employee IT Assets View - All users except Super Admin */}
              <Route 
                path="/my-it-assets" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <MyITAssets />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-it-assets/raise-request" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <RaiseTicket />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  // Set up global error handlers for production crash reporting
  useEffect(() => {
    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message || 'Unknown error');
      logger.error('Unhandled error:', error);
      
      // Report to crash analytics in production
      if (!ENV_CONFIG.IS_DEV) {
        import('./lib/firebase').then(({ logError }) => {
          logError(error, {
            fatal: true,
            source: 'global_error_handler',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          });
        }).catch(() => {
          // Silently fail if firebase not available
        });
      }
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason || 'Unhandled promise rejection'));
      
      logger.error('Unhandled promise rejection:', error);
      
      // Report to crash analytics in production
      if (!ENV_CONFIG.IS_DEV) {
        import('./lib/firebase').then(({ logError }) => {
          logError(error, {
            fatal: true,
            source: 'unhandled_promise_rejection',
            reason: String(event.reason),
          });
        }).catch(() => {
          // Silently fail if firebase not available
        });
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <LoadingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </LoadingProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
