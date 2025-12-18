import 'package:equatable/equatable.dart';

class Task extends Equatable {
  final int id;
  final String title;
  final String? description;
  final String? status;
  final String? priority;
  final int? projectId;
  final String? projectName;
  final int? assignedTo;
  final String? assignedToName;
  final DateTime? dueDate;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Task({
    required this.id,
    required this.title,
    this.description,
    this.status,
    this.priority,
    this.projectId,
    this.projectName,
    this.assignedTo,
    this.assignedToName,
    this.dueDate,
    required this.createdAt,
    this.updatedAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id'] as int,
      title: json['title'] as String,
      description: json['description'] as String?,
      status: json['status'] as String?,
      priority: json['priority'] as String?,
      projectId: json['project_id'] as int?,
      projectName: json['project_name'] as String?,
      assignedTo: json['assigned_to'] as int?,
      assignedToName: json['assigned_to_name'] as String?,
      dueDate: json['due_date'] != null
          ? DateTime.parse(json['due_date'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        status,
        priority,
        projectId,
        assignedTo,
        dueDate,
      ];
}

