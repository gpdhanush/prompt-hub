part of 'projects_bloc.dart';

abstract class ProjectsState extends Equatable {
  const ProjectsState();

  @override
  List<Object?> get props => [];
}

class ProjectsInitial extends ProjectsState {}

class ProjectsLoading extends ProjectsState {}

class ProjectsLoadingMore extends ProjectsState {
  final List<Project> projects;

  const ProjectsLoadingMore({required this.projects});

  @override
  List<Object?> get props => [projects];
}

class ProjectsLoaded extends ProjectsState {
  final List<Project> projects;
  final bool hasReachedMax;

  const ProjectsLoaded({
    required this.projects,
    this.hasReachedMax = false,
  });

  @override
  List<Object?> get props => [projects, hasReachedMax];
}

class ProjectsError extends ProjectsState {
  final String message;

  const ProjectsError({required this.message});

  @override
  List<Object?> get props => [message];
}

