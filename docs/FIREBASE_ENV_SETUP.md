# Firebase Environment Variables Setup

## Missing Configuration Values

Your application is missing the following Firebase environment variables in your `.env` file:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`

## Quick Setup

Based on your service worker configuration, add these values to your root `.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyCDm1IDGwLnrooQohZdjiOiG1NQjsZcyFI
VITE_FIREBASE_AUTH_DOMAIN=naethra-project-mgmt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=naethra-project-mgmt
VITE_FIREBASE_STORAGE_BUCKET=naethra-project-mgmt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=442949069348
VITE_FIREBASE_APP_ID=1:442949069348:web:b98ea542b1a43ec68206b1
VITE_FIREBASE_MEASUREMENT_ID=G-YG7YF556GD
VITE_FIREBASE_VAPID_KEY=<your-vapid-key-here>
```

## Where to Find These Values

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `naethra-project-mgmt`
3. **Go to Project Settings** (gear icon) → **General** tab
4. **Scroll to "Your apps"** section
5. **Click on your Web app** (or create one if it doesn't exist)

### Values from Firebase Console:

- **API Key** (`VITE_FIREBASE_API_KEY`): Found in the config object
- **Auth Domain** (`VITE_FIREBASE_AUTH_DOMAIN`): Usually `{project-id}.firebaseapp.com`
- **Project ID** (`VITE_FIREBASE_PROJECT_ID`): Found at the top of Project Settings
- **Storage Bucket** (`VITE_FIREBASE_STORAGE_BUCKET`): Usually `{project-id}.firebasestorage.app`
- **Messaging Sender ID** (`VITE_FIREBASE_MESSAGING_SENDER_ID`): Found in Project Settings → Cloud Messaging
- **App ID** (`VITE_FIREBASE_APP_ID`): Found in the config object
- **Measurement ID** (`VITE_FIREBASE_MEASUREMENT_ID`): Found in the config object (starts with `G-`)

### VAPID Key Setup:

1. Go to **Project Settings** → **Cloud Messaging** tab
2. Scroll to **Web Push certificates** section
3. Click **Generate key pair** (if not already generated)
4. Copy the key and set it as `VITE_FIREBASE_VAPID_KEY`

## Important Notes

1. **Restart your dev server** after adding these values
2. The `.env` file should be in the **root directory** (same level as `package.json`)
3. Never commit `.env` files to version control (already in `.gitignore`)
4. For production, set these values in your hosting platform's environment variables

## Verification

After setting up, you should see in the browser console:
- ✅ `Firebase Analytics initialized`
- ✅ `User logged in, initializing FCM...`
- ✅ `FCM token obtained`
- ✅ `FCM token registered successfully with backend`

If you still see errors, check:
1. All values are set correctly (no typos)
2. Dev server was restarted
3. Browser console for any additional errors
