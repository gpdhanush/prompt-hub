import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../../domain/entities/kanban_board.dart';
import '../../domain/entities/kanban_task.dart';

abstract class KanbanRemoteDataSource {
  Future<KanbanBoard> getBoard(int boardId);
  Future<KanbanTask> createTask(int boardId, Map<String, dynamic> data);
  Future<KanbanTask> moveTask(int taskId, Map<String, dynamic> data);
  Future<KanbanTask> updateTask(int taskId, Map<String, dynamic> data);
  Future<void> deleteTask(int taskId);
}

class KanbanRemoteDataSourceImpl implements KanbanRemoteDataSource {
  final Dio dio;
  final Logger logger = Logger();

  KanbanRemoteDataSourceImpl(this.dio);

  @override
  Future<KanbanBoard> getBoard(int boardId) async {
    try {
      final response = await dio.get('/kanban/boards/$boardId');
      final data = response.data['data'] ?? response.data;
      return KanbanBoard.fromJson(data);
    } on DioException catch (e) {
      logger.e('Get board error: ${e.message}');
      throw _handleError(e);
    }
  }

  @override
  Future<KanbanTask> createTask(int boardId, Map<String, dynamic> data) async {
    try {
      final response = await dio.post(
        '/kanban/boards/$boardId/tasks',
        data: data,
      );
      final taskData = response.data['data'] ?? response.data;
      return KanbanTask.fromJson(taskData);
    } on DioException catch (e) {
      logger.e('Create task error: ${e.message}');
      throw _handleError(e);
    }
  }

  @override
  Future<KanbanTask> moveTask(int taskId, Map<String, dynamic> data) async {
    try {
      final response = await dio.patch(
        '/kanban/tasks/$taskId/move',
        data: data,
      );
      final taskData = response.data['data'] ?? response.data;
      return KanbanTask.fromJson(taskData);
    } on DioException catch (e) {
      logger.e('Move task error: ${e.message}');
      throw _handleError(e);
    }
  }

  @override
  Future<KanbanTask> updateTask(int taskId, Map<String, dynamic> data) async {
    try {
      final response = await dio.put(
        '/kanban/tasks/$taskId',
        data: data,
      );
      final taskData = response.data['data'] ?? response.data;
      return KanbanTask.fromJson(taskData);
    } on DioException catch (e) {
      logger.e('Update task error: ${e.message}');
      throw _handleError(e);
    }
  }

  @override
  Future<void> deleteTask(int taskId) async {
    try {
      await dio.delete('/kanban/tasks/$taskId');
    } on DioException catch (e) {
      logger.e('Delete task error: ${e.message}');
      throw _handleError(e);
    }
  }

  Exception _handleError(DioException error) {
    if (error.response != null) {
      final message = error.response?.data['error'] ??
          error.response?.data['message'] ??
          'An error occurred';
      return Exception(message);
    } else {
      return Exception('Network error: ${error.message}');
    }
  }
}
