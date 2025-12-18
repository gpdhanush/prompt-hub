import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

import '../../domain/entities/kanban_board.dart';
import '../../domain/entities/kanban_task.dart';
import '../../domain/usecases/get_board_usecase.dart';
import '../../domain/usecases/move_task_usecase.dart';
import '../../domain/usecases/create_task_usecase.dart';
import '../../domain/usecases/update_task_usecase.dart';
import '../../domain/usecases/delete_task_usecase.dart';

part 'kanban_event.dart';
part 'kanban_state.dart';

class KanbanBloc extends Bloc<KanbanEvent, KanbanState> {
  final GetBoardUseCase getBoardUseCase;
  final MoveTaskUseCase moveTaskUseCase;
  final CreateTaskUseCase createTaskUseCase;
  final UpdateTaskUseCase updateTaskUseCase;
  final DeleteTaskUseCase deleteTaskUseCase;

  KanbanBloc({
    required this.getBoardUseCase,
    required this.moveTaskUseCase,
    required this.createTaskUseCase,
    required this.updateTaskUseCase,
    required this.deleteTaskUseCase,
  }) : super(KanbanInitial()) {
    on<LoadBoardEvent>(_onLoadBoard);
    on<MoveTaskEvent>(_onMoveTask);
    on<CreateTaskEvent>(_onCreateTask);
    on<UpdateTaskEvent>(_onUpdateTask);
    on<DeleteTaskEvent>(_onDeleteTask);
    on<RefreshBoardEvent>(_onRefreshBoard);
  }

  Future<void> _onLoadBoard(
    LoadBoardEvent event,
    Emitter<KanbanState> emit,
  ) async {
    emit(KanbanLoading());
    try {
      final board = await getBoardUseCase(event.boardId);
      emit(KanbanLoaded(board: board));
    } catch (e) {
      emit(KanbanError(message: e.toString()));
    }
  }

  Future<void> _onMoveTask(
    MoveTaskEvent event,
    Emitter<KanbanState> emit,
  ) async {
    if (state is KanbanLoaded) {
      final currentState = state as KanbanLoaded;
      final board = currentState.board;

      // Optimistic update
      final updatedColumns = board.columns.map((column) {
        if (column.id == event.oldColumnId) {
          // Remove task from old column
          final updatedTasks =
              column.tasks.where((task) => task.id != event.taskId).toList();
          return column.copyWith(tasks: updatedTasks);
        } else if (column.id == event.newColumnId) {
          // Add task to new column at position
          final task = column.tasks.firstWhere(
            (t) => t.id == event.taskId,
            orElse: () => event.task,
          );
          final updatedTasks = List<KanbanTask>.from(column.tasks);
          updatedTasks.insert(
              event.newPosition,
              task.copyWith(
                columnId: event.newColumnId,
                position: event.newPosition,
              ));
          return column.copyWith(tasks: updatedTasks);
        }
        return column;
      }).toList();

      final optimisticBoard = board.copyWith(columns: updatedColumns);
      emit(KanbanLoaded(board: optimisticBoard));

      try {
        final updatedTask = await moveTaskUseCase(event.taskId, {
          'column_id': event.newColumnId,
          'position': event.newPosition,
          'old_column_id': event.oldColumnId,
          'old_position': event.oldPosition,
        });

        // Reload board to get accurate state
        final refreshedBoard = await getBoardUseCase(board.id);
        emit(KanbanLoaded(board: refreshedBoard));
      } catch (e) {
        // Revert on error
        emit(KanbanLoaded(board: board));
        emit(KanbanError(message: e.toString()));
      }
    }
  }

  Future<void> _onCreateTask(
    CreateTaskEvent event,
    Emitter<KanbanState> emit,
  ) async {
    if (state is KanbanLoaded) {
      final currentState = state as KanbanLoaded;
      try {
        final task = await createTaskUseCase(currentState.board.id, event.data);
        // Reload board to get updated state
        final board = await getBoardUseCase(currentState.board.id);
        emit(KanbanLoaded(board: board));
      } catch (e) {
        emit(KanbanError(message: e.toString()));
      }
    }
  }

  Future<void> _onUpdateTask(
    UpdateTaskEvent event,
    Emitter<KanbanState> emit,
  ) async {
    if (state is KanbanLoaded) {
      final currentState = state as KanbanLoaded;
      try {
        await updateTaskUseCase(event.taskId, event.data);
        // Reload board
        final board = await getBoardUseCase(currentState.board.id);
        emit(KanbanLoaded(board: board));
      } catch (e) {
        emit(KanbanError(message: e.toString()));
      }
    }
  }

  Future<void> _onDeleteTask(
    DeleteTaskEvent event,
    Emitter<KanbanState> emit,
  ) async {
    if (state is KanbanLoaded) {
      final currentState = state as KanbanLoaded;
      try {
        await deleteTaskUseCase(event.taskId);
        // Reload board
        final board = await getBoardUseCase(currentState.board.id);
        emit(KanbanLoaded(board: board));
      } catch (e) {
        emit(KanbanError(message: e.toString()));
      }
    }
  }

  Future<void> _onRefreshBoard(
    RefreshBoardEvent event,
    Emitter<KanbanState> emit,
  ) async {
    if (state is KanbanLoaded) {
      final currentState = state as KanbanLoaded;
      try {
        final board = await getBoardUseCase(currentState.board.id);
        emit(KanbanLoaded(board: board));
      } catch (e) {
        emit(KanbanError(message: e.toString()));
      }
    }
  }
}
