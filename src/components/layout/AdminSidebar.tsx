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
  Clock,
  Receipt,
  Sparkles,
  FileText,
  Settings,
  Bell,
  BarChart3,
  FolderOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Employees", href: "/employees", icon: UserCog },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Bugs", href: "/bugs", icon: Bug },
  { name: "Attendance", href: "/attendance", icon: Clock },
  { name: "Leaves", href: "/leaves", icon: Calendar },
  { name: "Reimbursements", href: "/reimbursements", icon: Receipt },
];

const toolItems = [
  { name: "AI Prompts", href: "/prompts", icon: Sparkles },
  { name: "Audit Logs", href: "/audit-logs", icon: FileText },
  { name: "File Manager", href: "/files", icon: FolderOpen },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

const bottomItems = [
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

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
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">AdminHub</span>
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
        {navItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        <div className="my-4 border-t border-sidebar-border" />

        {!collapsed && (
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tools
          </p>
        )}
        {toolItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3">
        {bottomItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/10"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
