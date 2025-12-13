# FCM Push Notifications - Quick Start

## ✅ What's Been Set Up

1. **Database Table**: `fcm_tokens` table for storing user FCM tokens
2. **Backend Service**: Firebase Admin SDK integration (`server/utils/fcmService.js`)
3. **API Routes**: FCM registration/unregistration endpoints (`server/routes/fcm.js`)
4. **Frontend Firebase Config**: Firebase initialization (`src/lib/firebase.ts`)
5. **React Hook**: `useFCM` hook for easy integration (`src/hooks/useFCM.ts`)
6. **Service Worker**: Background notification handler (`public/firebase-messaging-sw.js`)
7. **API Client**: Frontend FCM API methods (`src/lib/api.ts`)

## 🚀 Next Steps

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install firebase-admin
```

**Frontend:**
```bash
npm install firebase
```

### 2. Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Add a Web app to your project
4. Get your Firebase config values

### 3. Get Service Account Key ✅ DONE

1. ✅ You already have the file: `naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json`
2. **Place it in:** `server/config/` directory
3. **Update `server/.env`** with:
   ```env
   FIREBASE_SERVICE_ACCOUNT=./config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json
   ```

### 4. Get VAPID Key

1. Firebase Console → Project Settings → Cloud Messaging
2. Under "Web configuration", generate or copy Web Push certificates

### 5. Configure Environment Variables

**Backend (`server/.env`):**
```env
# File path (recommended - use relative path from server directory)
FIREBASE_SERVICE_ACCOUNT=./config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json

# OR absolute path
# FIREBASE_SERVICE_ACCOUNT=/full/path/to/server/config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json
```

> **Important:** 
> 1. Place the file `naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json` in `server/config/` directory
> 2. Update the path in `.env` file accordingly

**Frontend (`.env`):**
```env
VITE_FIREBASE_API_KEY=AIzaSyCDm1IDGwLnrooQohZdjiOiG1NQjsZcyFI
VITE_FIREBASE_AUTH_DOMAIN=naethra-project-mgmt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=naethra-project-mgmt
VITE_FIREBASE_STORAGE_BUCKET=naethra-project-mgmt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=442949069348
VITE_FIREBASE_APP_ID=1:442949069348:web:b98ea542b1a43ec68206b1
VITE_FIREBASE_MEASUREMENT_ID=G-YG7YF556GD
VITE_FIREBASE_VAPID_KEY=your-vapid-key-here
```

> **Note:** The Firebase config values are already set in the code files, but you can override them with environment variables. You still need to get the VAPID key from Firebase Console.

### 6. Update Service Worker

Edit `public/firebase-messaging-sw.js` and replace placeholder values with your Firebase config.

### 7. Run Database Migration

```bash
mysql -u your_user -p your_database < database/add_fcm_tokens.sql
```

### 8. Use in Your App

Add the `useFCM` hook to your main app component or layout:

```typescript
import { useFCM } from '@/hooks/useFCM';

function App() {
  useFCM(); // Automatically initializes and registers FCM
  
  // ... rest of your app
}
```

## 📝 Usage Examples

### Send Push Notification from Backend

```javascript
import { sendNotificationToUser } from './utils/fcmService.js';

await sendNotificationToUser(userId, {
  title: 'New Task',
  body: 'You have a new task assigned',
  type: 'task',
  link: '/tasks/123',
});
```

### Create Notification with Push

```javascript
// POST /api/notifications
{
  "user_id": 1,
  "type": "task",
  "title": "New Task",
  "message": "You have a new task",
  "payload": { "taskId": 123 },
  "send_push": true
}
```

## 🔍 Testing

1. Start your servers
2. Log in to the app
3. Check browser console for FCM token registration
4. Test with: `POST /api/fcm/test`

## 📚 Full Documentation

See `docs/FCM_SETUP.md` for complete setup instructions and troubleshooting.
