import '../repositories/tasks_repository.dart';

class GetTasksUseCase {
  final TasksRepository repository;

  GetTasksUseCase(this.repository);

  Future<Map<String, dynamic>> call({
    int? page,
    int? limit,
    int? projectId,
    int? myTasks,
  }) async {
    return await repository.getTasks(
      page: page,
      limit: limit,
      projectId: projectId,
      myTasks: myTasks,
    );
  }
}

