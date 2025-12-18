import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { LoadingProvider, useLoading } from "./contexts/LoadingContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { NotificationAlert } from "./components/NotificationAlert";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./lib/logger";
import { ENV_CONFIG } from "./lib/config";
import { queryClient } from "./lib/queryClient";
import { useEffect, useRef, lazy } from "react";
import { toast } from "@/hooks/use-toast";
import { initializeSecureStorage, getItemSync } from "@/lib/secureStorage";
import { registerLoadingCallback } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { clearAuth } from "@/lib/auth";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LazyRoute } from "./components/LazyRoute";

// Lazy load all pages for better code splitting
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Users = lazy(() => import("./features/users/pages/Users"));
const Employees = lazy(() => import("./features/employees/pages/Employees"));
const Projects = lazy(() => import("./features/projects/pages/Projects"));
const Tasks = lazy(() => import("./features/tasks/pages/Tasks"));
const TaskCreate = lazy(() => import("./features/tasks/pages/TaskCreate"));
const TaskEdit = lazy(() => import("./features/tasks/pages/TaskEdit"));
const TaskView = lazy(() => import("./features/tasks/pages/TaskView"));
const Kanban = lazy(() => import("./features/kanban/pages/Kanban"));
const KanbanBoardDetail = lazy(() => import("./features/kanban/pages/KanbanBoardDetail"));
const Bugs = lazy(() => import("./features/bugs/pages/Bugs"));
const Leaves = lazy(() => import("./features/leaves/pages/Leaves"));
const Reimbursements = lazy(() => import("./features/reimbursements/pages/Reimbursements"));
const ReimbursementCreate = lazy(() => import("./features/reimbursements/pages/ReimbursementCreate"));
const ReimbursementEdit = lazy(() => import("./features/reimbursements/pages/ReimbursementEdit"));
const ReimbursementView = lazy(() => import("./features/reimbursements/pages/ReimbursementView"));
const AuditLogs = lazy(() => import("./features/audit-logs/pages/AuditLogs"));
const Settings = lazy(() => import("./features/settings/pages/Settings"));
const FileManager = lazy(() => import("./pages/FileManager"));
const Notifications = lazy(() => import("./features/notifications/pages/Notifications"));
const Reports = lazy(() => import("./features/reports/pages/Reports"));
const Timesheet = lazy(() => import("./features/timesheet/pages/Timesheet"));
const EmployeeProfile = lazy(() => import("./features/employees/pages/EmployeeProfile"));
const EmployeeCreate = lazy(() => import("./features/employees/pages/EmployeeCreate"));
const EmployeeEdit = lazy(() => import("./features/employees/pages/EmployeeEdit"));
const EmployeeList = lazy(() => import("./features/employees/pages/EmployeeList"));
const EmployeeView = lazy(() => import("./features/employees/pages/EmployeeView"));
const BugDetail = lazy(() => import("./features/bugs/pages/BugDetail"));
const BugCreate = lazy(() => import("./features/bugs/pages/BugCreate"));
const BugEdit = lazy(() => import("./features/bugs/pages/BugEdit"));
const ProjectDetail = lazy(() => import("./features/projects/pages/ProjectDetail"));
const ProjectCreate = lazy(() => import("./features/projects/pages/ProjectCreate"));
const ProjectEdit = lazy(() => import("./features/projects/pages/ProjectEdit"));
const RolesPositions = lazy(() => import("./features/roles/pages/RolesPositions"));
const RolesPermissions = lazy(() => import("./features/roles/pages/RolesPermissions"));
const Permissions = lazy(() => import("./features/roles/pages/Permissions"));
const ProfileSetup = lazy(() => import("./features/auth/pages/ProfileSetup"));
const UserHierarchy = lazy(() => import("./features/users/pages/UserHierarchy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MFASetup = lazy(() => import("./pages/MFASetup"));
const MFAVerify = lazy(() => import("./pages/MFAVerify"));
const ITAssetDashboard = lazy(() => import("./features/assets/pages/ITAssetDashboard"));
const Assets = lazy(() => import("./features/assets/pages/Assets"));
const AssetCreate = lazy(() => import("./features/assets/pages/AssetCreate"));
const AssetView = lazy(() => import("./features/assets/pages/AssetView"));
const AssetEdit = lazy(() => import("./features/assets/pages/AssetEdit"));
const AssetAssignments = lazy(() => import("./features/assets/pages/AssetAssignments"));
const AssignAsset = lazy(() => import("./features/assets/pages/AssignAsset"));
const ReturnAsset = lazy(() => import("./features/assets/pages/ReturnAsset"));
const AssetTickets = lazy(() => import("./features/assets/pages/AssetTickets"));
const AssetMaintenance = lazy(() => import("./features/assets/pages/AssetMaintenance"));
const AssetInventory = lazy(() => import("./features/assets/pages/AssetInventory"));
const InventoryAdjustment = lazy(() => import("./features/assets/pages/InventoryAdjustment"));
const InventoryHistory = lazy(() => import("./features/assets/pages/InventoryHistory"));
const InventoryReports = lazy(() => import("./features/assets/pages/InventoryReports"));
const InventoryCreate = lazy(() => import("./features/assets/pages/InventoryCreate"));
const InventoryEdit = lazy(() => import("./features/assets/pages/InventoryEdit"));
const AssetReports = lazy(() => import("./features/assets/pages/AssetReports"));
const AssetApprovals = lazy(() => import("./features/assets/pages/AssetApprovals"));
const AssetSettings = lazy(() => import("./features/assets/pages/AssetSettings"));
const MyITAssets = lazy(() => import("./features/assets/pages/MyITAssets"));
const MyDevices = lazy(() => import("./features/assets/pages/MyDevices"));
const MyDeviceView = lazy(() => import("./features/assets/pages/MyDeviceView"));
const RaiseTicket = lazy(() => import("./features/assets/pages/RaiseTicket"));
const AssetTicketDetail = lazy(() => import("./features/assets/pages/AssetTicketDetail"));
const MyTickets = lazy(() => import("./features/assets/pages/MyTickets"));
const SupportTicketView = lazy(() => import("./features/assets/pages/SupportTicketView"));
const SupportTicketCreate = lazy(() => import("./features/assets/pages/SupportTicketCreate"));

// QueryClient is already exposed in lib/queryClient.ts

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
      // Show alert instead of redirecting to login
      toast({
        title: "Access Denied",
        description: "You don't have access to this page or function. Please contact your administrator if you believe this is an error.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [hasAccess, isLoading]);

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
    // Show access denied message instead of redirecting
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">
                  You don't have access to this page or function. Please contact your administrator if you believe this is an error.
                </p>
              </div>
              <Button onClick={() => navigate(-1)} variant="outline">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
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
          <NotificationAlert />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LazyRoute><Login /></LazyRoute>} />
            <Route path="/forgot-password" element={<LazyRoute><ForgotPassword /></LazyRoute>} />
            <Route path="/mfa/setup" element={<LazyRoute><MFASetup /></LazyRoute>} />
            <Route path="/mfa/verify" element={<LazyRoute><MFAVerify /></LazyRoute>} />
            
            {/* Protected Admin Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<LazyRoute><Dashboard /></LazyRoute>} />
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute requiredPermission="users.view">
                    <LazyRoute><Users /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/employees" 
                element={
                  <ProtectedRoute requiredPermission="employees.view">
                    <LazyRoute><Employees /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route path="/employees/list" element={<LazyRoute><EmployeeList /></LazyRoute>} />
              <Route 
                path="/employees/new" 
                element={
                  <ProtectedRoute requiredPermission="employees.create">
                    <LazyRoute><EmployeeCreate /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route path="/employees/:id/edit" element={<LazyRoute><EmployeeEdit /></LazyRoute>} />
              <Route path="/employees/:id/view" element={<LazyRoute><EmployeeView /></LazyRoute>} />
              <Route 
                path="/projects" 
                element={
                  <ProtectedRoute requiredPermission="projects.view">
                    <LazyRoute><Projects /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/new" 
                element={
                  <ProtectedRoute requiredPermission="projects.create">
                    <LazyRoute><ProjectCreate /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/:id" 
                element={
                  <ProtectedRoute requiredPermission="projects.view">
                    <LazyRoute><ProjectDetail /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/:id/edit" 
                element={
                  <ProtectedRoute requiredPermission="projects.edit">
                    <LazyRoute><ProjectEdit /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tasks"
                element={
                  <ProtectedRoute requiredPermission="tasks.view">
                    <LazyRoute><Tasks /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tasks/new"
                element={
                  <ProtectedRoute requiredPermission="tasks.create">
                    <LazyRoute><TaskCreate /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tasks/:id"
                element={
                  <ProtectedRoute requiredPermission="tasks.view">
                    <LazyRoute><TaskView /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tasks/:id/edit"
                element={
                  <ProtectedRoute requiredPermission="tasks.edit">
                    <LazyRoute><TaskEdit /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/kanban"
                element={
                  <ProtectedRoute requiredPermission="tasks.view">
                    <LazyRoute><Kanban /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/kanban/:id"
                element={
                  <ProtectedRoute requiredPermission="tasks.view">
                    <LazyRoute><KanbanBoardDetail /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bugs" 
                element={
                  <ProtectedRoute requiredPermission="bugs.view">
                    <LazyRoute><Bugs /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bugs/new" 
                element={
                  <ProtectedRoute requiredPermission="bugs.create">
                    <LazyRoute><BugCreate /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bugs/:id" 
                element={
                  <ProtectedRoute requiredPermission="bugs.view">
                    <LazyRoute><BugDetail /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bugs/:id/edit" 
                element={
                  <ProtectedRoute requiredPermission="bugs.edit">
                    <LazyRoute><BugEdit /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route path="/leaves" element={<LazyRoute><Leaves /></LazyRoute>} />
              <Route 
                path="/reimbursements" 
                element={
                  <ProtectedRoute requiredPermission="reimbursements.view">
                    <LazyRoute><Reimbursements /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reimbursements/new" 
                element={
                  <ProtectedRoute requiredPermission="reimbursements.create">
                    <LazyRoute><ReimbursementCreate /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reimbursements/:id" 
                element={
                  <ProtectedRoute requiredPermission="reimbursements.view">
                    <LazyRoute><ReimbursementView /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reimbursements/:id/edit" 
                element={
                  <ProtectedRoute requiredPermission="reimbursements.edit">
                    <LazyRoute><ReimbursementEdit /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/audit-logs" 
                element={
                  <ProtectedRoute allowedRoles={['Super Admin', 'Admin']}>
                    <LazyRoute><AuditLogs /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route path="/files" element={<LazyRoute><FileManager /></LazyRoute>} />
              <Route path="/notifications" element={<LazyRoute><Notifications /></LazyRoute>} />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute requiredPermission="reports.view">
                    <LazyRoute><Reports /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route path="/timesheet" element={<LazyRoute><Timesheet /></LazyRoute>} />
              <Route 
                path="/user-hierarchy" 
                element={
                  <ProtectedRoute allowedRoles={['Super Admin']}>
                    <LazyRoute><UserHierarchy /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/roles-positions" 
                element={
                  <ProtectedRoute allowedRoles={['Super Admin']}>
                    <LazyRoute><RolesPositions /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route path="/employee-profile/:id" element={<LazyRoute><EmployeeProfile /></LazyRoute>} />
              <Route path="/settings" element={<LazyRoute><Settings /></LazyRoute>} />
              <Route path="/profile-setup" element={<LazyRoute><ProfileSetup /></LazyRoute>} />
              <Route 
                path="/roles-permissions" 
                element={
                  <ProtectedRoute requiredPermission="roles_permissions.view">
                    <LazyRoute><RolesPermissions /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/permissions" 
                element={
                  <ProtectedRoute allowedRoles={['Super Admin']}>
                    <LazyRoute><Permissions /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              {/* IT Asset Management Routes - Admin Only */}
              <Route 
                path="/it-assets/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><ITAssetDashboard /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assets" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><Assets /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assets/new" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetCreate /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assets/:id" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetView /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assets/:id/edit" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetEdit /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assignments" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetAssignments /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assignments/new" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssignAsset /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/assignments/:id/return" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><ReturnAsset /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/it-assets/tickets"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin', 'Developer', 'Employee', 'Tester', 'Designer', 'Team Leader', 'Team Lead']}>
                    <LazyRoute><AssetTickets /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/it-assets/tickets/:id"
                element={
                  <ProtectedRoute>
                    <LazyRoute><AssetTicketDetail /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              {/* Support - All users except Super Admin */}
              <Route 
                path="/support" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <LazyRoute><MyTickets /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/support/new"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <LazyRoute><SupportTicketCreate /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support/tickets/:id"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <LazyRoute><SupportTicketView /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/it-assets/maintenance" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetMaintenance /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/it-assets/inventory/create"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><InventoryCreate /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/it-assets/inventory/history"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><InventoryHistory /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/it-assets/inventory/reports"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><InventoryReports /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/it-assets/inventory/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><InventoryEdit /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/it-assets/inventory/:id/adjust"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><InventoryAdjustment /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/it-assets/inventory"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetInventory /></LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/it-assets/reports" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetReports /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/approvals" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetApprovals /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/it-assets/settings" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                    <LazyRoute><AssetSettings /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              {/* My Devices - All users except Super Admin */}
              <Route 
                path="/my-devices" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <LazyRoute><MyDevices /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-devices/:id" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <LazyRoute><MyDeviceView /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              {/* Employee IT Assets View - All users except Super Admin (deprecated, keeping for backward compatibility) */}
              <Route 
                path="/my-it-assets" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <LazyRoute><MyITAssets /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-it-assets/raise-request" 
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Team Leader', 'Team Lead', 'Employee', 'Developer', 'Tester', 'Designer']}>
                    <LazyRoute><RaiseTicket /></LazyRoute>
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            <Route path="*" element={<LazyRoute><NotFound /></LazyRoute>} />
          </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  // Initialize theme color from localStorage on app start, or use default
  useEffect(() => {
    const root = document.documentElement;
    const savedColor = localStorage.getItem("theme-color");
    const defaultColor = "242 57% 58%"; // Default indigo color
    
    // Use saved color or default
    const colorToUse = savedColor || defaultColor;
    
    // Apply color to CSS variables
    root.style.setProperty("--primary", colorToUse);
    root.style.setProperty("--ring", colorToUse);
    root.style.setProperty("--sidebar-primary", colorToUse);
    root.style.setProperty("--sidebar-ring", colorToUse);
    root.style.setProperty("--chart-1", colorToUse);
    
    // If no color was saved, save the default
    if (!savedColor) {
      localStorage.setItem("theme-color", defaultColor);
    }
    
    // Set default theme to light if not set
    const savedTheme = localStorage.getItem("vite-ui-theme");
    if (!savedTheme) {
      localStorage.setItem("vite-ui-theme", "light");
    }
  }, []);

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
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            <LoadingProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AppContent />
              </TooltipProvider>
            </LoadingProvider>
          </NotificationProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
