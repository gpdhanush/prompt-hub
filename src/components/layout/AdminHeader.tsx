import { Bell, Search, User, Moon, Sun, Settings, UserCircle, LogOut, Headphones, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalSearch } from "@/components/GlobalSearch";
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
import { notificationsApi, authApi } from "@/lib/api";
import { useLocation } from "react-router-dom";
import { AvatarImage } from "@/components/ui/avatar";
import { getProfilePhotoUrl } from "@/lib/imageUtils";

export function AdminHeader() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // Get current user from secure storage
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || 'User';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';
  const canAccessSupport = !isSuperAdmin;

  // Fetch user profile with employee data (for profile photo)
  const { data: userProfileData } = useQuery({
    queryKey: ['user-profile-header'],
    queryFn: () => authApi.getMe(),
    enabled: !!currentUser,
  });

  const userProfile = userProfileData?.data;
  
  // Check for profile photo in multiple possible locations
  const employeeProfilePhoto = useMemo(() => {
    if (!userProfile) return null;
    return userProfile?.employee?.profile_photo_url 
      || userProfile?.employee?.photo 
      || userProfile?.profile_photo_url
      || userProfile?.photo
      || null;
  }, [userProfile]);
  
  const hasProfilePhoto = useMemo(() => {
    if (!employeeProfilePhoto) return false;
    const photoStr = String(employeeProfilePhoto).trim();
    return photoStr !== '' && photoStr !== 'null' && photoStr !== 'undefined';
  }, [employeeProfilePhoto]);
  
  // Get the profile photo URL
  const profilePhotoUrl = useMemo(() => {
    if (!hasProfilePhoto || !employeeProfilePhoto) return undefined;
    return getProfilePhotoUrl(employeeProfilePhoto);
  }, [hasProfilePhoto, employeeProfilePhoto]);

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

  // Keyboard shortcut for global search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      if (e.key === 'Escape' && showGlobalSearch) {
        setShowGlobalSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGlobalSearch]);

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

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-6">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search anything... (⌘K)"
          className="pl-10 bg-background/50 border-border/50 focus:border-primary cursor-pointer"
          onClick={() => setShowGlobalSearch(true)}
          readOnly
        />
      </div>

      {/* Global Search Dialog */}
      <GlobalSearch open={showGlobalSearch} onOpenChange={setShowGlobalSearch} />

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 text-blue-600" />
            )}
          </Button>
        )}
        
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" title="Notifications">
              <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground animate-pulse">
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

        {/* Support - All users except Super Admin */}
        {canAccessSupport && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/support')}
            className={location.pathname === '/support' ? 'bg-primary/10 text-primary' : ''}
            title="Support"
          >
            <Headphones className="h-5 w-5 text-green-600 dark:text-green-400" />
          </Button>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-primary/5">
              {hasProfilePhoto && (
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-sm font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground">{userRole}</span>
                </div>
              )}
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                {hasProfilePhoto && profilePhotoUrl ? (
                  <AvatarImage 
                    src={profilePhotoUrl} 
                    alt={userName}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!hasProfilePhoto && (
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground">{userRole}</span>
                </div>
              )}
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
