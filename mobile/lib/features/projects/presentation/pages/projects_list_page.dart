import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:pull_to_refresh/pull_to_refresh.dart';
import 'package:shimmer/shimmer.dart';

import '../bloc/projects_bloc.dart';
import '../../../../core/di/injection_container.dart' as di;
import '../widgets/project_card.dart';
import '../../domain/entities/project.dart';

class ProjectsListPage extends StatefulWidget {
  const ProjectsListPage({super.key});

  @override
  State<ProjectsListPage> createState() => _ProjectsListPageState();
}

class _ProjectsListPageState extends State<ProjectsListPage> {
  final _refreshController = RefreshController(initialRefresh: false);
  final _scrollController = ScrollController();
  int _currentPage = 1;
  bool _showMyProjects = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    context.read<ProjectsBloc>().add(
          const GetProjectsEvent(page: 1, limit: 20),
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
      context.read<ProjectsBloc>().add(
            GetProjectsEvent(
              page: _currentPage,
              limit: 20,
              myProjects: _showMyProjects ? 1 : null,
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
    context.read<ProjectsBloc>().add(
          RefreshProjectsEvent(myProjects: _showMyProjects ? 1 : null),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => di.sl<ProjectsBloc>(),
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Projects'),
          actions: [
            IconButton(
              icon: Icon(_showMyProjects
                  ? Icons.filter_list
                  : Icons.filter_list_outlined),
              onPressed: () {
                setState(() {
                  _showMyProjects = !_showMyProjects;
                  _currentPage = 1;
                });
                context.read<ProjectsBloc>().add(
                      RefreshProjectsEvent(
                          myProjects: _showMyProjects ? 1 : null),
                    );
              },
            ),
          ],
        ),
        body: BlocConsumer<ProjectsBloc, ProjectsState>(
          listener: (context, state) {
            if (state is ProjectsLoaded || state is ProjectsError) {
              _refreshController.refreshCompleted();
            }
          },
          builder: (context, state) {
            if (state is ProjectsLoading) {
              return _buildShimmerLoader();
            }

            if (state is ProjectsError) {
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
                        context.read<ProjectsBloc>().add(
                              const GetProjectsEvent(page: 1, limit: 20),
                            );
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              );
            }

            if (state is ProjectsLoaded && state.projects.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.folder_outlined,
                      size: 64,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No projects found',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ],
                ),
              );
            }

            final projects = state is ProjectsLoaded
                ? state.projects
                : state is ProjectsLoadingMore
                    ? state.projects
                    : <Project>[];

            return SmartRefresher(
              controller: _refreshController,
              onRefresh: _onRefresh,
              enablePullDown: true,
              enablePullUp: false,
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount:
                    projects.length + (state is ProjectsLoadingMore ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index >= projects.length) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: CircularProgressIndicator(),
                      ),
                    );
                  }

                  return ProjectCard(
                    project: projects[index],
                    onTap: () {
                      context.push('/projects/${projects[index].id}');
                    },
                  );
                },
              ),
            );
          },
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () {
            // TODO: Navigate to create project
          },
          icon: const Icon(Icons.add),
          label: const Text('New Project'),
        ),
      ),
    );
  }

  Widget _buildShimmerLoader() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Shimmer.fromColors(
          baseColor: Colors.grey.shade300,
          highlightColor: Colors.grey.shade100,
          child: Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        );
      },
    );
  }
}
