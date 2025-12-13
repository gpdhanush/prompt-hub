import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';

export function PWAUpdatePrompt() {
  const { hasUpdate, updateServiceWorker } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if update was dismissed or we're currently updating
  useEffect(() => {
    const isUpdatingFlag = sessionStorage.getItem('pwa-updating') === 'true';
    const dismissedTime = localStorage.getItem('pwa-update-dismissed');
    
    if (isUpdatingFlag) {
      setDismissed(true);
      setIsUpdating(true);
    } else if (dismissedTime) {
      const dismissedTimestamp = parseInt(dismissedTime);
      const hoursSinceDismissed = (Date.now() - dismissedTimestamp) / (1000 * 60 * 60);
      // Show again after 1 hour
      if (hoursSinceDismissed < 1) {
        setDismissed(true);
      }
    }
  }, []);

  if (!hasUpdate || dismissed || isUpdating) {
    return null;
  }

  const handleUpdate = async () => {
    setIsUpdating(true);
    await updateServiceWorker();
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-update-dismissed', Date.now().toString());
  };

  return (
    <Card className="fixed top-4 right-4 z-50 w-80 shadow-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/20 dark:border-amber-800 animate-slide-down">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-lg text-amber-900 dark:text-amber-100">
              Update Available
            </CardTitle>
          </div>
        </div>
        <CardDescription className="text-sm text-amber-800 dark:text-amber-200">
          A new version of the app is available. Update now to get the latest features and improvements.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Now
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isUpdating}
            className="border-amber-300 text-amber-900 dark:border-amber-700 dark:text-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
