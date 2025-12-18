import 'package:hive_flutter/hive_flutter.dart';
import 'package:logger/logger.dart';

class HiveService {
  static const String _projectsBox = 'projects';
  static const String _tasksBox = 'tasks';
  static const String _notificationsBox = 'notifications';
  static const String _cacheBox = 'cache';

  final Logger _logger = Logger();

  Future<void> init() async {
    try {
      // Register adapters here if needed
      // Hive.registerAdapter(ProjectAdapter());

      // Open boxes
      await Hive.openBox(_projectsBox);
      await Hive.openBox(_tasksBox);
      await Hive.openBox(_notificationsBox);
      await Hive.openBox(_cacheBox);

      _logger.i('Hive initialized successfully');
    } catch (e) {
      _logger.e('Error initializing Hive: $e');
    }
  }

  // Projects cache
  Box get projectsBox => Hive.box(_projectsBox);

  // Tasks cache
  Box get tasksBox => Hive.box(_tasksBox);

  // Notifications cache
  Box get notificationsBox => Hive.box(_notificationsBox);

  // General cache
  Box get cacheBox => Hive.box(_cacheBox);

  // Cache helpers
  Future<void> cacheData(String key, dynamic data,
      {Duration? expiration}) async {
    final cacheData = {
      'data': data,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'expiration': expiration?.inMilliseconds,
    };
    await cacheBox.put(key, cacheData);
  }

  Future<T?> getCachedData<T>(String key) async {
    final cached = cacheBox.get(key);
    if (cached == null) return null;

    final timestamp = cached['timestamp'] as int;
    final expiration = cached['expiration'] as int?;

    if (expiration != null) {
      final now = DateTime.now().millisecondsSinceEpoch;
      if (now - timestamp > expiration) {
        await cacheBox.delete(key);
        return null;
      }
    }

    return cached['data'] as T?;
  }

  Future<void> clearCache() async {
    await projectsBox.clear();
    await tasksBox.clear();
    await notificationsBox.clear();
    await cacheBox.clear();
  }
}
