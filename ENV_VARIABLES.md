# Environment Variables Documentation

This document lists all environment variables used in the project. All configuration values must be set in `.env` files - no hardcoded defaults are used in production.

## Project Structure

- **Frontend `.env`**: Root directory (`.env`)
- **Backend `.env`**: `server/.env`

## Quick Start

1. Copy `.env.example` to `.env` in the root directory
2. Copy `server/.env.example` to `server/.env`
3. Fill in all required values
4. Never commit `.env` files to version control

---

## Frontend Environment Variables

### API Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | ✅ Yes | Backend API base URL (must include `/api` suffix) | `http://localhost:3001/api` |

### Static Assets Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_STATIC_URL` | ❌ Optional | Base URL for static assets/uploads. If not set, uses SERVER_URL from `VITE_API_URL` | `http://localhost:3001` |

### Firebase Configuration

All Firebase variables are required for the application to work properly.

| Variable | Required | Description | Where to Find |
|----------|----------|-------------|---------------|
| `VITE_FIREBASE_API_KEY` | ✅ Yes | Firebase API Key | Firebase Console > Project Settings > General > Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ Yes | Firebase Auth Domain | `{project-id}.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ Yes | Firebase Project ID | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ Yes | Firebase Storage Bucket | `{project-id}.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ Yes | Firebase Messaging Sender ID | Firebase Console > Project Settings > Cloud Messaging |
| `VITE_FIREBASE_APP_ID` | ✅ Yes | Firebase App ID | Firebase Console > Project Settings > General > Your apps |
| `VITE_FIREBASE_MEASUREMENT_ID` | ✅ Yes | Firebase Measurement ID (Analytics) | Firebase Console > Project Settings > General > Your apps |
| `VITE_FIREBASE_VAPID_KEY` | ✅ Yes | VAPID Key for Web Push | Firebase Console > Project Settings > Cloud Messaging > Web Push certificates |

---

## Backend Environment Variables

### Database Configuration

All database variables are required.

| Variable | Required | Description | Default | Example |
|----------|----------|-------------|---------|---------|
| `DB_HOST` | ✅ Yes | MySQL database host | - | `localhost` |
| `DB_USER` | ✅ Yes | MySQL database user | - | `root` |
| `DB_PASSWORD` | ✅ Yes | MySQL database password | - | `your_password` |
| `DB_NAME` | ✅ Yes | MySQL database name | - | `admin_dashboard` |
| `DB_PORT` | ❌ Optional | MySQL database port | `3306` | `3306` |
| `DB_CONNECTION_LIMIT` | ❌ Optional | Connection pool limit | `10` | `10` |

### Server Configuration

| Variable | Required | Description | Default | Example |
|----------|----------|-------------|---------|---------|
| `PORT` | ❌ Optional | Server port | `3001` | `3001` |
| `NODE_ENV` | ❌ Optional | Node environment | `development` | `development` or `production` |
| `API_BASE_URL` | ✅ Yes | Full API base URL (used for generating absolute URLs) | - | `http://localhost:3001/api` |

### JWT Configuration

| Variable | Required | Description | Default | Example |
|----------|----------|-------------|---------|---------|
| `JWT_SECRET` | ✅ Yes | Secret key for JWT token signing. **MUST be changed in production!** | - | Generate with: `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | ❌ Optional | JWT token expiration time | `7d` | `7d`, `24h`, `1h` |

### Encryption Configuration

| Variable | Required | Description | How to Generate |
|----------|----------|-------------|-----------------|
| `ENCRYPTION_KEY` | ⚠️ Recommended | 64-character hex string (32 bytes) for encrypting sensitive data. **If not set, a random key is generated on each restart (data will not be recoverable!)** | `openssl rand -hex 32` |

### Firebase Configuration (Backend)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | ❌ Optional | Firebase service account JSON as string | `{"type":"service_account",...}` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | ❌ Optional | Path to Firebase service account JSON file (relative to `server/` directory) | `./config/firebase-service-account.json` |

**Note**: Use either `FIREBASE_SERVICE_ACCOUNT` (JSON string) OR `FIREBASE_SERVICE_ACCOUNT_PATH` (file path), not both.

### File Upload Configuration

| Variable | Required | Description | Default | Example |
|----------|----------|-------------|---------|---------|
| `MAX_FILE_SIZE` | ❌ Optional | Maximum file size in bytes | `10485760` (10MB) | `10485760` |
| `UPLOAD_DIR` | ❌ Optional | Upload directory (relative to `server/` directory) | `./uploads` | `./uploads` |
| `ALLOWED_FILE_TYPES` | ❌ Optional | Comma-separated list of allowed MIME types | `image/jpeg,image/png,image/jpg,application/pdf` | `image/jpeg,image/png,application/pdf` |

### CORS Configuration

| Variable | Required | Description | Default | Example |
|----------|----------|-------------|---------|---------|
| `CORS_ORIGIN` | ❌ Optional | Allowed CORS origins (use `*` for all) | `*` | `*` or `http://localhost:5173,https://example.com` |
| `CORS_CREDENTIALS` | ❌ Optional | Allow credentials in CORS requests | `false` | `true` or `false` |

---

## Production Checklist

Before deploying to production, ensure:

- [ ] All required variables are set (no missing values)
- [ ] `JWT_SECRET` is changed from default value
- [ ] `ENCRYPTION_KEY` is set (critical for data recovery)
- [ ] `NODE_ENV=production`
- [ ] `API_BASE_URL` points to production server
- [ ] `VITE_API_URL` points to production API
- [ ] Database credentials are production values
- [ ] Firebase credentials are production values
- [ ] CORS origins are restricted (not `*`)
- [ ] `.env` files are in `.gitignore` (already done)

---

## Security Notes

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Use strong secrets** - Generate random strings for `JWT_SECRET` and `ENCRYPTION_KEY`
3. **Rotate keys regularly** - Especially in production
4. **Restrict CORS** - Don't use `*` in production
5. **Use environment-specific values** - Different values for dev/staging/production

---

## Generating Secure Keys

### JWT Secret
```bash
openssl rand -hex 32
```

### Encryption Key
```bash
openssl rand -hex 32
```

---

## Troubleshooting

### "Missing required environment variables" error
- Check that all required variables are set in `.env` file
- Verify `.env` file is in the correct location (root for frontend, `server/` for backend)
- Restart the development server after changing `.env` files

### "ENCRYPTION_KEY not set" warning
- This is a warning, not an error
- In development, a random key is generated (data encrypted with this key won't be recoverable after restart)
- In production, always set `ENCRYPTION_KEY` to a fixed value

### Frontend can't connect to backend
- Verify `VITE_API_URL` matches your backend server URL
- Check that backend is running on the port specified in `PORT`
- Verify CORS settings allow your frontend origin

---

## File Locations

- Frontend config: `src/lib/config.ts`
- Backend config: `server/config/config.js`
- Frontend `.env.example`: `.env.example` (root)
- Backend `.env.example`: `server/.env.example`
