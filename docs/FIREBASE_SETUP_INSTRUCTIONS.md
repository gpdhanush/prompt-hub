# Firebase Service Account Setup Instructions

## Step 1: Place the Service Account File

**Move your Firebase service account JSON file to:**
```
server/config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json
```

### Quick Command (if file is on Desktop):
```bash
# From your project root
mv ~/Desktop/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json server/config/
```

Or manually:
1. Create `server/config/` directory if it doesn't exist
2. Copy the file `naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json` to `server/config/`

## Step 2: Update Server Environment Variables

**Create or update `server/.env` file:**

```env
# Firebase Service Account (file path - recommended)
FIREBASE_SERVICE_ACCOUNT=./config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json
```

Or use absolute path:
```env
FIREBASE_SERVICE_ACCOUNT=/Users/naethra/Desktop/Projects/ntpl/project-mgmt-new/prompt-hub/server/config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json
```

## Step 3: Verify File Location

The file should be at:
```
server/config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json
```

## Step 4: Test the Configuration

1. Start your server:
   ```bash
   cd server
   npm run dev
   ```

2. Check the console logs. You should see:
   ```
   ✅ Loaded Firebase service account from: /path/to/file
   ✅ Firebase Admin SDK initialized successfully
   ```

3. If you see errors, check:
   - File path is correct in `.env`
   - File exists at the specified location
   - File permissions allow reading

## Security Notes

✅ **Already Done:**
- File is added to `.gitignore` to prevent committing to version control
- File path is relative to server directory for portability

⚠️ **Important:**
- Never commit this file to Git
- Keep it secure and don't share it publicly
- Use environment variables, not hardcoded paths in production

## Troubleshooting

### Error: "Firebase service account file not found"
- Check the file path in `server/.env`
- Verify the file exists at that location
- Use absolute path if relative path doesn't work

### Error: "Failed to parse JSON"
- Verify the file is a valid JSON
- Check for any corruption during download

### Still having issues?
- Check server logs for detailed error messages
- Verify the file has read permissions
- Try using absolute path instead of relative
