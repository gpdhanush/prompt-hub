# Firebase Cloud Messaging (FCM) Setup Guide

This guide will help you set up Firebase Cloud Messaging for push notifications in your application.

## Prerequisites

1. A Firebase project (create one at https://console.firebase.google.com/)
2. Node.js and npm installed
3. Access to your Firebase project console

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

## Step 2: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app and copy the configuration values

## Step 3: Get Service Account Key (Backend)

1. In Firebase Console, go to **Project Settings**
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file (keep it secure!)

## Step 4: Get VAPID Key (Frontend)

1. In Firebase Console, go to **Project Settings**
2. Go to **Cloud Messaging** tab
3. Scroll to **Web configuration** section
4. Copy the **Web Push certificates** key pair (or generate one)

## Step 5: Install Dependencies

### Backend (Server)

```bash
cd server
npm install firebase-admin
```

### Frontend

```bash
npm install firebase
```

## Step 6: Configure Environment Variables

### Backend (.env file in server directory)

```env
# Firebase Service Account (paste the entire JSON as a string, or provide file path)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
# OR
FIREBASE_SERVICE_ACCOUNT=/path/to/service-account-key.json
```

### Frontend (.env file in root)

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

## Step 7: Run Database Migration

```bash
# Run the SQL migration to create fcm_tokens table
mysql -u your_user -p your_database < database/add_fcm_tokens.sql
```

Or manually execute the SQL in `database/add_fcm_tokens.sql`

## Step 8: Update Service Worker

1. Open `public/firebase-messaging-sw.js`
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 9: Use FCM in Your Application

### In a React Component

```typescript
import { useFCM } from '@/hooks/useFCM';

function MyComponent() {
  const { token, isRegistered, permission, requestPermission } = useFCM();

  // The hook automatically:
  // - Initializes Firebase
  // - Requests notification permission
  // - Registers FCM token with backend
  // - Listens for foreground messages

  return (
    <div>
      {permission === 'granted' && isRegistered && (
        <p>✅ Push notifications enabled</p>
      )}
      {permission !== 'granted' && (
        <button onClick={requestPermission}>
          Enable Notifications
        </button>
      )}
    </div>
  );
}
```

### Send Push Notification from Backend

```javascript
import { sendNotificationToUser } from './utils/fcmService.js';

// Send notification to a user
await sendNotificationToUser(userId, {
  title: 'New Task Assigned',
  body: 'You have been assigned a new task',
  type: 'task',
  link: '/tasks/123',
}, {
  taskId: '123',
  priority: 'high',
});
```

## Step 10: Test Push Notifications

1. Start your development server
2. Log in to your application
3. The FCM token should be automatically registered
4. Use the test endpoint:

```bash
curl -X POST http://localhost:3001/api/fcm/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"This is a test"}'
```

## API Endpoints

### Register FCM Token
```
POST /api/fcm/register
Body: { token: string, deviceType?: string, browser?: string }
```

### Unregister FCM Token
```
POST /api/fcm/unregister
Body: { token: string }
```

### Get User's FCM Tokens
```
GET /api/fcm/tokens
```

### Send Test Notification
```
POST /api/fcm/test
Body: { title?: string, body?: string }
```

## Troubleshooting

### Notifications not working?

1. **Check browser console** for errors
2. **Verify service worker** is registered (check Application tab in DevTools)
3. **Check notification permission** in browser settings
4. **Verify Firebase config** matches your project
5. **Check backend logs** for Firebase initialization errors

### Service Worker not loading?

1. Make sure `firebase-messaging-sw.js` is in the `public` directory
2. Check that the file is accessible at `/firebase-messaging-sw.js`
3. Clear browser cache and reload

### Token registration fails?

1. Check that Firebase is properly initialized
2. Verify VAPID key is correct
3. Check backend logs for errors
4. Ensure database migration was run

## Security Notes

- **Never commit** service account keys or Firebase config to version control
- Use environment variables for all sensitive data
- Keep your VAPID key secure
- Regularly rotate service account keys

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
