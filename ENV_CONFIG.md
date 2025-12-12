# Environment Variables Configuration

## Image/Static File URLs

To configure where static files (like profile photos) are served from, set the following environment variable:

### `VITE_STATIC_URL`

**Purpose:** Base URL for serving static files and uploaded images (profile photos, project files, etc.)

**Default:** If not set, it will use the API URL without `/api` (e.g., `http://localhost:3001`)

**Examples:**

**Local Development:**
```env
VITE_STATIC_URL=http://localhost:3001
```

**Production (same domain as API):**
```env
VITE_STATIC_URL=https://api.yourdomain.com
```

**Production (CDN):**
```env
VITE_STATIC_URL=https://cdn.yourdomain.com
```

**Production (separate static server):**
```env
VITE_STATIC_URL=https://static.yourdomain.com
```

## Setup Instructions

1. Create a `.env` file in the root directory (if it doesn't exist)
2. Add the `VITE_STATIC_URL` variable:

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Static Assets/Uploads Base URL
# For local development, leave empty or set to http://localhost:3001
# For production, set to your CDN or static file server URL
VITE_STATIC_URL=http://localhost:3001
```

3. Restart your development server after adding/changing environment variables

## How It Works

- Profile photos and other uploaded files are stored as paths like `/uploads/profile-photos/filename.jpg`
- The `getImageUrl()` utility function in `src/lib/imageUtils.ts` converts these paths to full URLs
- If `VITE_STATIC_URL` is set, it uses that
- Otherwise, it constructs the URL from `VITE_API_URL` (removing `/api`)

## Files Using Image URLs

- `src/pages/EmployeeProfile.tsx` - Employee profile page
- `src/pages/Employees.tsx` - Employee list page
- `src/components/ui/image-upload-crop.tsx` - Image upload component
- `src/lib/imageUtils.ts` - Centralized image URL utilities
