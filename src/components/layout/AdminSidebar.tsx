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

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Employees", href: "/employees", icon: UserCog },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Bugs", href: "/bugs", icon: Bug },
  { name: "Leaves", href: "/leaves", icon: Calendar },
  { name: "Reimbursements", href: "/reimbursements", icon: Receipt },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

const bottomItems = [
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

const adminItems = [
  { name: "Roles & Positions", href: "/roles-positions", icon: Shield },
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
  
  // Only Admin, Super Admin, and Team Leader can access Users and Employees pages
  // Developer, Designer, Tester, and Viewer roles cannot access these pages
  const canAccessUserManagement = userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'Team Leader' || userRole === 'Team Lead';
  
  // Only Super Admin, Admin, and Team Leader can access Reports
  const canAccessReports = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Team Leader' || userRole === 'Team Lead';

  const isActive = (href: string) => location.pathname === href;

  const handleLogout = async () => {
    // Clear authentication data from secure storage
    await clearAuth();
    
    // Clear all React Query cache
    queryClient.clear();
    
    // Redirect to login
    navigate('/login');
  };

  const NavItem = ({ item }: { item: typeof navItems[0] }) => (
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

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {!collapsed && (
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Management
          </p>
        )}
        {navItems
          .filter((item) => {
            // Hide Users and Employees for Developer, Designer, Tester, and Viewer roles
            if ((item.href === '/users' || item.href === '/employees') && !canAccessUserManagement) {
              return false;
            }
            // Hide Reports for roles other than Super Admin, Admin, and Team Lead
            if (item.href === '/reports' && !canAccessReports) {
              return false;
            }
            return true;
          })
          .map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3">
        {userRole === 'Super Admin' && (
          <>
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Administration
              </p>
            )}
            {adminItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
            <div className="my-2 border-t border-sidebar-border" />
          </>
        )}
        {bottomItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
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
