import 'package:flutter/material.dart';

class TaskDetailPage extends StatelessWidget {
  final int taskId;

  const TaskDetailPage({super.key, required this.taskId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Details'),
      ),
      body: Center(
        child: Text('Task ID: $taskId'),
      ),
    );
  }
}

