import '../../domain/entities/project.dart';
import '../../domain/repositories/projects_repository.dart';
import '../datasources/projects_remote_datasource.dart';

class ProjectsRepositoryImpl implements ProjectsRepository {
  final ProjectsRemoteDataSource remoteDataSource;

  ProjectsRepositoryImpl(this.remoteDataSource);

  @override
  Future<Map<String, dynamic>> getProjects({
    int? page,
    int? limit,
    int? myProjects,
  }) async {
    return await remoteDataSource.getProjects(
      page: page,
      limit: limit,
      myProjects: myProjects,
    );
  }

  @override
  Future<Project> getProjectById(int id) async {
    return await remoteDataSource.getProjectById(id);
  }
}

