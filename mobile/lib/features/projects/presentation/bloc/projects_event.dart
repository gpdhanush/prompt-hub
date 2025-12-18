part of 'projects_bloc.dart';

abstract class ProjectsEvent extends Equatable {
  const ProjectsEvent();

  @override
  List<Object?> get props => [];
}

class GetProjectsEvent extends ProjectsEvent {
  final int? page;
  final int? limit;
  final int? myProjects;

  const GetProjectsEvent({
    this.page,
    this.limit,
    this.myProjects,
  });

  @override
  List<Object?> get props => [page, limit, myProjects];
}

class RefreshProjectsEvent extends ProjectsEvent {
  final int? myProjects;

  const RefreshProjectsEvent({this.myProjects});

  @override
  List<Object?> get props => [myProjects];
}

