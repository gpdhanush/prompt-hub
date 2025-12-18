import '../entities/user.dart';

abstract class AuthRepository {
  Future<Map<String, dynamic>> login(String email, String password);
  Future<void> logout(String? refreshToken);
  Future<User?> getCurrentUser();
  Future<bool> isAuthenticated();
}
