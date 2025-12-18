import '../entities/kanban_task.dart';
import '../repositories/kanban_repository.dart';

class UpdateTaskUseCase {
  final KanbanRepository repository;

  UpdateTaskUseCase(this.repository);

  Future<KanbanTask> call(int taskId, Map<String, dynamic> data) async {
    return await repository.updateTask(taskId, data);
  }
}
