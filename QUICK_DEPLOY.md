# Quick Deployment Commands for Render

## Quick Start

### 1. Backend Deployment

**Service Type:** Web Service  
**Build Command:** `cd server && npm install`  
**Start Command:** `cd server && npm start`

**Required Environment Variables:**
```bash
NODE_ENV=production
PORT=3001
DB_HOST=<your-db-host>
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_NAME=<your-db-name>
JWT_SECRET=<generate-strong-secret>
API_BASE_URL=https://<your-backend>.onrender.com/api
CORS_ORIGIN=https://<your-frontend>.onrender.com
FIREBASE_SERVICE_ACCOUNT=<firebase-json-string>
ENCRYPTION_KEY=<64-char-hex-key>
```

### 2. Frontend Deployment

**Service Type:** Static Site  
**Build Command:** `npm install && npm run build`  
**Publish Directory:** `dist`

**Required Environment Variables:**
```bash
VITE_API_URL=https://<your-backend>.onrender.com/api
VITE_FIREBASE_API_KEY=<your-firebase-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-firebase-domain>
VITE_FIREBASE_PROJECT_ID=<your-firebase-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-firebase-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
VITE_FIREBASE_VAPID_KEY=<your-vapid-key>
```

## Generate Secrets

### JWT Secret (64 bytes)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Encryption Key (32 bytes = 64 hex chars)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Order

1. **Deploy Backend first**
   - Wait for it to be live
   - Note the URL: `https://your-backend.onrender.com`

2. **Update Backend Environment Variables**
   - Set `API_BASE_URL=https://your-backend.onrender.com/api`
   - Set `CORS_ORIGIN=https://your-frontend.onrender.com` (after frontend is deployed)

3. **Deploy Frontend**
   - Set `VITE_API_URL=https://your-backend.onrender.com/api`

4. **Update Backend CORS**
   - Update `CORS_ORIGIN` with actual frontend URL

## Health Check

Backend health endpoint: `https://your-backend.onrender.com/health`

## Common Issues

**Backend won't start:**
- Check all env vars are set
- Verify database connection
- Check logs in Render dashboard

**Frontend can't connect:**
- Verify `VITE_API_URL` is correct
- Check CORS settings match frontend URL
- Ensure backend is running

**Build fails:**
- Check Node version (Render uses latest LTS)
- Verify all dependencies in package.json
- Check build logs
