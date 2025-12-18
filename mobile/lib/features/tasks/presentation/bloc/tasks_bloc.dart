import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../domain/entities/task.dart';
import '../../domain/usecases/get_tasks_usecase.dart';

part 'tasks_event.dart';
part 'tasks_state.dart';

class TasksBloc extends Bloc<TasksEvent, TasksState> {
  final GetTasksUseCase getTasksUseCase;

  TasksBloc({required this.getTasksUseCase}) : super(TasksInitial()) {
    on<GetTasksEvent>(_onGetTasks);
    on<RefreshTasksEvent>(_onRefreshTasks);
  }

  Future<void> _onGetTasks(
    GetTasksEvent event,
    Emitter<TasksState> emit,
  ) async {
    if (state is TasksLoaded) {
      final currentState = state as TasksLoaded;
      if (currentState.hasReachedMax) return;
    }

    emit(state is TasksLoaded
        ? TasksLoadingMore(tasks: (state as TasksLoaded).tasks)
        : TasksLoading());

    try {
      final result = await getTasksUseCase(
        page: event.page ?? 1,
        limit: event.limit ?? 20,
        projectId: event.projectId,
        myTasks: event.myTasks,
      );

      final tasks = (result['data'] as List)
          .map((json) => Task.fromJson(json))
          .toList();

      final pagination = result['pagination'] as Map<String, dynamic>?;
      final hasMore = pagination != null &&
          (pagination['currentPage'] as int) <
              (pagination['totalPages'] as int);

      if (state is TasksLoadingMore) {
        final currentState = state as TasksLoadingMore;
        final updatedTasks = [...currentState.tasks, ...tasks];
        emit(TasksLoaded(
          tasks: updatedTasks,
          hasReachedMax: !hasMore,
        ));
      } else {
        emit(TasksLoaded(
          tasks: tasks,
          hasReachedMax: !hasMore,
        ));
      }
    } catch (e) {
      emit(TasksError(message: e.toString()));
    }
  }

  Future<void> _onRefreshTasks(
    RefreshTasksEvent event,
    Emitter<TasksState> emit,
  ) async {
    emit(TasksLoading());
    add(GetTasksEvent(
      page: 1,
      limit: 20,
      projectId: event.projectId,
      myTasks: event.myTasks,
    ));
  }
}

