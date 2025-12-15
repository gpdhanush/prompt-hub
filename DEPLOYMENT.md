# Deployment Guide for Render

This guide explains how to deploy both the frontend and backend to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. A MySQL database (can use Render's managed PostgreSQL or external MySQL)
3. Firebase project configured
4. All environment variables ready

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Add Render deployment config"
   git push origin main
   ```

2. **Import from render.yaml in Render Dashboard**
   - Go to Render Dashboard → New → Blueprint
   - Connect your repository
   - Render will automatically detect `render.yaml` and create both services

3. **Configure Environment Variables**
   - Go to each service → Environment
   - Set all variables marked as `sync: false` in render.yaml

### Option 2: Manual Setup

#### Backend Service

1. **Create a new Web Service**
   - Go to Render Dashboard → New → Web Service
   - Connect your repository

2. **Configure Backend Service:**
   ```
   Name: prompt-hub-backend
   Region: Oregon (or your preferred region)
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: cd server && npm install
   Start Command: cd server && npm start
   ```

3. **Set Environment Variables** (in Render Dashboard → Environment):
   ```bash
   NODE_ENV=production
   PORT=3001
   DB_HOST=your-database-host
   DB_USER=your-database-user
   DB_PASSWORD=your-database-password
   DB_NAME=your-database-name
   DB_PORT=3306
   DB_CONNECTION_LIMIT=10
   JWT_SECRET=your-strong-jwt-secret-here
   JWT_EXPIRES_IN=7d
   API_BASE_URL=https://your-backend.onrender.com/api
   CORS_ORIGIN=https://your-frontend.onrender.com
   CORS_CREDENTIALS=true
   FIREBASE_SERVICE_ACCOUNT=your-firebase-service-account-json
   ENCRYPTION_KEY=your-64-character-hex-encryption-key
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=./uploads
   ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,application/pdf
   ```

#### Frontend Service

1. **Create a new Static Site** (or Web Service)
   - Go to Render Dashboard → New → Static Site
   - Connect your repository

2. **Configure Frontend Service:**
   ```
   Name: prompt-hub-frontend
   Region: Oregon (or your preferred region)
   Branch: main
   Root Directory: (leave empty)
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

   **OR if using Web Service:**
   ```
   Build Command: npm install && npm run build
   Start Command: npm run preview
   ```

3. **Set Environment Variables** (in Render Dashboard → Environment):
   ```bash
   NODE_ENV=production
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-firebase-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-firebase-measurement-id
   VITE_FIREBASE_VAPID_KEY=your-firebase-vapid-key
   VITE_APP_VERSION=1.0.0
   ```

## Important Notes

### Backend URL Configuration
- After deploying backend, update `API_BASE_URL` in backend env vars to: `https://your-backend.onrender.com/api`
- Update `CORS_ORIGIN` in backend env vars to: `https://your-frontend.onrender.com`
- Update `VITE_API_URL` in frontend env vars to: `https://your-backend.onrender.com/api`

### Database Setup
- Render provides managed PostgreSQL, but your app uses MySQL
- Options:
  1. Use external MySQL (AWS RDS, PlanetScale, etc.)
  2. Use Render's PostgreSQL and update your backend code
  3. Use a MySQL service like ClearDB or Aiven

### File Uploads
- Render's filesystem is ephemeral (uploads will be lost on restart)
- Consider using:
  - AWS S3
  - Cloudinary
  - Firebase Storage
  - Render Disk (persistent storage addon)

### Health Checks
- Backend should respond to health check at `/health` or root `/`
- Render will automatically check if service is running

### Custom Domains
- Both services can have custom domains
- Update CORS_ORIGIN and VITE_API_URL accordingly

## Post-Deployment Checklist

- [ ] Backend service is running and healthy
- [ ] Frontend service is built and deployed
- [ ] Database connection is working
- [ ] Environment variables are set correctly
- [ ] CORS is configured properly
- [ ] Firebase is configured
- [ ] File uploads are working (if using persistent storage)
- [ ] SSL certificates are active (automatic on Render)
- [ ] Test login and basic functionality

## Troubleshooting

### Backend won't start
- Check logs in Render Dashboard
- Verify all environment variables are set
- Check database connection
- Verify PORT is set correctly

### Frontend can't connect to backend
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Ensure backend URL uses HTTPS

### Build fails
- Check Node version (Render uses latest LTS by default)
- Verify all dependencies are in package.json
- Check build logs for specific errors

## Commands Reference

### Local Build Test (Backend)
```bash
cd server
npm install
npm start
```

### Local Build Test (Frontend)
```bash
npm install
npm run build
npm run preview
```

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Generate Encryption Key (64 char hex)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
