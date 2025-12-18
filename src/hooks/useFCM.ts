import { useEffect, useState } from 'react';
import { 
  requestNotificationPermission, 
  getCurrentFCMToken,
  setupMessageListener,
  initializeFirebase,
  logAnalyticsEvent,
  logError
} from '@/lib/firebase';
import { fcmApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { getDeviceInfo } from '@/lib/deviceUtils';
import { logger } from '@/lib/logger';
import { useNotification } from '@/contexts/NotificationContext';

export function useFCM() {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { showNotification } = useNotification();

  // Initialize Firebase and register FCM token
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        // Initialize Firebase
        const firebaseApp = initializeFirebase();
        if (!firebaseApp) {
          logger.warn('⚠️  Firebase not initialized. Check your .env configuration.');
          setIsLoading(false);
          return;
        }

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

        // Don't auto-request permission - let the NotificationPermissionDialog handle it
        // This provides a better UX with a custom dialog explaining the benefits
        logger.debug('📱 Notification permission status:', Notification.permission);

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

  // Listen for foreground messages - continuous listener
  useEffect(() => {
    if (Notification.permission === 'granted') {
      logger.info('🔔 Setting up FCM message listener...');
      console.log('🔔 [FCM] Setting up message listener, permission:', Notification.permission);
      
      const cleanup = setupMessageListener((payload) => {
        console.log('📨 [FCM] Message received:', payload);
        logger.info('📨 FCM message received:', payload);
        
        try {
          // Show modern notification popup
          if (payload?.notification) {
            const notificationData = {
              title: payload.notification.title || 'New Notification',
              body: payload.notification.body || '',
              icon: payload.notification.icon,
              image: payload.notification.image || payload.notification.imageUrl,
              link: payload.data?.link || payload.fcmOptions?.link || payload.webpush?.fcmOptions?.link,
              type: payload.data?.type || 'general',
              data: payload.data,
            };

            console.log('📢 [FCM] Showing notification alert:', notificationData);
            logger.info('📢 Showing notification alert:', notificationData);

            // Show modern alert popup
            showNotification(notificationData);

            // Also show toast for quick feedback
            toast({
              title: payload.notification.title || 'Notification',
              description: payload.notification.body || '',
            });

            // Show browser notification as well
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(payload.notification.title || 'Notification', {
                body: payload.notification.body || '',
                icon: payload.notification.icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: payload.data?.type || 'notification',
              });
            }
          } else if (payload?.data) {
            // Handle data-only messages (no notification object)
            console.log('📨 [FCM] Data-only message received:', payload.data);
            logger.debug('📨 Data-only message received:', payload.data);
            const notificationData = {
              title: payload.data.title || 'New Notification',
              body: payload.data.body || payload.data.message || '',
              link: payload.data.link,
              type: payload.data.type || 'general',
              data: payload.data,
            };
            console.log('📢 [FCM] Showing data-only notification:', notificationData);
            showNotification(notificationData);
          } else {
            console.warn('⚠️ [FCM] Received message with no notification or data:', payload);
            logger.warn('⚠️ Received message with no notification or data:', payload);
          }
        } catch (error) {
          console.error('❌ [FCM] Error handling message:', error);
          logger.error('❌ Error handling FCM message:', error);
          logError(error as Error, { source: 'useFCM_messageListener' });
        }
      });

      console.log('✅ [FCM] Message listener setup complete');
      logger.info('✅ FCM message listener setup complete');

      // Cleanup on unmount
      return () => {
        console.log('🧹 [FCM] Cleaning up message listener');
        cleanup();
      };
    } else {
      console.log('⏸️ [FCM] Notification permission not granted:', Notification.permission);
      logger.debug('⏸️  Notification permission not granted, skipping message listener setup');
    }
  }, [showNotification]);

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
