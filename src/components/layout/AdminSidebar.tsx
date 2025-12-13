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
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";

// All menu items in one list - organized by sections
const allMenuItems = [
  // Dashboard - Separate, no section label
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: null },
  // Administration (Super Admin only)
  { name: "Audit Logs", href: "/audit-logs", icon: FileText, section: "admin" },
  { name: "Roles & Positions", href: "/roles-positions", icon: Shield, section: "admin" },
  { name: "Roles & Permissions", href: "/roles-permissions", icon: KeyRound, section: "admin" },
  // Main Management
  { name: "Employees", href: "/employees", icon: UserCog, section: "main" },
  { name: "Projects", href: "/projects", icon: FolderKanban, section: "main" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, section: "main" },
  { name: "Bugs", href: "/bugs", icon: Bug, section: "main" },
  { name: "Leaves", href: "/leaves", icon: Calendar, section: "main" },
  { name: "Reimbursements", href: "/reimbursements", icon: Receipt, section: "main" },
  { name: "My Devices", href: "/my-devices", icon: Laptop, section: "main" },
  { name: "Reports", href: "/reports", icon: BarChart3, section: "main" },
  
  // IT Asset Management - Admin only (full menu)
  { name: "IT Asset Dashboard", href: "/it-assets/dashboard", icon: LayoutDashboard, section: "it-assets" },
  { name: "Assets", href: "/it-assets/assets", icon: Package, section: "it-assets" },
  { name: "Assignments", href: "/it-assets/assignments", icon: ClipboardList, section: "it-assets" },
  { name: "Tickets", href: "/it-assets/tickets", icon: Ticket, section: "it-assets" },
  { name: "Maintenance", href: "/it-assets/maintenance", icon: Wrench, section: "it-assets" },
  { name: "Inventory", href: "/it-assets/inventory", icon: Warehouse, section: "it-assets" },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
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
  
  // Tickets menu - Admin can see all, employees can see their own
  const canAccessTickets = !isSuperAdmin; // All users except Super Admin can access tickets (filtered by role)
  
  // My Devices - All users except Super Admin (employees see their own devices)
  const canAccessMyDevices = !isSuperAdmin;

  const isActive = (href: string) => location.pathname === href;

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
            // IT Asset Management - Admin only (except Tickets which employees can access)
            if (item.section === 'it-assets') {
              // Tickets menu is accessible to all users (except Super Admin)
              if (item.href === '/it-assets/tickets' && !canAccessTickets) return false;
              // Other IT Asset menus are Admin only
              if (item.href !== '/it-assets/tickets' && !canAccessITAssets) return false;
            }
            // My Devices - All users except Super Admin (now in main section, check by href)
            if (item.href === '/my-devices' && !canAccessMyDevices) return false;
            return true;
          })
          .map((item, index, filteredItems) => {
            // Show section headers (skip for items with null section or empty label)
            const prevItem = index > 0 ? filteredItems[index - 1] : null;
            const sectionLabels: Record<string, string> = {
              main: "Management",
              admin: "Administration",
              "it-assets": "IT Asset Management",
            };
            const sectionLabel = item.section ? sectionLabels[item.section] : '';
            const showSectionHeader = item.section !== null && 
                                     sectionLabel !== '' && 
                                     (!prevItem || prevItem.section !== item.section);

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

    </aside>
  );
}
