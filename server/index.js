import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './config/database.js';
import { SERVER_CONFIG, CORS_CONFIG } from './config/config.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import usersRoutes from './routes/users.js';
import employeesRoutes from './routes/employees.js';
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import bugsRoutes from './routes/bugs.js';
import leavesRoutes from './routes/leaves.js';
import reimbursementsRoutes from './routes/reimbursements.js';
import authRoutes from './routes/auth.js';
import promptsRoutes from './routes/prompts.js';
import auditLogsRoutes from './routes/auditLogs.js';
import notificationsRoutes from './routes/notifications.js';
import reportsRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import rolesRoutes from './routes/roles.js';
import positionsRoutes from './routes/positions.js';
import rolePositionsRoutes from './routes/rolePositions.js';
import permissionsRoutes from './routes/permissions.js';
import fcmRoutes from './routes/fcm.js';
import mfaRoutes from './routes/mfa.js';
import { performHealthCheck } from './utils/dbHealthCheck.js';
import { initializeFirebase } from './utils/fcmService.js';
import { reportFatalError, createErrorContext } from './utils/errorReporting.js';

// Initialize Firebase Admin SDK (async)
initializeFirebase().catch(err => {
  logger.error('Failed to initialize Firebase:', err);
});

// Set up global error handlers for production crash reporting
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  reportFatalError(error, {
    source: 'uncaught_exception',
    fatal: true,
  });
  // Don't exit in production, let the process manager handle it
  if (SERVER_CONFIG.NODE_ENV === 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled Promise Rejection:', error);
  reportFatalError(error, {
    source: 'unhandled_promise_rejection',
    fatal: true,
    promise: String(promise),
  });
});

const app = express();
const PORT = SERVER_CONFIG.PORT;

// Configure Express to trust proxies (for accurate IP address detection)
// This allows req.ip to work correctly when behind a reverse proxy
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
// Files are stored in server/uploads/profile-photos (based on employees.js multer config)
import fs from 'fs';
const uploadsPath = path.join(__dirname, 'uploads');
logger.debug('📁 Static files directory:', uploadsPath);

// Ensure directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  logger.info('✅ Created uploads directory:', uploadsPath);
}

app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 as test');
    res.json({ status: 'connected', data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/bugs', bugsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/role-positions', rolePositionsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/reimbursements', reimbursementsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/fcm', fcmRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  
  // Report to crash analytics in production
  if (SERVER_CONFIG.NODE_ENV === 'production') {
    const errorContext = createErrorContext(req);
    reportFatalError(err, {
      ...errorContext,
      source: 'express_error_handler',
      statusCode: err.status || 500,
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(SERVER_CONFIG.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler - only catch API routes, not static files
app.use((req, res) => {
  // Don't send 404 for static file requests that might have failed
  // Express static middleware handles 404s for files that don't exist
  if (req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'File not found', path: req.path });
  }
  res.status(404).json({ error: 'Route not found', path: req.path });
});

const server = app.listen(PORT, async () => {
  logger.info(`✅ Server running on port ${PORT}`);
  
  // Perform database health check on startup
  try {
    await performHealthCheck();
  } catch (error) {
    logger.error('❌ Health check failed:', error);
    logger.error('⚠️  Server started but database may have issues');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use.`);
    logger.error(`   Please either:`);
    logger.error(`   1. Kill the process using port ${PORT}: lsof -ti:${PORT} | xargs kill -9`);
    logger.error(`   2. Change the PORT in your .env file`);
    process.exit(1);
  } else {
    throw err;
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...');
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('\nSIGINT received, closing server...');
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
});
