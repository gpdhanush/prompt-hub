import '../../domain/entities/kanban_board.dart';
import '../../domain/entities/kanban_task.dart';
import '../../domain/repositories/kanban_repository.dart';
import '../datasources/kanban_remote_datasource.dart';

class KanbanRepositoryImpl implements KanbanRepository {
  final KanbanRemoteDataSource remoteDataSource;

  KanbanRepositoryImpl(this.remoteDataSource);

  @override
  Future<KanbanBoard> getBoard(int boardId) async {
    return await remoteDataSource.getBoard(boardId);
  }

  @override
  Future<KanbanTask> createTask(int boardId, Map<String, dynamic> data) async {
    return await remoteDataSource.createTask(boardId, data);
  }

  @override
  Future<KanbanTask> moveTask(int taskId, Map<String, dynamic> data) async {
    return await remoteDataSource.moveTask(taskId, data);
  }

  @override
  Future<KanbanTask> updateTask(int taskId, Map<String, dynamic> data) async {
    return await remoteDataSource.updateTask(taskId, data);
  }

  @override
  Future<void> deleteTask(int taskId) async {
    await remoteDataSource.deleteTask(taskId);
  }
}
