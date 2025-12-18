# Project Management Mobile App

Enterprise-grade Flutter mobile application for project management, built with Clean Architecture, BLoC pattern, and Material 3 design.

## Features

- ✅ **Authentication** - JWT-based auth with refresh tokens
- ✅ **Projects** - List, detail, and management
- ✅ **Tasks** - Task management with filtering
- ✅ **Kanban Board** - Visual task board (placeholder)
- ✅ **FCM Notifications** - Push notifications with deep linking
- ✅ **Offline Support** - Hive-based caching
- ✅ **Modern UI** - Material 3 design system
- ✅ **State Management** - BLoC pattern with Equatable
- ✅ **Clean Architecture** - Feature-first structure

## Architecture

```
lib/
├── core/                    # Core infrastructure
│   ├── config/             # App configuration
│   ├── di/                 # Dependency injection
│   ├── network/            # Dio client with interceptors
│   ├── routing/            # GoRouter configuration
│   ├── storage/            # Secure storage & Hive
│   └── theme/              # Material 3 theme
│
└── features/               # Feature modules
    ├── auth/               # Authentication
    │   ├── data/          # Data layer
    │   ├── domain/        # Domain layer
    │   └── presentation/  # UI layer
    ├── projects/          # Projects feature
    ├── tasks/             # Tasks feature
    ├── kanban/            # Kanban board
    ├── notifications/     # FCM notifications
    └── profile/           # User profile
```

## Setup Instructions

### 1. Prerequisites

- Flutter SDK 3.0.0 or higher
- Dart 3.0.0 or higher
- Android Studio / Xcode for mobile development
- Firebase project for FCM

### 2. Install Dependencies

```bash
cd mobile
flutter pub get
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Add Android/iOS apps to your Firebase project
3. Download configuration files:
   - Android: `google-services.json` → `android/app/`
   - iOS: `GoogleService-Info.plist` → `ios/Runner/`

4. Enable Firebase Cloud Messaging in Firebase Console

### 4. Configure API Base URL

Update the API base URL in `lib/core/config/app_config.dart` or use environment variables:

```bash
flutter run --dart-define=API_BASE_URL=https://your-api-url.com/api
```

### 5. Run the App

```bash
# Android
flutter run

# iOS
flutter run -d ios

# Specific device
flutter devices
flutter run -d <device-id>
```

## Environment Variables

Create a `.env` file or use `--dart-define` flags:

- `API_BASE_URL` - Backend API base URL (default: `http://localhost:3001/api`)
- `FCM_VAPID_KEY` - Firebase VAPID key (optional)

## Project Structure

### Clean Architecture Layers

1. **Presentation Layer** (`presentation/`)
   - BLoC/Cubit for state management
   - UI widgets and pages
   - User interactions

2. **Domain Layer** (`domain/`)
   - Entities (data models)
   - Repositories (interfaces)
   - Use cases (business logic)

3. **Data Layer** (`data/`)
   - Remote data sources (API calls)
   - Repository implementations
   - Data models (DTOs)

### State Management

- **BLoC** for feature-level state
- **Cubit** for simple UI state
- **Equatable** for efficient state comparisons

### Networking

- **Dio** for HTTP requests
- Automatic JWT token injection
- 401 handling with token refresh
- Centralized error handling

### Storage

- **flutter_secure_storage** for sensitive data (tokens)
- **Hive** for offline caching
- Automatic cache expiration

## Key Features Implementation

### Authentication

- Login with email/password
- JWT token management
- Automatic token refresh
- Secure token storage
- Route guards

### FCM Notifications

- Token registration on login
- Foreground/background/terminated handling
- Deep linking to:
  - Projects (`/projects/:id`)
  - Tasks (`/tasks/:id`)
  - Kanban (`/kanban/:projectId`)

### Offline Support

- Hive-based caching
- Automatic cache expiration
- Pull-to-refresh for data sync

## Building for Production

### Android

```bash
flutter build apk --release
# or
flutter build appbundle --release
```

### iOS

```bash
flutter build ios --release
```

## Testing

```bash
flutter test
```

## Code Generation

If using code generation (retrofit, json_serializable):

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

## Troubleshooting

### FCM Not Working

1. Verify Firebase configuration files are in place
2. Check FCM token registration in backend
3. Ensure notification permissions are granted
4. Check device logs: `flutter logs`

### API Connection Issues

1. Verify `API_BASE_URL` is correct
2. Check network connectivity
3. Verify backend CORS settings
4. Check Dio interceptor logs

### Build Issues

1. Clean build: `flutter clean && flutter pub get`
2. Update dependencies: `flutter pub upgrade`
3. Check Flutter version: `flutter doctor`

## Contributing

1. Follow Clean Architecture principles
2. Use BLoC for state management
3. Write tests for use cases
4. Follow Material 3 design guidelines
5. Maintain feature-first folder structure

## License

[Your License Here]

