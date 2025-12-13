import { Bell, Search, User, Moon, Sun, Settings, UserCircle, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, clearAuth } from "@/lib/auth";
import { notificationsApi } from "@/lib/api";

export function AdminHeader() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Get current user from secure storage
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || 'User';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  // Fetch unread notification count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!currentUser, // Only fetch if user is logged in
  });

  // Fetch recent unread notifications for dropdown
  const { data: recentNotificationsData } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () => notificationsApi.getAll({ is_read: false }),
    enabled: !!currentUser,
  });

  const unreadCount = unreadCountData?.count || 0;
  const recentNotifications = recentNotificationsData?.data?.slice(0, 5) || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    // Clear authentication data from secure storage
    await clearAuth();
    
    // Clear all React Query cache
    queryClient.clear();
    
    // Redirect to login
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-6">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search anything..."
          className="pl-10 bg-background/50 border-border/50 focus:border-primary"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}
        
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <StatusBadge variant="error" className="text-xs">
                  {unreadCount} new
                </StatusBadge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                recentNotifications.map((notif: any) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    onClick={() => {
                      navigate('/notifications');
                    }}
                  >
                    <div className="flex items-start justify-between w-full">
                      <p className="text-sm font-medium line-clamp-1">{notif.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notif.created_at 
                        ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })
                        : 'Just now'}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/notifications')} className="text-center justify-center">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium">{userName}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile-setup')}>
              <UserCircle className="mr-2 h-4 w-4" />
              Profile Setup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setShowLogoutDialog(true)}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    </header>
  );
}
