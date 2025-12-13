import { useState, useEffect, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    isOnline: navigator.onLine,
    hasUpdate: false,
    installPrompt: null,
  });

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if app is installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');

    // Check if already installed
    const isInstalled = localStorage.getItem('pwa-installed') === 'true' || isStandalone;

    setState(prev => ({
      ...prev,
      isStandalone,
      isInstalled,
    }));

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: event,
      }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
      localStorage.setItem('pwa-installed', 'true');
    };

    // Listen for online/offline events
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    // Check for service worker updates
    const setupServiceWorkerUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            // Check if there's already a waiting service worker
            const checkWaitingWorker = () => {
              // Don't show update prompt if we're currently updating
              const isUpdating = sessionStorage.getItem('pwa-updating') === 'true';
              if (isUpdating) {
                setState(prev => ({ ...prev, hasUpdate: false }));
                return;
              }

              // Only show update if there's a waiting worker
              if (registration.waiting) {
                setState(prev => ({ ...prev, hasUpdate: true }));
              } else {
                setState(prev => ({ ...prev, hasUpdate: false }));
              }
            };

            // Check immediately on mount
            checkWaitingWorker();

            // Listen for new service worker installation
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  // When new worker is installed and waiting
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    checkWaitingWorker();
                  }
                });
              }
            });

            // Listen for controller change (service worker activated)
            const controllerChangeHandler = () => {
              // Clear update flag when new service worker takes control
              setState(prev => ({ ...prev, hasUpdate: false }));
              sessionStorage.removeItem('pwa-updating');
            };
            
            navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);

            // Check for updates periodically (but don't show prompt if already updating)
            updateIntervalRef.current = setInterval(async () => {
              const isUpdating = sessionStorage.getItem('pwa-updating') === 'true';
              if (!isUpdating) {
                await registration.update();
                // Check again after update check
                setTimeout(checkWaitingWorker, 1000);
              }
            }, 60000); // Check every minute
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      }
    };

    setupServiceWorkerUpdates();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!state.installPrompt) {
      return false;
    }

    try {
      await state.installPrompt.prompt();
      const choiceResult = await state.installPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          installPrompt: null,
        }));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  const updateServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        // Mark that we're updating to prevent showing prompt again
        sessionStorage.setItem('pwa-updating', 'true');
        setState(prev => ({ ...prev, hasUpdate: false }));
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          // Send skip waiting message to activate new service worker
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Wait a bit for the message to be processed, then reload
          setTimeout(() => {
            window.location.reload();
          }, 100);
        } else {
          // No waiting worker, just clear the flag
          sessionStorage.removeItem('pwa-updating');
        }
      } catch (error) {
        console.error('Error updating service worker:', error);
        sessionStorage.removeItem('pwa-updating');
        setState(prev => ({ ...prev, hasUpdate: true }));
      }
    }
  };

  return {
    ...state,
    install,
    updateServiceWorker,
  };
}
