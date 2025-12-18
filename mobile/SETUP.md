# Mobile App Setup Guide

## Quick Start

1. **Install Flutter**
   ```bash
   # Check Flutter installation
   flutter doctor
   ```

2. **Get Dependencies**
   ```bash
   cd mobile
   flutter pub get
   ```

3. **Firebase Setup**
   - Create Firebase project
   - Add Android/iOS apps
   - Download config files:
     - `google-services.json` → `android/app/`
     - `GoogleService-Info.plist` → `ios/Runner/`

4. **Configure API URL**
   - Update `lib/core/config/app_config.dart`
   - Or use: `flutter run --dart-define=API_BASE_URL=https://your-api.com/api`

5. **Run**
   ```bash
   flutter run
   ```

## Firebase Configuration

### Android

1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/google-services.json`
3. Ensure `android/build.gradle` has:
   ```gradle
   classpath 'com.google.gms:google-services:4.4.0'
   ```
4. Ensure `android/app/build.gradle` has:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

### iOS

1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in `ios/Runner/GoogleService-Info.plist`
3. Open `ios/Runner.xcworkspace` in Xcode
4. Ensure the file is added to the Runner target

## Environment Configuration

### Development

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

### Production

```bash
flutter run --dart-define=API_BASE_URL=https://api.yourdomain.com/api
```

## Testing FCM

1. Get FCM token from app logs
2. Use Firebase Console to send test notification
3. Or use backend API: `POST /api/fcm/test`

## Troubleshooting

### "Firebase not initialized"
- Check config files are in correct locations
- Verify Firebase project setup
- Run `flutter clean && flutter pub get`

### "API connection failed"
- Verify API_BASE_URL is correct
- Check backend is running
- Verify CORS settings on backend

### "Build failed"
- Run `flutter clean`
- Delete `pubspec.lock` and run `flutter pub get`
- Check Flutter version: `flutter --version`

