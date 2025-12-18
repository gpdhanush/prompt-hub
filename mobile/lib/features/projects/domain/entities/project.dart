import 'package:equatable/equatable.dart';

class Project extends Equatable {
  final int id;
  final String name;
  final String? description;
  final String? status;
  final String? priority;
  final DateTime? startDate;
  final DateTime? endDate;
  final int? createdBy;
  final String? createdByName;
  final int? teamLeadId;
  final String? teamLeadName;
  final int? memberCount;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const Project({
    required this.id,
    required this.name,
    this.description,
    this.status,
    this.priority,
    this.startDate,
    this.endDate,
    this.createdBy,
    this.createdByName,
    this.teamLeadId,
    this.teamLeadName,
    this.memberCount,
    required this.createdAt,
    this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      status: json['status'] as String?,
      priority: json['priority'] as String?,
      startDate: json['start_date'] != null
          ? DateTime.parse(json['start_date'] as String)
          : null,
      endDate: json['end_date'] != null
          ? DateTime.parse(json['end_date'] as String)
          : null,
      createdBy: json['created_by'] as int?,
      createdByName: json['created_by_name'] as String?,
      teamLeadId: json['team_lead_id'] as int?,
      teamLeadName: json['team_lead_name'] as String?,
      memberCount: json['member_count'] as int?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        status,
        priority,
        startDate,
        endDate,
        createdBy,
        teamLeadName,
        memberCount,
      ];
}

