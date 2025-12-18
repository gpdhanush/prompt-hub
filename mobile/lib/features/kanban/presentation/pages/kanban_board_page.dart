import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/kanban_bloc.dart';
import '../../../../core/di/injection_container.dart' as di;
import '../widgets/kanban_column_widget.dart';

class KanbanBoardPage extends StatefulWidget {
  final int projectId;

  const KanbanBoardPage({super.key, required this.projectId});

  @override
  State<KanbanBoardPage> createState() => _KanbanBoardPageState();
}

class _KanbanBoardPageState extends State<KanbanBoardPage> {
  @override
  void initState() {
    super.initState();
    // Load board for this project
    // Note: In a real app, you'd need to get boardId from projectId
    // For now, assuming projectId is the boardId
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<KanbanBloc>().add(LoadBoardEvent(widget.projectId));
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => di.sl<KanbanBloc>(),
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Kanban Board'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () {
                context.read<KanbanBloc>().add(const RefreshBoardEvent());
              },
            ),
          ],
        ),
        body: BlocBuilder<KanbanBloc, KanbanState>(
          builder: (context, state) {
            if (state is KanbanLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (state is KanbanError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Theme.of(context).colorScheme.error,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      state.message,
                      style: Theme.of(context).textTheme.bodyLarge,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {
                        context.read<KanbanBloc>().add(
                              LoadBoardEvent(widget.projectId),
                            );
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              );
            }

            if (state is KanbanLoaded) {
              final board = state.board;

              if (board.columns.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.view_kanban_outlined,
                        size: 64,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No columns found',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                );
              }

              return Column(
                children: [
                  // Board Header
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                board.name,
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                              if (board.description != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  board.description!,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        color: Colors.grey.shade600,
                                      ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add),
                          onPressed: () {
                            _showCreateTaskDialog(context, board);
                          },
                        ),
                      ],
                    ),
                  ),
                  // Kanban Columns
                  Expanded(
                    child: _buildKanbanColumns(context, board),
                  ),
                ],
              );
            }

            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildKanbanColumns(BuildContext context, board) {
    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(16),
      itemCount: board.columns.length,
      itemBuilder: (context, index) {
        final column = board.columns[index];
        return SizedBox(
          width: 320,
          child: KanbanColumnWidget(
            column: column,
            onTaskTap: (task) {
              // TODO: Show task details
            },
            onTaskMove: (task, newColumnId, newPosition) {
              context.read<KanbanBloc>().add(
                    MoveTaskEvent(
                      taskId: task.id,
                      oldColumnId: task.columnId,
                      oldPosition: task.position,
                      newColumnId: newColumnId,
                      newPosition: newPosition,
                      task: task,
                    ),
                  );
            },
          ),
        );
      },
    );
  }

  void _showCreateTaskDialog(BuildContext context, board) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    int? selectedColumnId =
        board.columns.isNotEmpty ? board.columns.first.id : null;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Create Task'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'Enter task title',
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Enter task description',
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<int>(
                value: selectedColumnId,
                decoration: const InputDecoration(
                  labelText: 'Column',
                ),
                items: board.columns.map((column) {
                  return DropdownMenuItem(
                    value: column.id,
                    child: Text(column.name),
                  );
                }).toList(),
                onChanged: (value) {
                  selectedColumnId = value;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (titleController.text.isNotEmpty && selectedColumnId != null) {
                context.read<KanbanBloc>().add(
                      CreateTaskEvent({
                        'title': titleController.text,
                        'description': descriptionController.text,
                        'column_id': selectedColumnId,
                      }),
                    );
                Navigator.pop(dialogContext);
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}
