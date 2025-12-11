import { useState } from "react";
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

const notificationTypes = {
  task_assigned: { icon: CheckSquare, color: "text-blue-500", label: "Task Assignment" },
  bug_reported: { icon: Bug, color: "text-red-500", label: "Bug Report" },
  leave_approved: { icon: Calendar, color: "text-green-500", label: "Leave Approval" },
  reimbursement_approved: { icon: Receipt, color: "text-purple-500", label: "Reimbursement" },
  prompt_usage: { icon: Sparkles, color: "text-yellow-500", label: "Prompt Usage" },
  audit_log: { icon: FileText, color: "text-gray-500", label: "Audit Log" },
};

const sampleNotifications = [
  {
    id: 1,
    type: "task_assigned",
    title: "New Task Assigned",
    message: "Task #08342 has been assigned to you",
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    payload: { taskId: 8342, projectId: 1 },
  },
  {
    id: 2,
    type: "bug_reported",
    title: "New Bug Reported",
    message: "Bug BG-0023 reported in your project",
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
    payload: { bugId: 23, taskId: 1 },
  },
  {
    id: 3,
    type: "leave_approved",
    title: "Leave Approved",
    message: "Your leave request has been approved",
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    payload: { leaveId: 1 },
  },
  {
    id: 4,
    type: "reimbursement_approved",
    title: "Reimbursement Approved",
    message: "Your reimbursement claim has been approved",
    isRead: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    payload: { reimbursementId: 1 },
  },
  {
    id: 5,
    type: "prompt_usage",
    title: "Prompt Exported",
    message: "You exported 'Full System Architect' prompt",
    isRead: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    payload: { promptId: 1 },
  },
  {
    id: 6,
    type: "task_assigned",
    title: "Task Status Updated",
    message: "Task #08343 status changed to 'In Progress'",
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    payload: { taskId: 8343 },
  },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotifications = notifications.filter((notif) => {
    const matchesFilter = filter === "all" || 
      (filter === "unread" && !notif.isRead) ||
      (filter === "read" && notif.isRead);
    const matchesSearch = notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
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
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
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
              {notifications.filter(n => n.isRead).length}
            </div>
            <p className="text-xs text-muted-foreground">Read</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {notifications.filter(n => n.type === "task_assigned").length}
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
        {filteredNotifications.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications found</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const typeInfo = notificationTypes[notification.type as keyof typeof notificationTypes] || {
              icon: Bell,
              color: "text-gray-500",
              label: "Notification",
            };
            const Icon = typeInfo.icon;

            return (
              <Card
                key={notification.id}
                className={cn(
                  "glass-card transition-all hover:border-primary/50",
                  !notification.isRead && "border-primary/30 bg-primary/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      !notification.isRead ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className={cn("h-5 w-5", typeInfo.color)} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={cn(
                            "font-medium",
                            !notification.isRead && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </div>
                        <StatusBadge variant="neutral" className="text-[10px]">
                          {typeInfo.label}
                        </StatusBadge>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => markAsRead(notification.id)}
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

