part of 'kanban_bloc.dart';

abstract class KanbanState extends Equatable {
  const KanbanState();

  @override
  List<Object?> get props => [];
}

class KanbanInitial extends KanbanState {}

class KanbanLoading extends KanbanState {}

class KanbanLoaded extends KanbanState {
  final KanbanBoard board;

  const KanbanLoaded({required this.board});

  @override
  List<Object?> get props => [board];
}

class KanbanError extends KanbanState {
  final String message;

  const KanbanError({required this.message});

  @override
  List<Object?> get props => [message];
}
