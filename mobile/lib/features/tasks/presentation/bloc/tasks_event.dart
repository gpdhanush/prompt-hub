part of 'tasks_bloc.dart';

abstract class TasksEvent extends Equatable {
  const TasksEvent();

  @override
  List<Object?> get props => [];
}

class GetTasksEvent extends TasksEvent {
  final int? page;
  final int? limit;
  final int? projectId;
  final int? myTasks;

  const GetTasksEvent({
    this.page,
    this.limit,
    this.projectId,
    this.myTasks,
  });

  @override
  List<Object?> get props => [page, limit, projectId, myTasks];
}

class RefreshTasksEvent extends TasksEvent {
  final int? projectId;
  final int? myTasks;

  const RefreshTasksEvent({
    this.projectId,
    this.myTasks,
  });

  @override
  List<Object?> get props => [projectId, myTasks];
}

