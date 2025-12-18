import '../repositories/projects_repository.dart';

class GetProjectsUseCase {
  final ProjectsRepository repository;

  GetProjectsUseCase(this.repository);

  Future<Map<String, dynamic>> call({
    int? page,
    int? limit,
    int? myProjects,
  }) async {
    return await repository.getProjects(
      page: page,
      limit: limit,
      myProjects: myProjects,
    );
  }
}

