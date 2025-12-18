import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:logger/logger.dart';
import 'package:dio/dio.dart';

import '../../../../core/storage/secure_storage_service.dart';
import '../../../../core/di/injection_container.dart' as di;
import '../../../../core/routing/app_router.dart';

class FCMService {
  static final Logger _logger = Logger();
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static SecureStorageService? _storage;

  static Future<void> initialize() async {
    try {
      _storage = di.sl<SecureStorageService>();

      // Request permission
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        _logger.i('User granted notification permission');
      } else {
        _logger.w('User declined notification permission');
      }

      // Initialize local notifications
      await _initializeLocalNotifications();

      // Get FCM token
      final token = await _messaging.getToken();
      if (token != null) {
        await _storage?.saveFCMToken(token);
        await _registerTokenToBackend(token);
        _logger.i('FCM Token: $token');
      }

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) async {
        await _storage?.saveFCMToken(newToken);
        await _registerTokenToBackend(newToken);
        _logger.i('FCM Token refreshed: $newToken');
      });

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle background message taps
      FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageTap);

      // Check if app was opened from terminated state
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleMessageTap(initialMessage);
      }
    } catch (e) {
      _logger.e('Error initializing FCM: $e');
    }
  }

  static Future<void> _initializeLocalNotifications() async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        _handleNotificationTap(details.payload);
      },
    );
  }

  static Future<void> _registerTokenToBackend(String token) async {
    try {
      final dio = di.sl<Dio>();
      await dio.post(
        '/fcm/register',
        data: {
          'token': token,
          'deviceType': 'mobile',
          'platform': 'flutter',
        },
      );
      _logger.i('FCM token registered to backend');
    } catch (e) {
      _logger.e('Error registering FCM token: $e');
    }
  }

  static Future<void> _handleForegroundMessage(RemoteMessage message) async {
    _logger.i('Foreground message received: ${message.messageId}');

    // Show local notification
    final notification = message.notification;
    final data = message.data;

    if (notification != null) {
      await _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'high_importance_channel',
            'High Importance Notifications',
            channelDescription:
                'This channel is used for important notifications',
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: DarwinNotificationDetails(),
        ),
        payload: data['link'] ?? data.toString(),
      );
    }
  }

  static void _handleMessageTap(RemoteMessage message) {
    _logger.i('Message tapped: ${message.messageId}');
    final data = message.data;
    _navigateFromNotification(data);
  }

  static void _handleNotificationTap(String? payload) {
    if (payload != null) {
      _navigateFromNotification({'link': payload});
    }
  }

  static void _navigateFromNotification(Map<String, dynamic> data) {
    final link = data['link'] as String?;
    if (link == null) return;

    // Use GoRouter directly from AppRouter
    final router = AppRouter.router;

    if (link.startsWith('/projects/')) {
      router.go(link);
    } else if (link.startsWith('/tasks/')) {
      router.go(link);
    } else if (link.startsWith('/kanban/')) {
      router.go(link);
    } else {
      router.go(link);
    }
  }

  // Background message handler (must be top-level function)
  @pragma('vm:entry-point')
  static Future<void> firebaseMessagingBackgroundHandler(
      RemoteMessage message) async {
    _logger.i('Background message received: ${message.messageId}');
  }
}
