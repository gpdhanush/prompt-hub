part of 'kanban_bloc.dart';

abstract class KanbanEvent extends Equatable {
  const KanbanEvent();

  @override
  List<Object?> get props => [];
}

class LoadBoardEvent extends KanbanEvent {
  final int boardId;

  const LoadBoardEvent(this.boardId);

  @override
  List<Object?> get props => [boardId];
}

class MoveTaskEvent extends KanbanEvent {
  final int taskId;
  final int oldColumnId;
  final int oldPosition;
  final int newColumnId;
  final int newPosition;
  final KanbanTask task;

  const MoveTaskEvent({
    required this.taskId,
    required this.oldColumnId,
    required this.oldPosition,
    required this.newColumnId,
    required this.newPosition,
    required this.task,
  });

  @override
  List<Object?> get props => [
        taskId,
        oldColumnId,
        oldPosition,
        newColumnId,
        newPosition,
        task,
      ];
}

class CreateTaskEvent extends KanbanEvent {
  final Map<String, dynamic> data;

  const CreateTaskEvent(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateTaskEvent extends KanbanEvent {
  final int taskId;
  final Map<String, dynamic> data;

  const UpdateTaskEvent({
    required this.taskId,
    required this.data,
  });

  @override
  List<Object?> get props => [taskId, data];
}

class DeleteTaskEvent extends KanbanEvent {
  final int taskId;

  const DeleteTaskEvent(this.taskId);

  @override
  List<Object?> get props => [taskId];
}

class RefreshBoardEvent extends KanbanEvent {
  const RefreshBoardEvent();
}

