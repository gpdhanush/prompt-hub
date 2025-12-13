import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCog,
  FolderKanban,
  CheckSquare,
  Bug,
  Calendar,
  Receipt,
  Settings,
  Bell,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCircle,
  KeyRound,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCurrentUser, clearAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";

// All menu items in one list - organized by sections
const allMenuItems = [
  // Main Management
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "main" },
  { name: "Users", href: "/users", icon: Users, section: "main" },
  { name: "Employees", href: "/employees", icon: UserCog, section: "main" },
  { name: "Projects", href: "/projects", icon: FolderKanban, section: "main" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, section: "main" },
  { name: "Bugs", href: "/bugs", icon: Bug, section: "main" },
  { name: "Leaves", href: "/leaves", icon: Calendar, section: "main" },
  { name: "Reimbursements", href: "/reimbursements", icon: Receipt, section: "main" },
  { name: "Reports", href: "/reports", icon: BarChart3, section: "main" },
  // Profile
  { name: "Profile Setup", href: "/profile-setup", icon: UserCircle, section: "profile" },
  // Administration (Super Admin only)
  { name: "Roles & Positions", href: "/roles-positions", icon: Shield, section: "admin" },
  { name: "Roles & Permissions", href: "/roles-permissions", icon: KeyRound, section: "admin" },
  // System
  { name: "Audit Logs", href: "/audit-logs", icon: FileText, section: "system" },
  { name: "Notifications", href: "/notifications", icon: Bell, section: "system" },
  { name: "Settings", href: "/settings", icon: Settings, section: "system" },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Get current user info to filter menu items
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  
  // Use permission-based checks instead of hardcoded roles
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  
  // Super Admin always has access to everything
  const isSuperAdmin = userRole === 'Super Admin';
  
  // Check permissions for page access (Super Admin bypasses all checks)
  const canAccessUsers = isSuperAdmin || hasPermission('users.view');
  const canAccessEmployees = isSuperAdmin || hasPermission('employees.view');
  const canAccessProjects = isSuperAdmin || hasPermission('projects.view');
  const canAccessTasks = isSuperAdmin || hasPermission('tasks.view');
  const canAccessBugs = isSuperAdmin || hasPermission('bugs.view');
  // For leaves and reimbursements, default to true if permission doesn't exist (for backward compatibility)
  const canAccessLeaves = isSuperAdmin || hasPermission('leaves.view') || true;
  const canAccessReimbursements = isSuperAdmin || hasPermission('reimbursements.view') || true;
  const canAccessReports = isSuperAdmin || hasPermission('reports.view') || userRole === 'Admin' || userRole === 'Team Leader' || userRole === 'Team Lead';
  
  // Roles & Positions - Super Admin only (system-level)
  const canAccessRolesPositions = isSuperAdmin;
  // Roles & Permissions - Super Admin only
  const canAccessRolesPermissions = isSuperAdmin;
  // Audit Logs - Super Admin and Admin only
  const canAccessAuditLogs = isSuperAdmin || userRole === 'Admin';

  const isActive = (href: string) => location.pathname === href;

  const handleLogout = async () => {
    // Clear authentication data from secure storage
    await clearAuth();
    
    // Clear all React Query cache
    queryClient.clear();
    
    // Redirect to login
    navigate('/login');
  };

  const NavItem = ({ item }: { item: typeof allMenuItems[0] }) => (
    <NavLink
      to={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive(item.href)
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.name}</span>}
    </NavLink>
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-transparent transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 bg-transparent">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img 
              src="/assets/images/fav-icon.png" 
              alt="Logo" 
              className="h-8 w-8 object-contain"
            />
            <span className="font-semibold text-foreground">Naethra EMS</span>
          </div>
        ) : (
          <div className="mx-auto">
            <img 
              src="/assets/images/fav-icon.png" 
              alt="Logo" 
              className="h-8 w-8 object-contain"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation - All items in one scrollable list */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {allMenuItems
          .filter((item) => {
            // Permission-based visibility checks
            if (item.href === '/users' && !canAccessUsers) return false;
            if (item.href === '/employees' && !canAccessEmployees) return false;
            if (item.href === '/projects' && !canAccessProjects) return false;
            if (item.href === '/tasks' && !canAccessTasks) return false;
            if (item.href === '/bugs' && !canAccessBugs) return false;
            if (item.href === '/leaves' && !canAccessLeaves) return false;
            if (item.href === '/reimbursements' && !canAccessReimbursements) return false;
            if (item.href === '/reports' && !canAccessReports) return false;
            // Admin items - Super Admin only
            if (item.section === 'admin' && !canAccessRolesPositions) return false;
            if (item.href === '/roles-permissions' && !canAccessRolesPermissions) return false;
            // Audit Logs - Super Admin and Admin only
            if (item.href === '/audit-logs' && !canAccessAuditLogs) return false;
            return true;
          })
          .map((item, index, filteredItems) => {
            // Show section headers
            const prevItem = index > 0 ? filteredItems[index - 1] : null;
            const showSectionHeader = !prevItem || prevItem.section !== item.section;
            const sectionLabels: Record<string, string> = {
              main: "Management",
              profile: "Profile",
              admin: "Administration",
              system: "System",
            };

            return (
              <div key={item.href}>
                {showSectionHeader && !collapsed && (
                  <p className="mb-2 mt-4 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {sectionLabels[item.section]}
                  </p>
                )}
                <NavItem item={item} />
              </div>
            );
          })}
      </nav>

      {/* Logout Button - Fixed at bottom */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => setShowLogoutDialog(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/10"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need to login again to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
