# Mobile App Architecture

## Overview

This Flutter mobile application follows **Clean Architecture** principles with a **feature-first** folder structure, ensuring maintainability, testability, and scalability.

## Architecture Layers

### 1. Presentation Layer
**Location:** `lib/features/{feature}/presentation/`

- **BLoC/Cubit**: State management
- **Pages**: Screen widgets
- **Widgets**: Reusable UI components
- **BLoC Events & States**: State definitions

**Responsibilities:**
- User interface rendering
- User interaction handling
- State management
- Navigation

### 2. Domain Layer
**Location:** `lib/features/{feature}/domain/`

- **Entities**: Business objects (pure Dart classes)
- **Repositories**: Abstract interfaces
- **Use Cases**: Business logic operations

**Responsibilities:**
- Business logic
- Domain rules
- Entity definitions
- Use case orchestration

### 3. Data Layer
**Location:** `lib/features/{feature}/data/`

- **Data Sources**: Remote (API) and Local (Cache)
- **Repository Implementations**: Concrete implementations
- **Models/DTOs**: Data transfer objects

**Responsibilities:**
- API communication
- Data caching
- Data transformation
- Error handling

## Core Infrastructure

### Network (`lib/core/network/`)
- **DioClient**: HTTP client with interceptors
- JWT token injection
- Automatic token refresh
- 401 error handling

### Storage (`lib/core/storage/`)
- **SecureStorageService**: Token storage (flutter_secure_storage)
- **HiveService**: Offline caching (Hive)

### Dependency Injection (`lib/core/di/`)
- **GetIt**: Service locator
- Centralized dependency registration
- Lazy initialization

### Routing (`lib/core/routing/`)
- **GoRouter**: Declarative routing
- Route guards
- Deep linking support

### Theme (`lib/core/theme/`)
- **Material 3** design system
- Light/Dark theme support
- Consistent styling

## State Management Pattern

### BLoC Pattern

```dart
// Event
class GetProjectsEvent extends ProjectsEvent {
  final int? page;
  const GetProjectsEvent({this.page});
}

// State
class ProjectsLoaded extends ProjectsState {
  final List<Project> projects;
  const ProjectsLoaded({required this.projects});
}

// BLoC
class ProjectsBloc extends Bloc<ProjectsEvent, ProjectsState> {
  final GetProjectsUseCase getProjectsUseCase;
  
  ProjectsBloc({required this.getProjectsUseCase}) 
    : super(ProjectsInitial()) {
    on<GetProjectsEvent>(_onGetProjects);
  }
}
```

### Usage in UI

```dart
BlocProvider(
  create: (_) => di.sl<ProjectsBloc>(),
  child: BlocBuilder<ProjectsBloc, ProjectsState>(
    builder: (context, state) {
      if (state is ProjectsLoaded) {
        return ProjectsList(projects: state.projects);
      }
      return LoadingIndicator();
    },
  ),
)
```

## Data Flow

```
UI (Widget)
  ↓
BLoC Event
  ↓
Use Case
  ↓
Repository (Interface)
  ↓
Repository Implementation
  ↓
Data Source (Remote/Local)
  ↓
API Response / Cache
  ↓
Entity
  ↓
BLoC State
  ↓
UI Update
```

## Feature Structure Example

```
features/
└── projects/
    ├── data/
    │   ├── datasources/
    │   │   └── projects_remote_datasource.dart
    │   └── repositories/
    │       └── projects_repository_impl.dart
    ├── domain/
    │   ├── entities/
    │   │   └── project.dart
    │   ├── repositories/
    │   │   └── projects_repository.dart
    │   └── usecases/
    │       └── get_projects_usecase.dart
    └── presentation/
        ├── bloc/
        │   ├── projects_bloc.dart
        │   ├── projects_event.dart
        │   └── projects_state.dart
        ├── pages/
        │   └── projects_list_page.dart
        └── widgets/
            └── project_card.dart
```

## Key Principles

### 1. Dependency Rule
- Inner layers don't know about outer layers
- Dependencies point inward
- Domain layer has no dependencies

### 2. Single Responsibility
- Each class has one reason to change
- Use cases handle single operations
- BLoCs manage single feature state

### 3. Interface Segregation
- Repositories are interfaces
- Implementations in data layer
- Easy to mock for testing

### 4. Dependency Inversion
- Depend on abstractions (interfaces)
- Not on concrete implementations
- Dependency injection via GetIt

## Best Practices

1. **Feature Isolation**: Each feature is self-contained
2. **Reusable Core**: Core infrastructure is shared
3. **Type Safety**: Use strong typing throughout
4. **Error Handling**: Centralized error handling
5. **Testing**: Test use cases and BLoCs
6. **Documentation**: Document complex logic

## Testing Strategy

- **Unit Tests**: Use cases, BLoCs
- **Widget Tests**: UI components
- **Integration Tests**: Feature flows
- **Mock Data Sources**: For testing

## Performance Optimizations

- **Lazy Loading**: Pagination for lists
- **Caching**: Hive for offline data
- **Image Caching**: cached_network_image
- **Skeleton Loaders**: Better UX than spinners
- **Equatable**: Efficient state comparisons

