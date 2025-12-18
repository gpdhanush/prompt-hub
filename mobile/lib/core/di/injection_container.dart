import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import '../network/dio_client.dart';
import '../storage/secure_storage_service.dart';
import '../storage/hive_service.dart';
import '../../features/auth/data/datasources/auth_remote_datasource.dart'
    show AuthRemoteDataSource, AuthRemoteDataSourceImpl;
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/usecases/login_usecase.dart';
import '../../features/auth/domain/usecases/logout_usecase.dart';
import '../../features/auth/domain/usecases/check_auth_status_usecase.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/projects/data/datasources/projects_remote_datasource.dart'
    show ProjectsRemoteDataSource, ProjectsRemoteDataSourceImpl;
import '../../features/projects/data/repositories/projects_repository_impl.dart';
import '../../features/projects/domain/repositories/projects_repository.dart';
import '../../features/projects/domain/usecases/get_projects_usecase.dart';
import '../../features/projects/presentation/bloc/projects_bloc.dart';
import '../../features/tasks/data/datasources/tasks_remote_datasource.dart'
    show TasksRemoteDataSource, TasksRemoteDataSourceImpl;
import '../../features/tasks/data/repositories/tasks_repository_impl.dart';
import '../../features/tasks/domain/repositories/tasks_repository.dart';
import '../../features/tasks/domain/usecases/get_tasks_usecase.dart';
import '../../features/tasks/presentation/bloc/tasks_bloc.dart';
import '../../features/kanban/data/datasources/kanban_remote_datasource.dart'
    show KanbanRemoteDataSource, KanbanRemoteDataSourceImpl;
import '../../features/kanban/data/repositories/kanban_repository_impl.dart';
import '../../features/kanban/domain/repositories/kanban_repository.dart';
import '../../features/kanban/domain/usecases/get_board_usecase.dart';
import '../../features/kanban/domain/usecases/move_task_usecase.dart';
import '../../features/kanban/domain/usecases/create_task_usecase.dart';
import '../../features/kanban/domain/usecases/update_task_usecase.dart';
import '../../features/kanban/domain/usecases/delete_task_usecase.dart';
import '../../features/kanban/presentation/bloc/kanban_bloc.dart';
import '../../features/notifications/presentation/services/fcm_service.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // Core
  sl.registerLazySingleton<SecureStorageService>(() => SecureStorageService());
  sl.registerLazySingleton<HiveService>(() => HiveService());
  sl.registerLazySingleton<DioClient>(() => DioClient(sl()));
  sl.registerLazySingleton<Dio>(() => sl<DioClient>().dio);

  // Initialize Hive
  await sl<HiveService>().init();

  // Features - Auth
  // Data sources
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(sl(), sl()),
  );

  // Repositories
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(sl(), sl()),
  );

  // Use cases
  sl.registerLazySingleton(() => LoginUseCase(sl()));
  sl.registerLazySingleton(() => LogoutUseCase(sl()));
  sl.registerLazySingleton(() => CheckAuthStatusUseCase(sl()));

  // BLoC
  sl.registerFactory(
    () => AuthBloc(
      loginUseCase: sl(),
      logoutUseCase: sl(),
      checkAuthStatusUseCase: sl(),
    ),
  );

  // Features - Projects
  // Data sources
  sl.registerLazySingleton<ProjectsRemoteDataSource>(
    () => ProjectsRemoteDataSourceImpl(sl()),
  );

  // Repositories
  sl.registerLazySingleton<ProjectsRepository>(
    () => ProjectsRepositoryImpl(sl()),
  );

  // Use cases
  sl.registerLazySingleton(() => GetProjectsUseCase(sl()));

  // BLoC
  sl.registerFactory(() => ProjectsBloc(getProjectsUseCase: sl()));

  // Features - Tasks
  // Data sources
  sl.registerLazySingleton<TasksRemoteDataSource>(
    () => TasksRemoteDataSourceImpl(sl()),
  );

  // Repositories
  sl.registerLazySingleton<TasksRepository>(
    () => TasksRepositoryImpl(sl()),
  );

  // Use cases
  sl.registerLazySingleton(() => GetTasksUseCase(sl()));

  // BLoC
  sl.registerFactory(() => TasksBloc(getTasksUseCase: sl()));

  // Features - Kanban
  // Data sources
  sl.registerLazySingleton<KanbanRemoteDataSource>(
    () => KanbanRemoteDataSourceImpl(sl()),
  );

  // Repositories
  sl.registerLazySingleton<KanbanRepository>(
    () => KanbanRepositoryImpl(sl()),
  );

  // Use cases
  sl.registerLazySingleton(() => GetBoardUseCase(sl()));
  sl.registerLazySingleton(() => MoveTaskUseCase(sl()));
  sl.registerLazySingleton(() => CreateTaskUseCase(sl()));
  sl.registerLazySingleton(() => UpdateTaskUseCase(sl()));
  sl.registerLazySingleton(() => DeleteTaskUseCase(sl()));

  // BLoC
  sl.registerFactory(
    () => KanbanBloc(
      getBoardUseCase: sl(),
      moveTaskUseCase: sl(),
      createTaskUseCase: sl(),
      updateTaskUseCase: sl(),
      deleteTaskUseCase: sl(),
    ),
  );

  // FCM Service
  sl.registerLazySingleton<FCMService>(() => FCMService());
}
