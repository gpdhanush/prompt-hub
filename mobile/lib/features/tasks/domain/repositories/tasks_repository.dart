import '../entities/task.dart';

abstract class TasksRepository {
  Future<Map<String, dynamic>> getTasks({
    int? page,
    int? limit,
    int? projectId,
    int? myTasks,
  });
  Future<Task> getTaskById(int id);
}

