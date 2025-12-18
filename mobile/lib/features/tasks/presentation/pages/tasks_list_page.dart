import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:project_mgmt_mobile/features/tasks/domain/entities/task.dart';
import 'package:pull_to_refresh/pull_to_refresh.dart';

import '../bloc/tasks_bloc.dart';
import '../../../../core/di/injection_container.dart' as di;
import '../widgets/task_card.dart';

class TasksListPage extends StatefulWidget {
  const TasksListPage({super.key});

  @override
  State<TasksListPage> createState() => _TasksListPageState();
}

class _TasksListPageState extends State<TasksListPage> {
  final _refreshController = RefreshController(initialRefresh: false);
  final _scrollController = ScrollController();
  int _currentPage = 1;
  bool _showMyTasks = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    context.read<TasksBloc>().add(
          const GetTasksEvent(page: 1, limit: 20),
        );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _refreshController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      _currentPage++;
      context.read<TasksBloc>().add(
            GetTasksEvent(
              page: _currentPage,
              limit: 20,
              myTasks: _showMyTasks ? 1 : null,
            ),
          );
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  void _onRefresh() {
    _currentPage = 1;
    context.read<TasksBloc>().add(
          RefreshTasksEvent(myTasks: _showMyTasks ? 1 : null),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => di.sl<TasksBloc>(),
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Tasks'),
          actions: [
            IconButton(
              icon: Icon(_showMyTasks
                  ? Icons.filter_list
                  : Icons.filter_list_outlined),
              onPressed: () {
                setState(() {
                  _showMyTasks = !_showMyTasks;
                  _currentPage = 1;
                });
                context.read<TasksBloc>().add(
                      RefreshTasksEvent(myTasks: _showMyTasks ? 1 : null),
                    );
              },
            ),
          ],
        ),
        body: BlocConsumer<TasksBloc, TasksState>(
          listener: (context, state) {
            if (state is TasksLoaded || state is TasksError) {
              _refreshController.refreshCompleted();
            }
          },
          builder: (context, state) {
            if (state is TasksError) {
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
                        context.read<TasksBloc>().add(
                              const GetTasksEvent(page: 1, limit: 20),
                            );
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              );
            }

            if (state is TasksLoaded && state.tasks.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.task_outlined,
                      size: 64,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No tasks found',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ],
                ),
              );
            }

            final tasks = state is TasksLoaded
                ? state.tasks
                : state is TasksLoadingMore
                    ? state.tasks
                    : <Task>[];

            return SmartRefresher(
              controller: _refreshController,
              onRefresh: _onRefresh,
              enablePullDown: true,
              enablePullUp: false,
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: tasks.length + (state is TasksLoadingMore ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index >= tasks.length) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(),
                      ),
                    );
                  }

                  return TaskCard(
                    task: tasks[index],
                    onTap: () {
                      context.push('/tasks/${tasks[index].id}');
                    },
                  );
                },
              ),
            );
          },
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () {
            // TODO: Navigate to create task
          },
          icon: const Icon(Icons.add),
          label: const Text('New Task'),
        ),
      ),
    );
  }
}
