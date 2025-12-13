# Firebase Service Account Configuration

## File Location

Place your Firebase service account JSON file in this directory:
- `server/config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json`

## Security

⚠️ **IMPORTANT**: This file contains sensitive credentials. Never commit it to version control!

The file is already added to `.gitignore` to prevent accidental commits.

## Configuration

Update your `server/.env` file with the path to this file:

```env
FIREBASE_SERVICE_ACCOUNT=./config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json
```

Or use an absolute path:

```env
FIREBASE_SERVICE_ACCOUNT=/full/path/to/server/config/naethra-project-mgmt-firebase-adminsdk-fbsvc-23ea8814a5.json
```

## Alternative: JSON String

You can also paste the entire JSON content as a string in `.env`:

```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"naethra-project-mgmt",...}'
```

But using a file path is recommended for better security and readability.
