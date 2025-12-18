import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../domain/entities/kanban_task.dart';

class KanbanTaskCard extends StatelessWidget {
  final KanbanTask task;
  final VoidCallback onTap;

  const KanbanTaskCard({
    super.key,
    required this.task,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Task Code and Priority
              Row(
                children: [
                  Expanded(
                    child: Text(
                      task.taskCode,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ),
                  _buildPriorityChip(context),
                ],
              ),
              const SizedBox(height: 8),
              // Title
              Text(
                task.title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (task.description != null && task.description!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  task.description!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 8),
              // Footer
              Row(
                children: [
                  if (task.assignedToName != null) ...[
                    CircleAvatar(
                      radius: 10,
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      child: Text(
                        task.assignedToName![0].toUpperCase(),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (task.dueDate != null) ...[
                    Icon(
                      Icons.calendar_today,
                      size: 14,
                      color: _isOverdue(task.dueDate!)
                          ? Colors.red
                          : Colors.grey.shade600,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      DateFormat('MMM dd').format(task.dueDate!),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: _isOverdue(task.dueDate!)
                                ? Colors.red
                                : Colors.grey.shade600,
                            fontWeight: _isOverdue(task.dueDate!)
                                ? FontWeight.w600
                                : FontWeight.normal,
                          ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPriorityChip(BuildContext context) {
    Color color;
    String label;

    switch (task.priority.toLowerCase()) {
      case 'critical':
        color = Colors.red;
        label = 'Critical';
        break;
      case 'high':
        color = Colors.orange;
        label = 'High';
        break;
      case 'medium':
        color = Colors.blue;
        label = 'Medium';
        break;
      case 'low':
        color = Colors.grey;
        label = 'Low';
        break;
      default:
        color = Colors.blue;
        label = task.priority;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  bool _isOverdue(DateTime dueDate) {
    return dueDate.isBefore(DateTime.now()) &&
        !dueDate.isAtSameMomentAs(DateTime.now());
  }
}

