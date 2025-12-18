import 'package:equatable/equatable.dart';

class KanbanTask extends Equatable {
  final int id;
  final int boardId;
  final int columnId;
  final String taskCode;
  final String title;
  final String? description;
  final String priority;
  final String status;
  final int position;
  final int? assignedTo;
  final String? assignedToName;
  final DateTime? dueDate;
  final bool isLocked;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const KanbanTask({
    required this.id,
    required this.boardId,
    required this.columnId,
    required this.taskCode,
    required this.title,
    this.description,
    required this.priority,
    required this.status,
    required this.position,
    this.assignedTo,
    this.assignedToName,
    this.dueDate,
    this.isLocked = false,
    required this.createdAt,
    this.updatedAt,
  });

  factory KanbanTask.fromJson(Map<String, dynamic> json) {
    return KanbanTask(
      id: json['id'] as int,
      boardId: json['board_id'] as int,
      columnId: json['column_id'] as int,
      taskCode: json['task_code'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      priority: json['priority'] as String? ?? 'Medium',
      status: json['status'] as String,
      position: json['position'] as int? ?? 0,
      assignedTo: json['assigned_to'] as int?,
      assignedToName: json['assigned_to_name'] as String?,
      dueDate: json['due_date'] != null
          ? DateTime.parse(json['due_date'] as String)
          : null,
      isLocked: json['is_locked'] == 1 || json['is_locked'] == true,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  KanbanTask copyWith({
    int? id,
    int? boardId,
    int? columnId,
    String? taskCode,
    String? title,
    String? description,
    String? priority,
    String? status,
    int? position,
    int? assignedTo,
    String? assignedToName,
    DateTime? dueDate,
    bool? isLocked,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return KanbanTask(
      id: id ?? this.id,
      boardId: boardId ?? this.boardId,
      columnId: columnId ?? this.columnId,
      taskCode: taskCode ?? this.taskCode,
      title: title ?? this.title,
      description: description ?? this.description,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      position: position ?? this.position,
      assignedTo: assignedTo ?? this.assignedTo,
      assignedToName: assignedToName ?? this.assignedToName,
      dueDate: dueDate ?? this.dueDate,
      isLocked: isLocked ?? this.isLocked,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        boardId,
        columnId,
        taskCode,
        title,
        description,
        priority,
        status,
        position,
        assignedTo,
        dueDate,
        isLocked,
        createdAt,
      ];
}
