import '../repositories/kanban_repository.dart';

class DeleteTaskUseCase {
  final KanbanRepository repository;

  DeleteTaskUseCase(this.repository);

  Future<void> call(int taskId) async {
    await repository.deleteTask(taskId);
  }
}
