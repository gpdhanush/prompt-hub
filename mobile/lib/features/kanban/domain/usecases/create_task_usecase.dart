import '../entities/kanban_task.dart';
import '../repositories/kanban_repository.dart';

class CreateTaskUseCase {
  final KanbanRepository repository;

  CreateTaskUseCase(this.repository);

  Future<KanbanTask> call(int boardId, Map<String, dynamic> data) async {
    return await repository.createTask(boardId, data);
  }
}
