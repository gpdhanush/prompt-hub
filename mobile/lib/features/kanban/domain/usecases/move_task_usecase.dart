import '../entities/kanban_task.dart';
import '../repositories/kanban_repository.dart';

class MoveTaskUseCase {
  final KanbanRepository repository;

  MoveTaskUseCase(this.repository);

  Future<KanbanTask> call(int taskId, Map<String, dynamic> data) async {
    return await repository.moveTask(taskId, data);
  }
}
