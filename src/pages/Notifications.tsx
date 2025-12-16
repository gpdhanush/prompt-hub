import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  Search,
  Trash2,
  MoreHorizontal,
  User,
  CheckSquare,
  Bug,
  Receipt,
  Calendar,
  Sparkles,
  FileText,
  Clock,
  Loader2,
  AlertCircle,
  Folder,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/features/notifications/api";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const notificationTypes: Record<string, { icon: any; color: string; label: string }> = {
  task_assigned: { icon: CheckSquare, color: "text-blue-500", label: "Task Assignment" },
  task_status_updated: { icon: CheckSquare, color: "text-blue-500", label: "Task Update" },
  bug_assigned: { icon: Bug, color: "text-red-500", label: "Bug Assignment" },
  bug_status_updated: { icon: Bug, color: "text-red-500", label: "Bug Update" },
  bug_reported: { icon: Bug, color: "text-red-500", label: "Bug Report" },
  leave_status_updated: { icon: Calendar, color: "text-green-500", label: "Leave Update" },
  leave_approved: { icon: Calendar, color: "text-green-500", label: "Leave Approval" },
  reimbursement_status_updated: { icon: Receipt, color: "text-purple-500", label: "Reimbursement Update" },
  reimbursement_approved: { icon: Receipt, color: "text-purple-500", label: "Reimbursement" },
  project_assigned: { icon: Folder, color: "text-indigo-500", label: "Project Assignment" },
  user_updated: { icon: User, color: "text-cyan-500", label: "Profile Update" },
  prompt_usage: { icon: Sparkles, color: "text-yellow-500", label: "Prompt Usage" },
  audit_log: { icon: FileText, color: "text-gray-500", label: "Audit Log" },
  tl_leave_approved: { icon: Calendar, color: "text-green-500", label: "Team Lead Leave" },
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch notifications
  const { data: notificationsData, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
  });

  const notifications = notificationsData?.data || [];

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = unreadCountData?.count || 0;

  const filteredNotifications = notifications.filter((notif: any) => {
    const matchesFilter = filter === "all" || 
      (filter === "unread" && !notif.is_read) ||
      (filter === "read" && notif.is_read);
    const matchesSearch = notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast({ title: "Success", description: "Notification marked as read." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read.",
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast({ title: "Success", description: "All notifications marked as read." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    },
  });

  const markAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type and payload
    if (notification.payload?.link) {
      navigate(notification.payload.link);
    } else if (notification.type === 'task_assigned' && notification.payload?.taskId) {
      navigate('/tasks');
    } else if (notification.type === 'bug_assigned' && notification.payload?.bugId) {
      navigate(`/bugs/${notification.payload.bugId}`);
    } else if (notification.type === 'project_assigned' && notification.payload?.projectId) {
      navigate(`/projects/${notification.payload.projectId}`);
    } else if (notification.type === 'leave_status_updated' || notification.type === 'tl_leave_approved') {
      navigate('/leaves');
    } else if (notification.type === 'reimbursement_status_updated') {
      navigate('/reimbursements');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <StatusBadge variant="error" className="ml-2">
                {unreadCount} new
              </StatusBadge>
            )}
          </h1>
          <p className="text-muted-foreground">Manage your notifications and alerts</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={markAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark All Read
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{notifications.length}</div>
            <p className="text-xs text-muted-foreground">Total Notifications</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-error">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {notifications.filter((n: any) => n.is_read).length}
            </div>
            <p className="text-xs text-muted-foreground">Read</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {notifications.filter((n: any) => n.type?.includes('task')).length}
            </div>
            <p className="text-xs text-muted-foreground">Task Notifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notifications</SelectItem>
            <SelectItem value="unread">Unread Only</SelectItem>
            <SelectItem value="read">Read Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive">Error loading notifications</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filter !== "all" 
                  ? "No notifications found matching your filters" 
                  : "No notifications yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification: any) => {
            const typeInfo = notificationTypes[notification.type] || {
              icon: Bell,
              color: "text-gray-500",
              label: "Notification",
            };
            const Icon = typeInfo.icon;
            const createdAt = notification.created_at ? new Date(notification.created_at) : new Date();
            const isUnread = !notification.is_read;

            return (
              <Card
                key={notification.id}
                className={cn(
                  "glass-card transition-all hover:border-primary/50 cursor-pointer",
                  isUnread && "border-primary/30 bg-primary/5"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      isUnread ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className={cn("h-5 w-5", typeInfo.color)} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={cn(
                            "font-medium",
                            isUnread && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(createdAt, { addSuffix: true })}
                        </div>
                        <StatusBadge variant="neutral" className="text-[10px]">
                          {typeInfo.label}
                        </StatusBadge>
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            disabled={markAsReadMutation.isPending}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

