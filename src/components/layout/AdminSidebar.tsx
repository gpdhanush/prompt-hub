import { NavLink, useLocation } from "react-router-dom";
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
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Shield,
  KeyRound,
  FileText,
  Laptop,
  Package,
  ClipboardList,
  Wrench,
  Warehouse,
  FileBarChart,
  CheckCircle,
  Settings,
  Ticket,
  UserSearch,
  LogOut,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { getCurrentUser, clearAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { authApi } from "@/features/auth/api";

// All menu items in one list - organized by sections
const allMenuItems = [
  // Dashboard - Separate, no section label
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: null },
  // Administration (Super Admin only)
  { name: "Audit Logs", href: "/audit-logs", icon: FileText, section: "admin" },
  { name: "User Hierarchy", href: "/user-hierarchy", icon: Users, section: "admin" },
  { name: "Roles & Positions", href: "/roles-positions", icon: Shield, section: "admin" },
  { name: "Roles & Permissions", href: "/roles-permissions", icon: KeyRound, section: "admin" },
  // Main Management
  { name: "Employees", href: "/employees", icon: UserCog, section: "main" },
  { name: "Employee Directory", href: "/employees/list", icon: UserSearch, section: "main" },
  { name: "Projects", href: "/projects", icon: FolderKanban, section: "main" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, section: "main" },
  { name: "Bugs", href: "/bugs", icon: Bug, section: "main" },
  { name: "Leaves", href: "/leaves", icon: Calendar, section: "main" },
  { name: "Reimbursements", href: "/reimbursements", icon: Receipt, section: "main" },
  { name: "Timesheet", href: "/timesheet", icon: Clock, section: "main" },
  { name: "My Devices", href: "/my-devices", icon: Laptop, section: "main" },
  { name: "Reports", href: "/reports", icon: BarChart3, section: "main" },
  
  // IT Asset Management - Admin only (full menu)
  { name: "IT Asset Dashboard", href: "/it-assets/dashboard", icon: LayoutDashboard, section: "it-assets" },
  { name: "Assets", href: "/it-assets/assets", icon: Package, section: "it-assets" },
  { name: "Assignments", href: "/it-assets/assignments", icon: ClipboardList, section: "it-assets" },
  { name: "Tickets", href: "/it-assets/tickets", icon: Ticket, section: "it-assets" },
  { name: "Maintenance", href: "/it-assets/maintenance", icon: Wrench, section: "it-assets" },
  { name: "Inventory", href: "/it-assets/inventory", icon: Warehouse, section: "it-assets" },
  
  // Support - All users except Super Admin (moved to end)
  { name: "Support", href: "/support", icon: Ticket, section: "support" },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
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
  // Permission-based access checks
  const canAccessLeaves = isSuperAdmin || hasPermission('leaves.view');
  const canAccessReimbursements = isSuperAdmin || hasPermission('reimbursements.view');
  const canAccessReports = isSuperAdmin || hasPermission('reports.view');
  
  // Roles & Positions - Super Admin only (system-level)
  const canAccessRolesPositions = isSuperAdmin;
  // Roles & Permissions - Super Admin only
  const canAccessRolesPermissions = isSuperAdmin;
  // Audit Logs - Super Admin and Admin only
  const canAccessAuditLogs = isSuperAdmin || userRole === 'Admin';
  
  // IT Asset Management - Admin only (level 2 users)
  const isAdmin = userRole === 'Admin' || isSuperAdmin;
  const canAccessITAssets = isAdmin;
  
  // Tickets menu - Check permission for ticket view
  // Super Admin and Admin always have access, others need it_assets.tickets.view permission
  const canAccessTickets = isSuperAdmin || isAdmin || hasPermission('it_assets.tickets.view');
  
  // My Devices - All users except Super Admin (employees see their own devices)
  const canAccessMyDevices = !isSuperAdmin;
  
  // Support - All users except Admin and Super Admin
  const canAccessSupport = !isSuperAdmin && !isAdmin;
  
  // Logout handler
  const handleLogout = async () => {
    try {
      // Call backend logout API to revoke refresh token
      await authApi.logout();
    } catch (error) {
      // Log error but continue with frontend logout
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear frontend state, even if API call fails
      await clearAuth();
      
      // Clear all React Query cache
      queryClient.clear();
      
      // Redirect to login
      navigate('/login');
    }
  };

  const isActive = (href: string) => {
    // Exact match for dashboard and other specific routes
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    // Routes that should match exactly (no sub-pages)
    const exactMatchRoutes = ['/audit-logs', '/roles-positions', '/roles-permissions', '/reports', '/leaves', '/reimbursements', '/timesheet', '/my-devices', '/user-hierarchy', '/employees/list', '/support'];
    if (exactMatchRoutes.includes(href)) {
      return location.pathname === href;
    }
    // Special handling for /support - should match /support, /support/new, /support/tickets/:id
    if (href === '/support') {
      return location.pathname === href || 
             location.pathname === '/support/new' ||
             location.pathname.match(/^\/support\/tickets\/\d+$/);
    }
    // For routes that have sub-pages, check if pathname starts with href
    // This handles:
    // - /tasks, /tasks/new, /tasks/123, /tasks/123/edit
    // - /projects, /projects/new, /projects/123, /projects/123/edit
    // - /bugs, /bugs/new, /bugs/123, /bugs/123/edit
    // - /employees, /employees/new, /employees/123, /employees/123/edit
    // - /it-assets/* routes
    // Special handling for /employees - should match /employees, /employees/new, /employees/:id/edit
    // But NOT /employees/list, /employees/:id/view, or /employee-profile/:id
    if (href === '/employees') {
      return location.pathname === href || 
             location.pathname === '/employees/new' ||
             location.pathname.match(/^\/employees\/\d+\/edit$/);
    }
    // Special handling for Employee Directory - should match /employees/list, /employees/:id/view, and /employee-profile/:id
    if (href === '/employees/list') {
      return location.pathname === href || 
             location.pathname.match(/^\/employees\/\d+\/view$/) ||
             location.pathname.match(/^\/employee-profile\/\d+$/);
    }
    return location.pathname === href || location.pathname.startsWith(href + '/');
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
        "flex h-screen flex-col border-r border-sidebar-border bg-transparent transition-all duration-300 relative",
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
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 pb-20">
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
            // IT Asset Management - Admin only (except Tickets which requires permission)
            if (item.section === 'it-assets') {
              // Hide IT Asset Dashboard for Admin users (only show for Super Admin)
              if (item.href === '/it-assets/dashboard' && !isSuperAdmin) return false;
              // Tickets menu - Admin/Super Admin have access, others need it_assets.tickets.view permission
              if (item.href === '/it-assets/tickets' && !canAccessTickets) return false;
              // Other IT Asset menus are Admin only
              if (item.href !== '/it-assets/tickets' && item.href !== '/it-assets/dashboard' && !canAccessITAssets) return false;
              
              // If no items in this section are accessible, hide the section header
              // This is handled by checking if any items pass the filter
            }
            // My Devices - All users except Super Admin (now in main section, check by href)
            if (item.href === '/my-devices' && !canAccessMyDevices) return false;
            // Support - All users except Admin and Super Admin
            if (item.href === '/support' && !canAccessSupport) return false;
            return true;
          })
          .map((item, index, filteredItems) => {
            // Show section headers (skip for items with null section or empty label)
            const prevItem = index > 0 ? filteredItems[index - 1] : null;
            const sectionLabels: Record<string, string> = {
              main: "Management",
              admin: "Administration",
              "it-assets": "IT Asset Management",
              "support": "", // Support section - no label
            };
            const sectionLabel = item.section ? sectionLabels[item.section] : '';
            
            // For IT Asset Management section, only show header if at least one item is accessible
            let showSectionHeader = item.section !== null && 
                                   sectionLabel !== '' && 
                                   (index === 0 || !prevItem || prevItem.section !== item.section);
            
            // Special handling for IT Asset Management section
            if (item.section === 'it-assets') {
              // Check if any IT Asset items are accessible
              const hasAccessibleItems = filteredItems.some(filteredItem => 
                filteredItem.section === 'it-assets'
              );
              showSectionHeader = showSectionHeader && hasAccessibleItems;
            }
            
            // Hide "Management" section label for non-Super Admin users
            if (item.section === 'main' && !isSuperAdmin) {
              showSectionHeader = false;
            }
            
            // Never show header for support section
            if (item.section === 'support') {
              showSectionHeader = false;
            }

            return (
              <div key={item.href}>
                {showSectionHeader && !collapsed && (
                  <p className="mb-2 mt-4 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {sectionLabel}
                  </p>
                )}
                <NavItem item={item} />
              </div>
            );
          })}
      </nav>

      {/* Logout Button - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border bg-background p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 dark:text-red-400 dark:hover:text-red-300"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0 mr-3" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
