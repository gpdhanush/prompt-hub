# Profile Photo Troubleshooting Guide

## Quick Checklist

1. ✅ **Environment Variables Set**: `.env` file has `VITE_STATIC_URL=http://localhost:3001`
2. ✅ **Dev Server Restarted**: After adding/changing `.env`, restart your dev server
3. ✅ **Backend Server Running**: Make sure backend is running on port 3001
4. ✅ **Static File Serving**: Backend serves files from `/uploads` directory
5. ✅ **Image Path in Database**: Check if `profile_photo_url` column has values

## How to Debug

### 1. Check Browser Console

Open browser DevTools (F12) and check the Console tab. You should see logs like:
```
[imageUtils] Image URL conversion: { imagePath: '/uploads/profile-photos/...', baseUrl: 'http://localhost:3001', fullUrl: 'http://localhost:3001/uploads/profile-photos/...' }
```

### 2. Check Network Tab

1. Open DevTools → Network tab
2. Filter by "Img" or "All"
3. Look for requests to `/uploads/profile-photos/...`
4. Check if they return:
   - ✅ **200 OK** - Image loads successfully
   - ❌ **404 Not Found** - File doesn't exist or path is wrong
   - ❌ **CORS error** - Backend CORS configuration issue

### 3. Verify Image Path in Database

Run this SQL query to check if employees have profile photos:
```sql
SELECT id, name, profile_photo_url FROM employees WHERE profile_photo_url IS NOT NULL AND profile_photo_url != '';
```

### 4. Test Static File Serving Directly

Try accessing an image directly in your browser:
```
http://localhost:3001/uploads/profile-photos/[filename]
```

If this works, the static file serving is correct.

### 5. Check Backend Logs

When you upload a profile photo, check backend console for:
```
=== PROFILE PHOTO UPLOAD ===
File received: Yes
File uploaded successfully: /uploads/profile-photos/profile-1234567890.jpg
```

## Common Issues & Solutions

### Issue 1: Images Not Showing, Console Shows 404

**Cause**: File doesn't exist or path is wrong

**Solution**:
1. Check if `uploads/profile-photos/` directory exists
2. Verify the file was actually uploaded
3. Check the path stored in database matches the actual file location

### Issue 2: CORS Error in Console

**Cause**: Backend CORS not configured for image requests

**Solution**: Check `server/index.js` has:
```javascript
app.use(cors());
```

### Issue 3: Environment Variable Not Working

**Cause**: Dev server not restarted after `.env` changes

**Solution**:
1. Stop the dev server (Ctrl+C)
2. Restart with `npm run dev`
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Issue 4: Image Shows Broken Icon

**Cause**: URL construction is wrong

**Solution**: Check browser console for the `[imageUtils]` log to see what URL is being generated. It should be:
```
http://localhost:3001/uploads/profile-photos/filename.jpg
```

### Issue 5: Avatar Shows Fallback (Initials) Instead of Photo

**Cause**: Image URL is `undefined` or image failed to load

**Solution**:
1. Check if `profile_photo_url` in database is not null/empty
2. Check browser console for errors
3. Verify the image URL is correct in Network tab

## Testing the Setup

1. **Upload a new profile photo**:
   - Go to Employee Create or Edit page
   - Click "Upload Photo"
   - Select and crop an image
   - Click "Save & Upload"
   - Check backend logs for success message

2. **Verify the image displays**:
   - Check Employee Profile page
   - Check Employees list page
   - Image should appear in Avatar component

3. **Check the URL**:
   - Right-click on image → "Inspect"
   - Check the `src` attribute
   - Should be: `http://localhost:3001/uploads/profile-photos/...`

## Files Involved

- `src/lib/imageUtils.ts` - Image URL utility functions
- `src/pages/EmployeeProfile.tsx` - Profile page displaying photo
- `src/pages/Employees.tsx` - Employee list with photos
- `src/components/ui/image-upload-crop.tsx` - Upload component
- `server/routes/employees.js` - Upload endpoint
- `server/index.js` - Static file serving configuration

## Production Deployment

When deploying to production:

1. Set `VITE_STATIC_URL` in your production `.env`:
   ```env
   VITE_STATIC_URL=https://your-cdn-domain.com
   ```

2. Or if using same domain:
   ```env
   VITE_STATIC_URL=https://api.yourdomain.com
   ```

3. Make sure your CDN/static server serves files from the `/uploads` directory

4. Update CORS settings if using a different domain
