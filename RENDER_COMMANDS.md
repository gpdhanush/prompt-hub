# Render Deployment Commands

## Backend Service Setup

**Service Configuration:**
- **Type:** Web Service
- **Build Command:** `cd server && npm install`
- **Start Command:** `cd server && npm start`
- **Health Check Path:** `/health`

## Frontend Service Setup

**Service Configuration:**
- **Type:** Static Site
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

## Environment Variables Setup

### Backend Environment Variables
```bash
NODE_ENV=production
PORT=3001
DB_HOST=<your-database-host>
DB_USER=<your-database-user>
DB_PASSWORD=<your-database-password>
DB_NAME=<your-database-name>
DB_PORT=3306
DB_CONNECTION_LIMIT=10
JWT_SECRET=<generate-using-command-below>
JWT_EXPires_IN=7d
API_BASE_URL=https://<your-backend>.onrender.com/api
CORS_ORIGIN=https://<your-frontend>.onrender.com
CORS_CREDENTIALS=true
FIREBASE_SERVICE_ACCOUNT=<your-firebase-service-account-json>
ENCRYPTION_KEY=<generate-using-command-below>
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,application/pdf
```

### Frontend Environment Variables
```bash
NODE_ENV=production
VITE_API_URL=https://<your-backend>.onrender.com/api
VITE_FIREBASE_API_KEY=<your-firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-firebase-auth-domain>
VITE_FIREBASE_PROJECT_ID=<your-firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-firebase-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-firebase-messaging-sender-id>
VITE_FIREBASE_APP_ID=<your-firebase-app-id>
VITE_FIREBASE_MEASUREMENT_ID=<your-firebase-measurement-id>
VITE_FIREBASE_VAPID_KEY=<your-firebase-vapid-key>
VITE_APP_VERSION=1.0.0
```

## Generate Secrets Commands

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Generate Encryption Key (64 hex characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Steps

1. **Push code to repository:**
   ```bash
   git add render.yaml
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **In Render Dashboard:**
   - Go to Dashboard → New → Blueprint
   - Connect your repository
   - Render will auto-detect `render.yaml`
   - Or manually create two services using the commands above

3. **Set environment variables** in each service's Environment tab

4. **Deploy:**
   - Backend first (wait for it to be live)
   - Then frontend
   - Update `CORS_ORIGIN` in backend with frontend URL
   - Update `VITE_API_URL` in frontend with backend URL

## Testing Commands

### Test Backend Locally
```bash
cd server
npm install
npm start
```

### Test Frontend Build Locally
```bash
npm install
npm run build
npm run preview
```

## Health Check

After deployment, verify backend is running:
```bash
curl https://<your-backend>.onrender.com/health
```
