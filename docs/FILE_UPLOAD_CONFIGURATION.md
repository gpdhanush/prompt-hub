# File Upload Configuration Guide

## Overview

This application handles file uploads (images, documents, etc.) with support for separate hosting/CDN. Files are uploaded via the API endpoint, but displayed using a configurable static file URL.

---

## How It Works

### Upload Flow

1. **File Upload**: Files are uploaded to `API_BASE_URL/employees/upload-profile-photo` (or other upload endpoints)
   - Uses `API_BASE_URL` which includes `/api` suffix
   - Example: `https://api.example.com/api/employees/upload-profile-photo`

2. **File Path Storage**: Backend returns a relative path like `/uploads/profile-photos/filename.jpg`
   - This path is stored in the database (no `/api` in the path)
   - Example: `/uploads/profile-photos/profile-1234567890.jpg`

3. **Display URL Construction**: Frontend constructs full URLs using `getImageUrl()` utility
   - Uses `VITE_STATIC_URL` if set, otherwise uses `API_BASE_URL` without `/api`
   - Final URL: `STATIC_BASE_URL + /uploads/PATH_URL`
   - Example: `https://api.example.com/uploads/profile-photos/profile-1234567890.jpg`

---

## Configuration

### Environment Variables

#### `VITE_API_URL` (Required)
Base URL for API endpoints (includes `/api` suffix). This is also used to construct image URLs by removing `/api`.

```env
# Development
VITE_API_URL=http://localhost:3001/api

# Production
VITE_API_URL=https://pms-api.prasowlabs.in/api
```

**Note**: Image URLs will automatically use `VITE_API_URL` without `/api` suffix.
- API URL: `https://pms-api.prasowlabs.in/api`
- Image URL: `https://pms-api.prasowlabs.in/uploads/profile-photos/file.jpg`

---

## Examples

### Example: Production Setup

**Configuration:**
```env
VITE_API_URL=https://pms-api.prasowlabs.in/api
```

**Result:**
- Upload endpoint: `https://pms-api.prasowlabs.in/api/employees/upload-profile-photo`
- File path stored: `/uploads/profile-photos/file.jpg`
- Display URL: `https://pms-api.prasowlabs.in/uploads/profile-photos/file.jpg`

**How it works:**
- `VITE_API_URL` includes `/api` suffix for API calls
- Image URLs automatically use `VITE_API_URL` without `/api` suffix
- No additional configuration needed

---

## Implementation Details

### Frontend Code

**Upload Component** (`src/components/ui/profile-photo-upload.tsx`):
```typescript
// Upload to API (with /api)
const response = await fetch(`${API_BASE_URL}/employees/upload-profile-photo`, {
  method: 'POST',
  body: formData,
});

// Backend returns: { filePath: '/uploads/profile-photos/file.jpg' }
onChange(data.filePath); // Store relative path

// Display URL constructed using getImageUrl()
const fullUrl = getImageUrl(data.filePath);
```

**Image URL Utility** (`src/lib/imageUtils.ts`):
```typescript
export function getImageUrl(imagePath: string | null | undefined): string | undefined {
  // Uses STATIC_CONFIG.BASE_URL (VITE_API_URL without /api)
  const baseUrl = getStaticBaseUrl();
  return `${baseUrl}${imagePath}`; // e.g., https://pms-api.prasowlabs.in/uploads/...
}
```

**Configuration** (`src/lib/config.ts`):
```typescript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL, // https://pms-api.prasowlabs.in/api
  SERVER_URL: API_BASE_URL.replace('/api', ''), // https://pms-api.prasowlabs.in
};

export const STATIC_CONFIG = {
  BASE_URL: API_CONFIG.SERVER_URL, // Always uses VITE_API_URL without /api
};
```

### Backend Code

**Upload Endpoint** (`server/routes/employees/employees-profile.js`):
```javascript
// Returns relative path (no /api)
const filePath = `/uploads/profile-photos/${req.file.filename}`;
res.json({ filePath: filePath });
```

---

## File Path Format

All uploaded files follow this pattern:
- **Profile Photos**: `/uploads/profile-photos/filename.jpg`
- **Employee Documents**: `/uploads/employee-documents/filename.pdf`
- **Project Files**: `/uploads/project-files/filename.pdf`
- **Task Attachments**: `/uploads/task-attachments/filename.pdf`
- **Bug Attachments**: `/uploads/bug-attachments/filename.pdf`

**Important**: Paths stored in database NEVER include `/api` prefix.

---

## Migration Guide

If you're migrating from a setup where files were stored with `/api` in the URL:

### Option 1: Database Migration (Recommended)

Update existing file paths in database:
```sql
-- Remove /api/uploads/ and replace with /uploads/
UPDATE employees SET profile_photo_url = REPLACE(profile_photo_url, '/api/uploads/', '/uploads/') WHERE profile_photo_url LIKE '/api/uploads/%';
UPDATE project_files SET file_path = REPLACE(file_path, '/api/uploads/', '/uploads/') WHERE file_path LIKE '/api/uploads/%';
-- Repeat for other tables with file paths
```

### Option 2: Frontend Fix (Automatic)

The `getImageUrl()` utility already handles this automatically:
- If path contains `/api/uploads/`, it's automatically corrected to `/uploads/`
- No database changes needed, but fixing database is cleaner

---

## Troubleshooting

### Issue: Images not displaying

**Check:**
1. Verify `VITE_API_URL` is set correctly (e.g., `https://pms-api.prasowlabs.in/api`)
2. Check browser console for 404 errors
3. Verify file path in database doesn't include `/api`
4. Check that static files are served from `/uploads/` directory
5. Ensure `VITE_API_URL` without `/api` is accessible (e.g., `https://pms-api.prasowlabs.in`)

### Issue: Upload works but wrong display URL

**Solution:**
- Verify `VITE_API_URL` is correct (should include `/api` suffix)
- Image URLs will automatically use `VITE_API_URL` without `/api`
- Rebuild the application: `npm run build`
- Clear browser cache

### Issue: Files uploaded but not accessible

**Check:**
1. Verify uploads directory exists: `server/uploads/`
2. Check file permissions on uploads directory
3. Verify web server serves static files from `/uploads/` path
4. Check CORS settings if using separate CDN

---

## Best Practices

1. **Always use `getImageUrl()` utility** for displaying images
   - Don't manually construct URLs
   - Handles edge cases automatically

2. **Store relative paths in database**
   - Store: `/uploads/profile-photos/file.jpg`
   - Don't store: `https://pms-api.prasowlabs.in/api/uploads/...`

3. **Set `VITE_API_URL` correctly**
   - Must include `/api` suffix: `https://pms-api.prasowlabs.in/api`
   - Image URLs will automatically use the same domain without `/api`

4. **Test after configuration changes**
   - Upload a test file
   - Verify display URL is correct (should be `VITE_API_URL` without `/api`)
   - Check browser network tab for actual URL used

---

## Related Files

- `src/lib/config.ts` - Configuration (API_BASE_URL, STATIC_CONFIG)
- `src/lib/imageUtils.ts` - Image URL utilities (`getImageUrl()`, `getProfilePhotoUrl()`)
- `src/components/ui/profile-photo-upload.tsx` - Profile photo upload component
- `src/components/ui/image-upload-crop.tsx` - Image upload with crop
- `server/routes/employees/employees-profile.js` - Upload endpoint
- `server/index.js` - Static file serving configuration

