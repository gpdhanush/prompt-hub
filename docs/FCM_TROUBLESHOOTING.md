# FCM Push Notification Troubleshooting Guide

## Common Issues and Solutions

### 1. Notifications Not Received

#### Check Firebase Initialization
1. **Backend**: Check server logs for Firebase Admin SDK initialization
   - Look for: `✅ Firebase Admin SDK initialized successfully`
   - If you see: `⚠️ FIREBASE_SERVICE_ACCOUNT not found` → Set `FIREBASE_SERVICE_ACCOUNT` in `server/.env`

2. **Frontend**: Check browser console for Firebase initialization
   - Look for: `✅ Firebase Analytics initialized`
   - Check for any Firebase-related errors

#### Verify FCM Token Registration
1. **Check if token is registered**:
   - Open browser DevTools → Application → Service Workers
   - Check if `firebase-messaging-sw.js` is registered
   - Check browser console for FCM token registration messages

2. **Verify token in database**:
   ```sql
   SELECT * FROM fcm_tokens WHERE user_id = ? AND is_active = TRUE;
   ```

3. **Test token registration**:
   - Use the test endpoint: `POST /api/fcm/test`
   - Check server logs for any errors

#### Check Notification Permissions
1. **Browser Permission**:
   - Check: `Notification.permission` in browser console
   - Should be `'granted'`
   - If `'denied'`, user must enable in browser settings

2. **Service Worker**:
   - Check: DevTools → Application → Service Workers
   - Ensure `firebase-messaging-sw.js` is active
   - Check for any service worker errors

#### Verify VAPID Key
1. **Check `.env` file**:
   - Ensure `VITE_FIREBASE_VAPID_KEY` is set
   - Key should be from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

2. **Verify key format**:
   - Should be a long base64 string (typically starts with 'B')
   - Should be ~87 characters long

#### Check Notification Payload
1. **Web Push Configuration**:
   - Ensure `webpush` section is included in notification payload
   - Check `fcmOptions.link` is set correctly

2. **Notification Format**:
   ```javascript
   {
     notification: {
       title: "Title",
       body: "Body text"
     },
     webpush: {
       notification: {
         title: "Title",
         body: "Body text",
         icon: "/favicon.ico"
       },
       fcmOptions: {
         link: "/path/to/page"
       }
     }
   }
   ```

### 2. Service Worker Issues

#### Service Worker Not Registered
1. **Check file location**:
   - File must be at: `public/firebase-messaging-sw.js`
   - Must be accessible at: `https://yourdomain.com/firebase-messaging-sw.js`

2. **Check registration**:
   - DevTools → Application → Service Workers
   - Should see `firebase-messaging-sw.js` registered

3. **Force re-registration**:
   - Unregister service worker in DevTools
   - Reload page
   - Check console for registration messages

#### Service Worker Errors
1. **Check console for errors**:
   - Look for Firebase initialization errors
   - Check for CORS errors
   - Verify Firebase config matches frontend config

2. **Verify Firebase Config**:
   - Service worker config must match frontend config
   - All values should be from same Firebase project

### 3. Backend Issues

#### Firebase Admin SDK Not Initialized
1. **Check environment variable**:
   ```bash
   # In server/.env
   FIREBASE_SERVICE_ACCOUNT=./config/your-service-account.json
   # OR
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```

2. **Check service account file**:
   - File must exist at specified path
   - Must be valid JSON
   - Must have correct permissions

3. **Check server logs**:
   - Look for initialization errors
   - Check for file path issues

#### Token Not Found in Database
1. **Check token registration**:
   - Verify `POST /api/fcm/register` is called
   - Check response for success
   - Verify token is saved in database

2. **Check token status**:
   ```sql
   SELECT * FROM fcm_tokens WHERE token = ?;
   ```
   - Ensure `is_active = TRUE`
   - Check `user_id` matches

#### Invalid Token Errors
1. **Token expired or invalid**:
   - FCM tokens can expire
   - Re-register token if errors occur
   - Check for `messaging/invalid-registration-token` errors

2. **Token format**:
   - Ensure token is valid FCM token format
   - Should be a long string (typically 150+ characters)

### 4. Frontend Issues

#### FCM Token Not Obtained
1. **Check VAPID key**:
   - Must be set in `.env` as `VITE_FIREBASE_VAPID_KEY`
   - Must match Firebase project

2. **Check permission**:
   - User must grant notification permission
   - Check `Notification.permission` status

3. **Check browser support**:
   - FCM requires HTTPS (except localhost)
   - Some browsers may not support FCM

#### Token Registration Failed
1. **Check API call**:
   - Verify `POST /api/fcm/register` is called
   - Check network tab for errors
   - Verify authentication token is sent

2. **Check response**:
   - Should return `{ success: true }`
   - Check for error messages

### 5. Testing Notifications

#### Test Endpoint
```bash
# Test notification to current user
POST /api/fcm/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Test Notification",
  "body": "This is a test"
}
```

#### Manual Test
1. **Get user's FCM tokens**:
   ```bash
   GET /api/fcm/tokens
   Authorization: Bearer <token>
   ```

2. **Send notification directly**:
   ```javascript
   // In server code
   await sendNotificationToUser(userId, {
     title: "Test",
     body: "Test notification",
     type: "test"
   });
   ```

### 6. Debugging Steps

1. **Enable verbose logging**:
   - Check server logs for FCM-related messages
   - Check browser console for FCM errors
   - Enable Firebase debug mode

2. **Check Firebase Console**:
   - Go to Firebase Console → Cloud Messaging
   - Check for delivery reports
   - Check for error statistics

3. **Verify Configuration**:
   - Frontend Firebase config matches service worker config
   - Backend service account matches Firebase project
   - VAPID key matches Firebase project

4. **Test in Different Browsers**:
   - Chrome/Edge: Full FCM support
   - Firefox: Limited support
   - Safari: No FCM support (uses APNs)

### 7. Common Error Messages

#### "Firebase not initialized"
- **Solution**: Check `FIREBASE_SERVICE_ACCOUNT` in `server/.env`
- Verify service account file exists and is valid

#### "No active FCM tokens found"
- **Solution**: User needs to register FCM token
- Check if token registration endpoint was called
- Verify token is saved in database

#### "messaging/invalid-registration-token"
- **Solution**: Token is expired or invalid
- Re-register FCM token
- Check if token format is correct

#### "Permission denied"
- **Solution**: User must grant notification permission
- Check browser notification settings
- User may need to enable in browser settings

#### "Service worker not registered"
- **Solution**: Check `firebase-messaging-sw.js` file location
- Verify file is accessible
- Check service worker registration in DevTools

### 8. Environment Checklist

- [ ] `VITE_FIREBASE_VAPID_KEY` set in `.env`
- [ ] `FIREBASE_SERVICE_ACCOUNT` set in `server/.env`
- [ ] Service account file exists and is valid
- [ ] `firebase-messaging-sw.js` in `public/` directory
- [ ] Firebase config matches in frontend and service worker
- [ ] User has granted notification permission
- [ ] Service worker is registered
- [ ] FCM token is registered in database
- [ ] Backend Firebase Admin SDK initialized
- [ ] Frontend Firebase initialized

### 9. Quick Diagnostic Commands

```bash
# Check if Firebase is initialized (server logs)
# Look for: "✅ Firebase Admin SDK initialized successfully"

# Check FCM tokens in database
SELECT * FROM fcm_tokens WHERE is_active = TRUE;

# Test notification endpoint
curl -X POST http://localhost:3001/api/fcm/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Test notification"}'
```

### 10. Browser-Specific Notes

#### Chrome/Edge
- Full FCM support
- Best compatibility
- Recommended for testing

#### Firefox
- Limited FCM support
- May have different behavior
- Test thoroughly

#### Safari
- No FCM support
- Uses Apple Push Notification Service (APNs)
- Requires different implementation

#### Brave Browser
- Blocks Google services by default
- User must enable: Settings → Privacy → Use Google services for push messaging
- Shields must be down for localhost
