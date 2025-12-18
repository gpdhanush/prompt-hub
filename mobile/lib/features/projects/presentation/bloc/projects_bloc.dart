import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../domain/entities/project.dart';
import '../../domain/usecases/get_projects_usecase.dart';

part 'projects_event.dart';
part 'projects_state.dart';

class ProjectsBloc extends Bloc<ProjectsEvent, ProjectsState> {
  final GetProjectsUseCase getProjectsUseCase;

  ProjectsBloc({required this.getProjectsUseCase}) : super(ProjectsInitial()) {
    on<GetProjectsEvent>(_onGetProjects);
    on<RefreshProjectsEvent>(_onRefreshProjects);
  }

  Future<void> _onGetProjects(
    GetProjectsEvent event,
    Emitter<ProjectsState> emit,
  ) async {
    if (state is ProjectsLoaded) {
      final currentState = state as ProjectsLoaded;
      if (currentState.hasReachedMax) return;
    }

    emit(state is ProjectsLoaded
        ? ProjectsLoadingMore(projects: (state as ProjectsLoaded).projects)
        : ProjectsLoading());

    try {
      final result = await getProjectsUseCase(
        page: event.page ?? 1,
        limit: event.limit ?? 20,
        myProjects: event.myProjects,
      );

      final projects = (result['data'] as List)
          .map((json) => Project.fromJson(json))
          .toList();

      final pagination = result['pagination'] as Map<String, dynamic>?;
      final hasMore = pagination != null &&
          (pagination['currentPage'] as int) <
              (pagination['totalPages'] as int);

      if (state is ProjectsLoadingMore) {
        final currentState = state as ProjectsLoadingMore;
        final updatedProjects = [...currentState.projects, ...projects];
        emit(ProjectsLoaded(
          projects: updatedProjects,
          hasReachedMax: !hasMore,
        ));
      } else {
        emit(ProjectsLoaded(
          projects: projects,
          hasReachedMax: !hasMore,
        ));
      }
    } catch (e) {
      emit(ProjectsError(message: e.toString()));
    }
  }

  Future<void> _onRefreshProjects(
    RefreshProjectsEvent event,
    Emitter<ProjectsState> emit,
  ) async {
    emit(ProjectsLoading());
    add(GetProjectsEvent(page: 1, limit: 20, myProjects: event.myProjects));
  }
}

