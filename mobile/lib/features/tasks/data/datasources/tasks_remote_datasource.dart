import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../../domain/entities/task.dart';

abstract class TasksRemoteDataSource {
  Future<Map<String, dynamic>> getTasks({
    int? page,
    int? limit,
    int? projectId,
    int? myTasks,
  });
  Future<Task> getTaskById(int id);
}

class TasksRemoteDataSourceImpl implements TasksRemoteDataSource {
  final Dio dio;
  final Logger logger = Logger();

  TasksRemoteDataSourceImpl(this.dio);

  @override
  Future<Map<String, dynamic>> getTasks({
    int? page,
    int? limit,
    int? projectId,
    int? myTasks,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;
      if (projectId != null) queryParams['project_id'] = projectId;
      if (myTasks != null) queryParams['my_tasks'] = myTasks;

      final response = await dio.get(
        '/tasks',
        queryParameters: queryParams,
      );

      return response.data;
    } on DioException catch (e) {
      logger.e('Get tasks error: ${e.message}');
      throw _handleError(e);
    }
  }

  @override
  Future<Task> getTaskById(int id) async {
    try {
      final response = await dio.get('/tasks/$id');
      final data = response.data['data'] ?? response.data;
      return Task.fromJson(data);
    } on DioException catch (e) {
      logger.e('Get task by id error: ${e.message}');
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

