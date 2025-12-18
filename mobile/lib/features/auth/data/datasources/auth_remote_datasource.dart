import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import '../../domain/entities/user.dart';
import '../../../../core/storage/secure_storage_service.dart';

abstract class AuthRemoteDataSource {
  Future<Map<String, dynamic>> login(String email, String password);
  Future<void> logout(String? refreshToken);
  Future<User> getCurrentUser();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final Dio dio;
  final SecureStorageService storage;
  final Logger logger = Logger();

  AuthRemoteDataSourceImpl(this.dio, this.storage);

  @override
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      final data = response.data;

      // Save tokens
      await storage.saveAccessToken(data['accessToken']);
      if (data['refreshToken'] != null) {
        await storage.saveRefreshToken(data['refreshToken']);
      }

      // Save user
      if (data['user'] != null) {
        await storage.saveUser(data['user']);
      }

      return data;
    } on DioException catch (e) {
      logger.e('Login error: ${e.message}');
      throw _handleError(e);
    }
  }

  @override
  Future<void> logout(String? refreshToken) async {
    try {
      if (refreshToken != null) {
        await dio.post(
          '/auth/logout',
          data: {'refreshToken': refreshToken},
        );
      }

      await storage.clearAll();
    } on DioException catch (e) {
      logger.e('Logout error: ${e.message}');
      // Clear storage even if API call fails
      await storage.clearAll();
    }
  }

  @override
  Future<User> getCurrentUser() async {
    try {
      final response = await dio.get('/auth/me');
      final userData = response.data['data'] ?? response.data;
      return User.fromJson(userData);
    } on DioException catch (e) {
      logger.e('Get current user error: ${e.message}');
      throw _handleError(e);
    }
  }

  Exception _handleError(DioException error) {
    if (error.response != null) {
      final message = error.response?.data['error'] ??
          error.response?.data['message'] ??
          'An error occurred';
      return Exception(message);
    } else {
      return Exception('Network error: ${error.message}');
    }
  }
}
