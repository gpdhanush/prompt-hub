# Debug VAPID Key Issues

## Quick Debug Steps

### 1. Check Browser Console

When the app loads, look for these debug messages in the console:

```
🔍 VAPID Key Debug Info:
   Length: XX characters
   Starts with: BXXXXX...
   Ends with: ...XXXXX
   Contains spaces: NO ✅
   Contains newlines: NO ✅
```

**What to check:**
- **Length**: Should be around **87 characters** (typical VAPID key length)
- **Starts with**: Should start with **"B"** (most VAPID keys start with B)
- **Spaces/Newlines**: Should both be **NO ✅**

### 2. Common Issues

#### Issue: Length is wrong
- **Too short (< 50)**: Key is incomplete or truncated
- **Too long (> 200)**: May have extra characters or formatting

**Fix:** Copy the key again from Firebase Console, make sure you get the entire key

#### Issue: Contains spaces
- **Problem**: Key has spaces which breaks it
- **Fix:** Remove all spaces from the key in `.env` file

#### Issue: Contains newlines
- **Problem**: Key has line breaks
- **Fix:** Make sure the key is on a single line in `.env`

#### Issue: Doesn't start with "B"
- **Problem**: May have copied wrong value or key is invalid
- **Fix:** Verify you copied the "Key pair" value, not something else

### 3. Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **naethra-project-mgmt**
3. ⚙️ **Project Settings** → **Cloud Messaging** tab
4. Scroll to **Web Push certificates**
5. Check the **Key pair** value:
   - Should be a long string (~87 characters)
   - Should start with "B"
   - Should be all on one line

### 4. Check .env File Format

**Correct format:**
```env
VITE_FIREBASE_VAPID_KEY=BK7x8y9zA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

**Common mistakes:**
```env
# ❌ WRONG - Has quotes
VITE_FIREBASE_VAPID_KEY="BK7x8y9z..."

# ❌ WRONG - Has spaces
VITE_FIREBASE_VAPID_KEY = BK7x8y9z...

# ❌ WRONG - Has line break
VITE_FIREBASE_VAPID_KEY=BK7x8y9z...
A1B2C3D4E5...

# ❌ WRONG - Wrong variable name
FIREBASE_VAPID_KEY=BK7x8y9z...  # Missing VITE_ prefix
```

### 5. Test VAPID Key Format

Run this in browser console after page loads:

```javascript
// Check if VAPID key is loaded
const key = import.meta.env.VITE_FIREBASE_VAPID_KEY;
if (key) {
  console.log('✅ VAPID key is loaded');
  console.log('Length:', key.length);
  console.log('Starts with:', key.substring(0, 5));
  console.log('Has spaces:', key.includes(' '));
  console.log('Has newlines:', key.includes('\n') || key.includes('\r'));
} else {
  console.error('❌ VAPID key is NOT loaded');
}
```

### 6. Regenerate VAPID Key (If Needed)

If the key seems wrong:

1. Go to Firebase Console → Project Settings → Cloud Messaging
2. If you see an existing key, you can:
   - **Option A**: Delete and regenerate (if possible)
   - **Option B**: Copy it again very carefully
3. If you see "Generate key pair" button:
   - Click it to generate a new key
   - Copy the new key immediately
4. Update `.env` file with the new key
5. **Restart dev server**
6. Clear browser cache and reload

### 7. Still Not Working?

If after all these steps it still doesn't work:

1. **Double-check Firebase project:**
   - Make sure you're in the correct project: **naethra-project-mgmt**
   - Verify project ID matches in Firebase Console

2. **Check service worker:**
   - Open DevTools → Application → Service Workers
   - Unregister all service workers
   - Reload page

3. **Try incognito/private window:**
   - This eliminates cache issues
   - Test in a fresh browser session

4. **Verify Firebase config:**
   - Make sure all Firebase config values match
   - Project ID: `naethra-project-mgmt`
   - Messaging Sender ID: `442949069348`

## Expected Console Output (Success)

When everything is working, you should see:

```
✅ Service Worker ready for FCM: http://localhost:8080/
🔍 VAPID Key Debug Info:
   Length: 87 characters
   Starts with: BK7x8y9z...
   Ends with: ...x0y1z2
   Contains spaces: NO ✅
   Contains newlines: NO ✅
🔑 Attempting to get FCM token with VAPID key...
✅ FCM token obtained successfully
✅ FCM token registered successfully with backend
```

If you see the "push service error" after this, the VAPID key itself is likely invalid or doesn't match the Firebase project.
