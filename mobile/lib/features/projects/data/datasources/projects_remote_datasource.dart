import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../../domain/entities/project.dart';

abstract class ProjectsRemoteDataSource {
  Future<Map<String, dynamic>> getProjects({
    int? page,
    int? limit,
    int? myProjects,
  });
  Future<Project> getProjectById(int id);
}

class ProjectsRemoteDataSourceImpl implements ProjectsRemoteDataSource {
  final Dio dio;
  final Logger logger = Logger();

  ProjectsRemoteDataSourceImpl(this.dio);

  @override
  Future<Map<String, dynamic>> getProjects({
    int? page,
    int? limit,
    int? myProjects,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (page != null) queryParams['page'] = page;
      if (limit != null) queryParams['limit'] = limit;
      if (myProjects != null) queryParams['my_projects'] = myProjects;

      final response = await dio.get(
        '/projects',
        queryParameters: queryParams,
      );

      return response.data;
    } on DioException catch (e) {
      logger.e('Get projects error: ${e.message}');
      throw _handleError(e);
    }
  }

  @override
  Future<Project> getProjectById(int id) async {
    try {
      final response = await dio.get('/projects/$id');
      final data = response.data['data'] ?? response.data;
      return Project.fromJson(data);
    } on DioException catch (e) {
      logger.e('Get project by id error: ${e.message}');
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

