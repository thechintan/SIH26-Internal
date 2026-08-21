import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  Function(String reportId)? onReportTap;

  Future<void> init() async {
    // 1. Initialize local notifications
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
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        final payload = response.payload;
        if (payload != null && onReportTap != null) {
          onReportTap!(payload);
        }
      },
    );

    // 2. Safely initialize Firebase if configured
    try {
      if (Firebase.apps.isNotEmpty) {
        final messaging = FirebaseMessaging.instance;
        await messaging.requestPermission(
          alert: true,
          badge: true,
          sound: true,
        );

        final token = await messaging.getToken();
        debugPrint('📲 FCM Token: $token');

        // Handle foreground notifications
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          _showLocalNotification(
            title: message.notification?.title ?? 'CivicPulse Update',
            body: message.notification?.body ?? '',
            payload: message.data['reportId'],
          );
        });

        // Handle notification click from background
        FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
          final reportId = message.data['reportId'];
          if (reportId != null && onReportTap != null) {
            onReportTap!(reportId);
          }
        });
      }
    } catch (e) {
      debugPrint('Firebase messaging init (optional for demo): $e');
    }
  }

  Future<void> _showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'civicpulse_status_channel',
      'CivicPulse Status Updates',
      channelDescription: 'Notifications for report status changes and routing updates',
      importance: Importance.max,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecond,
      title,
      body,
      details,
      payload: payload,
    );
  }
}
