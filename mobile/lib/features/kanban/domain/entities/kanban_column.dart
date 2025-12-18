import 'package:equatable/equatable.dart';
import 'kanban_task.dart';

class KanbanColumn extends Equatable {
  final int id;
  final int boardId;
  final String name;
  final String status;
  final int position;
  final String color;
  final int? wipLimit;
  final int taskCount;
  final List<KanbanTask> tasks;

  const KanbanColumn({
    required this.id,
    required this.boardId,
    required this.name,
    required this.status,
    required this.position,
    required this.color,
    this.wipLimit,
    this.taskCount = 0,
    this.tasks = const [],
  });

  factory KanbanColumn.fromJson(Map<String, dynamic> json) {
    final tasks = (json['tasks'] as List<dynamic>?)
            ?.map((task) => KanbanTask.fromJson(task))
            .toList() ??
        [];

    return KanbanColumn(
      id: json['id'] as int,
      boardId: json['board_id'] as int,
      name: json['name'] as String,
      status: json['status'] as String,
      position: json['position'] as int,
      color: json['color'] as String? ?? '#3B82F6',
      wipLimit: json['wip_limit'] as int?,
      taskCount: json['task_count'] as int? ?? tasks.length,
      tasks: tasks,
    );
  }

  KanbanColumn copyWith({
    int? id,
    int? boardId,
    String? name,
    String? status,
    int? position,
    String? color,
    int? wipLimit,
    int? taskCount,
    List<KanbanTask>? tasks,
  }) {
    return KanbanColumn(
      id: id ?? this.id,
      boardId: boardId ?? this.boardId,
      name: name ?? this.name,
      status: status ?? this.status,
      position: position ?? this.position,
      color: color ?? this.color,
      wipLimit: wipLimit ?? this.wipLimit,
      taskCount: taskCount ?? this.taskCount,
      tasks: tasks ?? this.tasks,
    );
  }

  @override
  List<Object?> get props => [
        id,
        boardId,
        name,
        status,
        position,
        color,
        wipLimit,
        taskCount,
        tasks,
      ];
}
