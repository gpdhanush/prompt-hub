import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';

class DioClient {
  late final Dio _dio;
  final SecureStorageService _storage;
  final Logger _logger = Logger();

  DioClient(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.baseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        sendTimeout: AppConfig.sendTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _setupInterceptors();
  }

  void _setupInterceptors() {
    // Request Interceptor - Add JWT token
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          try {
            final token = await _storage.getAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          } catch (e) {
            _logger.e('Error getting token: $e');
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 - Unauthorized
          if (error.response?.statusCode == 401) {
            try {
              // Try to refresh token
              final refreshToken = await _storage.getRefreshToken();
              if (refreshToken != null && refreshToken.isNotEmpty) {
                final refreshed = await _refreshToken(refreshToken);
                if (refreshed) {
                  // Retry original request with new token
                  final opts = error.requestOptions;
                  final newToken = await _storage.getAccessToken();
                  opts.headers['Authorization'] = 'Bearer $newToken';
                  final response = await _dio.fetch(opts);
                  return handler.resolve(response);
                }
              }
            } catch (e) {
              _logger.e('Token refresh failed: $e');
            }

            // If refresh fails, logout user
            await _storage.clearAll();
            // Navigate to login - handled by router guard
          }

          return handler.next(error);
        },
      ),
    );

    // Logging Interceptor
    _dio.interceptors.add(
      LogInterceptor(
        request: true,
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
        logPrint: (obj) => _logger.d(obj),
      ),
    );
  }

  Future<bool> _refreshToken(String refreshToken) async {
    try {
      final response = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200) {
        final data = response.data;
        await _storage.saveAccessToken(data['accessToken']);
        if (data['refreshToken'] != null) {
          await _storage.saveRefreshToken(data['refreshToken']);
        }
        return true;
      }
      return false;
    } catch (e) {
      _logger.e('Token refresh error: $e');
      return false;
    }
  }

  Dio get dio => _dio;
}
