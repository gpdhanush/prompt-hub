import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './config/database.js';

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
import { performHealthCheck } from './utils/dbHealthCheck.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
// Files are stored in server/uploads/profile-photos (based on employees.js multer config)
import fs from 'fs';
const uploadsPath = path.join(__dirname, 'uploads');
console.log('📁 Static files directory:', uploadsPath);

// Ensure directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsPath);
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
app.use('/api/leaves', leavesRoutes);
app.use('/api/reimbursements', reimbursementsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
  console.log(`✅ Server running on http://localhost:${PORT}`);
  
  // Perform database health check on startup
  try {
    await performHealthCheck();
  } catch (error) {
    console.error('❌ Health check failed:', error);
    console.error('⚠️  Server started but database may have issues');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Please either:`);
    console.error(`   1. Kill the process using port ${PORT}: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`   2. Change the PORT in your .env file`);
    process.exit(1);
  } else {
    throw err;
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
});
