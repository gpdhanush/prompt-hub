import { useState, useEffect } from "react";
import { Bell, BellOff, X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestPermission: () => Promise<void>;
  permission: NotificationPermission;
}

export function NotificationPermissionDialog({
  open,
  onOpenChange,
  onRequestPermission,
  permission,
}: NotificationPermissionDialogProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await onRequestPermission();
      // Close dialog after a short delay if permission was granted
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          onOpenChange(false);
        }
      }, 500);
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    onOpenChange(false);
    // Store dismissal in localStorage to avoid showing again for this session
    localStorage.setItem('notification_permission_dismissed', 'true');
  };

  // Don't show if permission is already granted or was dismissed
  if (permission === 'granted' || !open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <div className="relative">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          
          {/* Header with icon */}
          <DialogHeader className="relative p-6 pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <div className="relative p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              Enable Notifications
            </DialogTitle>
            <DialogDescription className="text-center text-base mt-2">
              Stay updated with real-time notifications about your tasks, projects, and important updates.
            </DialogDescription>
          </DialogHeader>

          {/* Benefits list */}
          <div className="relative px-6 pb-4">
            <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Task Updates</p>
                    <p className="text-xs text-muted-foreground">
                      Get notified when tasks are assigned, updated, or completed
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Project Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      Receive alerts for project milestones and deadlines
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Team Messages</p>
                    <p className="text-xs text-muted-foreground">
                      Stay connected with team communications and announcements
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer with actions */}
          <DialogFooter className="relative px-6 pb-6 pt-2 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Maybe Later
            </Button>
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting || permission === 'denied'}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              {isRequesting ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  Enabling...
                </>
              ) : permission === 'denied' ? (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Permission Denied
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Enable Notifications
                </>
              )}
            </Button>
          </DialogFooter>

          {permission === 'denied' && (
            <div className="relative px-6 pb-4">
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-xs text-destructive">
                  Notifications were previously blocked. Please enable them in your browser settings to receive updates.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

