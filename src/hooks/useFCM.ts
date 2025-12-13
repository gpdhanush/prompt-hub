import { useEffect, useState } from 'react';
import { 
  requestNotificationPermission, 
  getCurrentFCMToken,
  onMessageListener,
  initializeFirebase,
  logAnalyticsEvent,
  logError
} from '@/lib/firebase';
import { fcmApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { getDeviceInfo } from '@/lib/deviceUtils';
import { logger } from '@/lib/logger';

export function useFCM() {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Initialize Firebase and register FCM token
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        // Initialize Firebase
        initializeFirebase();

        // Check notification permission
        if ('Notification' in window) {
          const currentPermission = Notification.permission;
          setPermission(currentPermission);
          logger.debug('📱 Current notification permission:', currentPermission);
        } else {
          logger.warn('⚠️  Notifications not supported in this browser');
          setIsLoading(false);
          return;
        }

        // Only proceed if user is logged in
        const user = getCurrentUser();
        if (!user) {
          logger.debug('⏸️  User not logged in, skipping FCM initialization');
          setIsLoading(false);
          return;
        }

        logger.info('✅ User logged in, initializing FCM...');

        // Request permission if not granted
        // Note: Browser will only show permission prompt if user hasn't been asked before
        // If permission was previously denied, user must enable it manually in browser settings
        if (Notification.permission === 'default') {
          logger.debug('📱 Requesting notification permission...');
          const permissionResult = await Notification.requestPermission();
          setPermission(permissionResult);
          logger.debug('📱 Permission result:', permissionResult);
          logAnalyticsEvent('notification_permission_requested', { result: permissionResult });
          
          if (permissionResult === 'denied') {
            logger.warn('⚠️  Notification permission denied. User must enable it in browser settings.');
          }
        } else {
          logger.debug('📱 Notification permission status:', Notification.permission);
        }

        if (Notification.permission === 'granted') {
          logger.info('✅ Notification permission granted, getting FCM token...');
          
          // Get FCM token
          const fcmToken = await getCurrentFCMToken();
          
          if (fcmToken) {
            setToken(fcmToken);
            logger.info('✅ FCM token obtained');
            
            // Register token with backend
            try {
              // Get device info
              const deviceInfo = getDeviceInfo();
              logger.debug('📱 Device info:', deviceInfo);
              
              await fcmApi.register(fcmToken, {
                deviceId: deviceInfo.deviceId,
                deviceType: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                platform: deviceInfo.platform,
              });
              setIsRegistered(true);
              logger.info('✅ FCM token registered successfully with backend');
              logAnalyticsEvent('fcm_token_registered', { 
                deviceType: deviceInfo.deviceType,
                browser: deviceInfo.browser 
              });
            } catch (error: any) {
              logError(error, { source: 'useFCM_register', deviceId: getDeviceInfo().deviceId });
              toast({
                title: 'Notification Setup',
                description: 'Failed to register for push notifications',
                variant: 'destructive',
              });
            }
          } else {
            logger.warn('⚠️  Could not get FCM token. Check VAPID key configuration.');
          }
        } else if (Notification.permission === 'denied') {
          logger.warn('⚠️  Notification permission was denied. User must enable it in browser settings.');
        } else {
          logger.debug('⏳ Notification permission is default - waiting for user to grant permission');
        }
      } catch (error) {
        logError(error as Error, { source: 'useFCM_initialize' });
      } finally {
        setIsLoading(false);
      }
    };

    initializeFCM();
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    if (Notification.permission === 'granted') {
      const setupMessageListener = async () => {
        try {
          const { payload } = await onMessageListener();
          
          // Show notification toast
          if (payload?.notification) {
            toast({
              title: payload.notification.title || 'Notification',
              description: payload.notification.body || '',
            });

            // You can also show a browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(payload.notification.title || 'Notification', {
                body: payload.notification.body || '',
                icon: payload.notification.icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: payload.data?.type || 'notification',
              });
            }
          }
        } catch (error) {
          logError(error as Error, { source: 'useFCM_messageListener' });
        }
      };

      setupMessageListener();
    }
  }, []);

  // Unregister FCM token
  const unregister = async () => {
    if (token) {
      try {
        await fcmApi.unregister(token);
        setToken(null);
        setIsRegistered(false);
        logger.info('✅ FCM token unregistered');
        logAnalyticsEvent('fcm_token_unregistered');
      } catch (error) {
        logError(error as Error, { source: 'useFCM_unregister' });
      }
    }
  };

  // Request permission manually
  const requestPermission = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        const fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          setToken(fcmToken);
          // Get device info
          const deviceInfo = getDeviceInfo();
          await fcmApi.register(fcmToken, {
            deviceId: deviceInfo.deviceId,
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            platform: deviceInfo.platform,
          });
          setIsRegistered(true);
          logAnalyticsEvent('fcm_permission_granted_manually');
          toast({
            title: 'Success',
            description: 'Push notifications enabled',
          });
        }
      } else {
        logAnalyticsEvent('fcm_permission_denied_manually');
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logError(error as Error, { source: 'useFCM_requestPermission' });
    }
  };

  return {
    token,
    isRegistered,
    isLoading,
    permission,
    unregister,
    requestPermission,
  };
}
