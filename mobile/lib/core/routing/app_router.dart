import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/projects/presentation/pages/projects_list_page.dart';
import '../../features/projects/presentation/pages/project_detail_page.dart';
import '../../features/tasks/presentation/pages/tasks_list_page.dart';
import '../../features/tasks/presentation/pages/task_detail_page.dart';
import '../../features/kanban/presentation/pages/kanban_board_page.dart';
import '../../features/notifications/presentation/pages/notifications_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../storage/secure_storage_service.dart';

class AppRouter {
  static final SecureStorageService _storage = SecureStorageService();

  static final GoRouter router = GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) async {
      final isLoggedIn = await _storage.isLoggedIn();
      final isSplash = state.matchedLocation == '/splash';
      final isLogin = state.matchedLocation == '/login';

      // If on splash, check auth and redirect
      if (isSplash) {
        return isLoggedIn ? '/home' : '/login';
      }

      // If not logged in and trying to access protected route
      if (!isLoggedIn && !isLogin && !isSplash) {
        return '/login';
      }

      // If logged in and trying to access login
      if (isLoggedIn && isLogin) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            name: 'home',
            builder: (context, state) => const ProjectsListPage(),
          ),
          GoRoute(
            path: '/projects/:id',
            name: 'project-detail',
            builder: (context, state) {
              final id = int.parse(state.pathParameters['id']!);
              return ProjectDetailPage(projectId: id);
            },
          ),
          GoRoute(
            path: '/tasks',
            name: 'tasks',
            builder: (context, state) => const TasksListPage(),
          ),
          GoRoute(
            path: '/tasks/:id',
            name: 'task-detail',
            builder: (context, state) {
              final id = int.parse(state.pathParameters['id']!);
              return TaskDetailPage(taskId: id);
            },
          ),
          GoRoute(
            path: '/kanban/:projectId',
            name: 'kanban',
            builder: (context, state) {
              final projectId = int.parse(state.pathParameters['projectId']!);
              return KanbanBoardPage(projectId: projectId);
            },
          ),
          GoRoute(
            path: '/notifications',
            name: 'notifications',
            builder: (context, state) => const NotificationsPage(),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const ProfilePage(),
          ),
        ],
      ),
    ],
  );
}

class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    return NavigationBar(
      selectedIndex: _getSelectedIndex(location),
      onDestinationSelected: (index) {
        switch (index) {
          case 0:
            context.go('/home');
            break;
          case 1:
            context.go('/tasks');
            break;
          case 2:
            context.go('/notifications');
            break;
          case 3:
            context.go('/profile');
            break;
        }
      },
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.folder_outlined),
          selectedIcon: Icon(Icons.folder),
          label: 'Projects',
        ),
        NavigationDestination(
          icon: Icon(Icons.task_outlined),
          selectedIcon: Icon(Icons.task),
          label: 'Tasks',
        ),
        NavigationDestination(
          icon: Icon(Icons.notifications_outlined),
          selectedIcon: Icon(Icons.notifications),
          label: 'Notifications',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person),
          label: 'Profile',
        ),
      ],
    );
  }

  int _getSelectedIndex(String location) {
    if (location.startsWith('/home') || location.startsWith('/projects')) {
      return 0;
    } else if (location.startsWith('/tasks')) {
      return 1;
    } else if (location.startsWith('/notifications')) {
      return 2;
    } else if (location.startsWith('/profile')) {
      return 3;
    }
    return 0;
  }
}
