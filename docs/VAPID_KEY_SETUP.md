# How to Get and Set VAPID Key for FCM

## Quick Steps to Get VAPID Key

### 1. Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **naethra-project-mgmt**

### 2. Navigate to Cloud Messaging Settings
1. Click the **gear icon** (⚙️) next to "Project Overview" at the top left
2. Select **Project Settings**
3. Click on the **Cloud Messaging** tab

### 3. Get Web Push Certificates (VAPID Key)
1. Scroll down to the **Web configuration** section
2. Look for **Web Push certificates**
3. You'll see one of two scenarios:

   **Option A: If you see a key pair already generated:**
   - Copy the **Key pair** value (it's a long string starting with something like `BK...` or `BM...`)
   - This is your VAPID key

   **Option B: If you see "Generate key pair" button:**
   - Click **Generate key pair**
   - A key pair will be generated
   - Copy the **Key pair** value

### 4. Add to .env File

Open your `.env` file in the root directory and add:

```env
VITE_FIREBASE_VAPID_KEY=your-vapid-key-here
```

Replace `your-vapid-key-here` with the actual key you copied from Firebase Console.

**Example:**
```env
VITE_FIREBASE_VAPID_KEY=BK7x8y9zA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

### 5. Restart Your Dev Server

After adding the VAPID key:
1. Stop your development server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

### 6. Verify It's Working

1. Open your app in the browser
2. Open browser DevTools (F12)
3. Check the Console tab
4. You should see:
   - ✅ `FCM token obtained successfully`
   - ✅ `FCM token registered successfully with backend`

## Visual Guide

```
Firebase Console
  └─ Project: naethra-project-mgmt
      └─ ⚙️ Project Settings
          └─ Cloud Messaging tab
              └─ Web configuration
                  └─ Web Push certificates
                      └─ Key pair: [COPY THIS]
```

## Troubleshooting

### If you don't see "Cloud Messaging" tab:
- Make sure you're in the correct Firebase project
- Try refreshing the page
- Check if Cloud Messaging API is enabled in Google Cloud Console

### If the key doesn't work:
- Make sure there are no extra spaces when copying
- Make sure the key starts with `B` (it's a Base64 encoded string)
- Verify the key is in the `.env` file (not `.env.example`)
- Restart your dev server after adding the key

### Still having issues?
Check the browser console for specific error messages and refer to `TROUBLESHOOTING_FCM.md`
