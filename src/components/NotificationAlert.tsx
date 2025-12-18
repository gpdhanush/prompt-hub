import React, { useEffect } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function NotificationAlert() {
  const { currentNotification, dismissNotification } = useNotification();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    console.log('🔔 [NotificationAlert] currentNotification changed:', currentNotification);
    if (currentNotification) {
      console.log('🔔 [NotificationAlert] Opening dialog with notification:', currentNotification);
      setIsOpen(true);
    } else {
      console.log('🔔 [NotificationAlert] No notification, closing dialog');
      setIsOpen(false);
    }
  }, [currentNotification]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      dismissNotification();
    }, 200); // Wait for animation to complete
  };

  const handleView = () => {
    if (currentNotification?.link) {
      navigate(currentNotification.link);
    }
    handleClose();
  };

  if (!currentNotification) {
    return null;
  }

  const { title, body, icon, image, link, type } = currentNotification;

  // Determine notification type styling
  const getTypeStyles = () => {
    switch (type) {
      case 'task':
        return 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20';
      case 'bug':
        return 'border-red-500/50 bg-red-50 dark:bg-red-950/20';
      case 'project':
        return 'border-green-500/50 bg-green-50 dark:bg-green-950/20';
      case 'approval':
        return 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20';
      default:
        return 'border-primary/50 bg-primary/5';
    }
  };

  console.log('🔔 [NotificationAlert] Rendering, isOpen:', isOpen, 'currentNotification:', currentNotification);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('🔔 [NotificationAlert] Dialog onOpenChange:', open);
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent
        className={cn(
          'sm:max-w-md p-0 overflow-hidden z-[9999]',
          getTypeStyles()
        )}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={handleClose}
      >
        <div className="relative">
          {/* Header with icon and close button */}
          <div className="flex items-start justify-between p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                {icon ? (
                  <img src={icon} alt="" className="h-6 w-6" />
                ) : (
                  <Bell className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <DialogHeader>
                  <DialogTitle className="text-left text-base font-semibold">
                    {title || 'New Notification'}
                  </DialogTitle>
                </DialogHeader>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image if available */}
          {image && (
            <div className="w-full h-48 overflow-hidden">
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Body content */}
          <div className="px-4 pb-4">
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              {body || 'You have a new notification'}
            </DialogDescription>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-4">
              {link && (
                <Button
                  onClick={handleView}
                  className="flex-1"
                  size="sm"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleClose}
                className={cn(link ? 'flex-1' : 'w-full')}
                size="sm"
              >
                Dismiss
              </Button>
            </div>
          </div>

          {/* Decorative bottom border */}
          <div className="h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

