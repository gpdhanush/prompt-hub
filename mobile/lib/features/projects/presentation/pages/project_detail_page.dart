import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ProjectDetailPage extends StatelessWidget {
  final int projectId;

  const ProjectDetailPage({super.key, required this.projectId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Project Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              // TODO: Show project options
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Project Info Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Project Information',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 16),
                    // TODO: Load and display project details
                    Text('Project ID: $projectId'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Quick Actions
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      context.push('/kanban/$projectId');
                    },
                    icon: const Icon(Icons.view_kanban),
                    label: const Text('Kanban Board'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      context.push('/tasks?project_id=$projectId');
                    },
                    icon: const Icon(Icons.task),
                    label: const Text('Tasks'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

