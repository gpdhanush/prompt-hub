part of 'tasks_bloc.dart';

abstract class TasksState extends Equatable {
  const TasksState();

  @override
  List<Object?> get props => [];
}

class TasksInitial extends TasksState {}

class TasksLoading extends TasksState {}

class TasksLoadingMore extends TasksState {
  final List<Task> tasks;

  const TasksLoadingMore({required this.tasks});

  @override
  List<Object?> get props => [tasks];
}

class TasksLoaded extends TasksState {
  final List<Task> tasks;
  final bool hasReachedMax;

  const TasksLoaded({
    required this.tasks,
    this.hasReachedMax = false,
  });

  @override
  List<Object?> get props => [tasks, hasReachedMax];
}

class TasksError extends TasksState {
  final String message;

  const TasksError({required this.message});

  @override
  List<Object?> get props => [message];
}

