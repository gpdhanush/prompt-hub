# Theme and UUID Fixes

## Summary
Fixed two issues:
1. Project URLs now use UUIDs instead of numeric IDs
2. Theme preferences are stored per-user in the database to avoid conflicts when multiple users use the same browser

## Changes Made

### 1. Project UUID Support

#### Database
- Projects already have UUID column from previous migration
- Users table now has UUID column (from `add_uuid_columns_migration.sql`)

#### Backend
- `server/routes/auth.js`: Updated `/me` endpoint to ensure users have UUIDs (generates if missing)
- Projects API already returns UUIDs via `p.*` in SELECT queries

#### Frontend
- `src/features/projects/utils/utils.ts`: Added `uuid?: string` to Project type
- `src/features/projects/pages/Projects.tsx`: Updated to use `project.uuid || project.id` for navigation
- All project navigation now prefers UUIDs

### 2. Per-User Theme Storage

#### Database Migration
Created `database/add_user_theme_columns.sql`:
- Adds `theme_color` VARCHAR(50) column to users table (default: "242 57% 58%")
- Adds `theme_mode` ENUM('light', 'dark', 'system') column to users table (default: "light")
- Updates existing users with default values

#### Backend
- `server/routes/auth.js`:
  - `/me` endpoint now returns `theme_color` and `theme_mode` from database
  - `/me/profile` PUT endpoint now accepts `theme_color` and `theme_mode` parameters
  - Validates `theme_mode` values ('light', 'dark', 'system')

#### Frontend
- `src/App.tsx`: 
  - Updated to load theme from database after authentication
  - Falls back to localStorage if user is not authenticated
  - Applies theme color and mode from user profile
  
- `src/features/settings/pages/Settings.tsx`:
  - `handleColorChange` now saves to database via `authApi.updateProfile`
  - Removed localStorage save (now uses DB only)
  
- `src/components/layout/AdminHeader.tsx`:
  - Theme toggle button now saves theme mode to database
  - Uses `authApi.updateProfile` to persist changes

- `src/features/auth/api.ts`:
  - Updated `updateProfile` to accept `theme_color` and `theme_mode` parameters

## Migration Steps

1. **Run database migration:**
   ```bash
   mysql -u your_username -p prasowla_ntpl_admin < database/add_user_theme_columns.sql
   ```

2. **Verify migration:**
   ```sql
   SELECT id, name, email, theme_color, theme_mode FROM users LIMIT 5;
   ```

3. **Test:**
   - Login as different users
   - Change theme color/mode for each user
   - Verify preferences persist per user
   - Verify project URLs use UUIDs

## Benefits

1. **Project UUIDs:**
   - Better security (no sequential IDs exposed)
   - Consistent URL format
   - Backward compatible (falls back to numeric ID if UUID missing)

2. **Per-User Theme:**
   - No conflicts when multiple users use same browser
   - Preferences persist across sessions
   - Stored securely in database
   - Each user has their own theme

## Notes

- Old numeric project IDs still work (backward compatible)
- If a project doesn't have a UUID, it will be generated on next access
- Theme preferences default to light mode and indigo color if not set
- localStorage is still used as fallback for non-authenticated users

