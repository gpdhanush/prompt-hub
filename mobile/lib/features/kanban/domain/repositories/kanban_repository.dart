import '../entities/kanban_board.dart';
import '../entities/kanban_task.dart';

abstract class KanbanRepository {
  Future<KanbanBoard> getBoard(int boardId);
  Future<KanbanTask> createTask(int boardId, Map<String, dynamic> data);
  Future<KanbanTask> moveTask(int taskId, Map<String, dynamic> data);
  Future<KanbanTask> updateTask(int taskId, Map<String, dynamic> data);
  Future<void> deleteTask(int taskId);
}
