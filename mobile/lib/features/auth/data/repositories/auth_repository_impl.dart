import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final SecureStorageService storage;

  AuthRepositoryImpl(this.remoteDataSource, this.storage);

  @override
  Future<Map<String, dynamic>> login(String email, String password) async {
    return await remoteDataSource.login(email, password);
  }

  @override
  Future<void> logout(String? refreshToken) async {
    await remoteDataSource.logout(refreshToken);
  }

  @override
  Future<User?> getCurrentUser() async {
    try {
      return await remoteDataSource.getCurrentUser();
    } catch (e) {
      // If API fails, try to get from storage
      final userData = await storage.getUser();
      if (userData != null) {
        return User.fromJson(userData);
      }
      return null;
    }
  }

  @override
  Future<bool> isAuthenticated() async {
    return await storage.isLoggedIn();
  }
}
