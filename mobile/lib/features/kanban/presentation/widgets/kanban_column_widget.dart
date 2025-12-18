import 'package:flutter/material.dart';

import '../../domain/entities/kanban_column.dart';
import '../../domain/entities/kanban_task.dart';
import 'kanban_task_card.dart';

class KanbanColumnWidget extends StatelessWidget {
  final KanbanColumn column;
  final Function(KanbanTask) onTaskTap;
  final Function(KanbanTask, int, int) onTaskMove;

  const KanbanColumnWidget({
    super.key,
    required this.column,
    required this.onTaskTap,
    required this.onTaskMove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.grey.shade200,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Column Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: Colors.grey.shade200,
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 24,
                  decoration: BoxDecoration(
                    color: _parseColor(column.color),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        column.name,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      Text(
                        '${column.tasks.length} tasks',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Tasks List - Drag Target
          Expanded(
            child: DragTarget<KanbanTask>(
              onAccept: (task) {
                // Task dropped from another column
                if (task.columnId != column.id) {
                  onTaskMove(task, column.id, column.tasks.length);
                }
              },
              builder: (context, candidateData, rejectedData) {
                return Container(
                  decoration: BoxDecoration(
                    color: candidateData.isNotEmpty
                        ? _parseColor(column.color).withOpacity(0.1)
                        : Colors.transparent,
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(12),
                      bottomRight: Radius.circular(12),
                    ),
                  ),
                  child: column.tasks.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.task_outlined,
                                  size: 48,
                                  color: Colors.grey.shade400,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  candidateData.isNotEmpty
                                      ? 'Drop task here'
                                      : 'No tasks',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        color: candidateData.isNotEmpty
                                            ? _parseColor(column.color)
                                            : Colors.grey.shade600,
                                        fontWeight: candidateData.isNotEmpty
                                            ? FontWeight.w600
                                            : FontWeight.normal,
                                      ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: column.tasks.length,
                          itemBuilder: (context, index) {
                            final task = column.tasks[index];
                            return _buildDraggableTask(
                              context,
                              task,
                              index,
                              column.tasks.length,
                            );
                          },
                        ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDraggableTask(
    BuildContext context,
    KanbanTask task,
    int index,
    int totalTasks,
  ) {
    return LongPressDraggable<KanbanTask>(
      data: task,
      feedback: Material(
        elevation: 8,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 280,
          child: KanbanTaskCard(
            task: task,
            onTap: () {},
          ),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.3,
        child: KanbanTaskCard(
          task: task,
          onTap: () => onTaskTap(task),
        ),
      ),
      onDragEnd: (details) {
        // Handle drag end if needed
      },
      child: GestureDetector(
        onLongPress: () {
          // Long press feedback
        },
        child: KanbanTaskCard(
          task: task,
          onTap: () => onTaskTap(task),
        ),
      ),
    );
  }

  Color _parseColor(String colorString) {
    try {
      return Color(int.parse(colorString.replaceFirst('#', '0xFF')));
    } catch (e) {
      return Colors.blue;
    }
  }
}

