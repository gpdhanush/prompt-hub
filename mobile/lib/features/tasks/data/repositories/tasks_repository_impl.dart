import '../../domain/entities/task.dart';
import '../../domain/repositories/tasks_repository.dart';
import '../datasources/tasks_remote_datasource.dart';

class TasksRepositoryImpl implements TasksRepository {
  final TasksRemoteDataSource remoteDataSource;

  TasksRepositoryImpl(this.remoteDataSource);

  @override
  Future<Map<String, dynamic>> getTasks({
    int? page,
    int? limit,
    int? projectId,
    int? myTasks,
  }) async {
    return await remoteDataSource.getTasks(
      page: page,
      limit: limit,
      projectId: projectId,
      myTasks: myTasks,
    );
  }

  @override
  Future<Task> getTaskById(int id) async {
    return await remoteDataSource.getTaskById(id);
  }
}

