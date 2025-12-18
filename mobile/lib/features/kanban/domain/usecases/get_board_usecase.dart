import '../entities/kanban_board.dart';
import '../repositories/kanban_repository.dart';

class GetBoardUseCase {
  final KanbanRepository repository;

  GetBoardUseCase(this.repository);

  Future<KanbanBoard> call(int boardId) async {
    return await repository.getBoard(boardId);
  }
}
