import '../repositories/auth_repository.dart';

class LogoutUseCase {
  final AuthRepository repository;

  LogoutUseCase(this.repository);

  Future<void> call(String? refreshToken) async {
    await repository.logout(refreshToken);
  }
}
