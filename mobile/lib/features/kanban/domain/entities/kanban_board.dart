import 'package:equatable/equatable.dart';
import 'kanban_column.dart';

class KanbanBoard extends Equatable {
  final int id;
  final String name;
  final String? description;
  final int? projectId;
  final String? projectName;
  final int createdBy;
  final String? createdByName;
  final DateTime createdAt;
  final List<KanbanColumn> columns;

  const KanbanBoard({
    required this.id,
    required this.name,
    this.description,
    this.projectId,
    this.projectName,
    required this.createdBy,
    this.createdByName,
    required this.createdAt,
    this.columns = const [],
  });

  factory KanbanBoard.fromJson(Map<String, dynamic> json) {
    final columns = (json['columns'] as List<dynamic>?)
            ?.map((col) => KanbanColumn.fromJson(col))
            .toList() ??
        [];

    return KanbanBoard(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      projectId: json['project_id'] as int?,
      projectName: json['project_name'] as String?,
      createdBy: json['created_by'] as int,
      createdByName: json['created_by_name'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      columns: columns,
    );
  }

  KanbanBoard copyWith({
    int? id,
    String? name,
    String? description,
    int? projectId,
    String? projectName,
    int? createdBy,
    String? createdByName,
    DateTime? createdAt,
    List<KanbanColumn>? columns,
  }) {
    return KanbanBoard(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      projectId: projectId ?? this.projectId,
      projectName: projectName ?? this.projectName,
      createdBy: createdBy ?? this.createdBy,
      createdByName: createdByName ?? this.createdByName,
      createdAt: createdAt ?? this.createdAt,
      columns: columns ?? this.columns,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        projectId,
        projectName,
        createdBy,
        createdAt,
        columns,
      ];
}
