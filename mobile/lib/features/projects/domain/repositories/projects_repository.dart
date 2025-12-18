import '../entities/project.dart';

abstract class ProjectsRepository {
  Future<Map<String, dynamic>> getProjects({
    int? page,
    int? limit,
    int? myProjects,
  });
  Future<Project> getProjectById(int id);
}

