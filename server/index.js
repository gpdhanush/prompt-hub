import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./config/database.js";
import { SERVER_CONFIG, CORS_CONFIG } from "./config/config.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import usersRoutes from "./routes/users.js";
import employeesRoutes from "./routes/employees.js";
import projectsRoutes from "./routes/projects.js";
import tasksRoutes from "./routes/tasks.js";
import bugsRoutes from "./routes/bugs.js";
import leavesRoutes from "./routes/leaves.js";
import reimbursementsRoutes from "./routes/reimbursements.js";
import authRoutes from "./routes/auth.js";
import promptsRoutes from "./routes/prompts.js";
import auditLogsRoutes from "./routes/auditLogs.js";
import notificationsRoutes from "./routes/notifications.js";
import reportsRoutes from "./routes/reports.js";
import settingsRoutes from "./routes/settings.js";
import searchRoutes from "./routes/search.js";
import rolesRoutes from "./routes/roles.js";
import positionsRoutes from "./routes/positions.js";
import rolePositionsRoutes from "./routes/rolePositions.js";
import permissionsRoutes from "./routes/permissions.js";
import fcmRoutes from "./routes/fcm.js";
import mfaRoutes from "./routes/mfa.js";
import assetsRoutes from "./routes/assets.js";
import remindersRoutes from "./routes/reminders.js";
import webhooksRoutes from "./routes/webhooks.js";
import documentRequestsRoutes from "./routes/documentRequests.js";
import kanbanRoutes from "./routes/kanban.js";
import holidaysRoutes from "./routes/holidays.js";
import { performHealthCheck } from "./utils/dbHealthCheck.js";
import { initializeFirebase } from "./utils/fcmService.js";
import {
  reportFatalError,
  createErrorContext,
} from "./utils/errorReporting.js";
import { initializeReminderScheduler } from "./utils/reminderScheduler.js";
import { initializeTicketEscalationScheduler } from "./utils/ticketEscalationScheduler.js";
import { initializeSocketIO } from "./utils/socketService.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

// Initialize Firebase Admin SDK (async)
initializeFirebase().catch((err) => {
  logger.error("Failed to initialize Firebase:", err);
});

// Initialize Reminder Scheduler
initializeReminderScheduler();

// Set up global error handlers for production crash reporting
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  reportFatalError(error, {
    source: "uncaught_exception",
    fatal: true,
  });
  // Don't exit in production, let the process manager handle it
  if (SERVER_CONFIG.NODE_ENV === "development") {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("Unhandled Promise Rejection:", error);
  reportFatalError(error, {
    source: "unhandled_promise_rejection",
    fatal: true,
    promise: String(promise),
  });
});

const app = express();
const PORT = SERVER_CONFIG.PORT;

// Configure Express to trust proxies (for accurate IP address detection)
// This allows req.ip to work correctly when behind a reverse proxy
// Set to 1 to trust only the first proxy (more secure than true)
// In production behind a reverse proxy, set this to the number of proxies
app.set("trust proxy", SERVER_CONFIG.NODE_ENV === "production" ? 1 : false);

// Security Middleware - Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Adjust for production
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Adjust if needed for file uploads
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
  })
);

// CORS Configuration
app.use(
  cors({
    origin: CORS_CONFIG.ORIGIN === "*" ? true : CORS_CONFIG.ORIGIN.split(","),
    credentials: CORS_CONFIG.CREDENTIALS,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Global Rate Limiting - Disabled in development/testing environments
if (SERVER_CONFIG.NODE_ENV !== "production") {
  logger.info("⚠️  Rate limiting is DISABLED (non-production environment)");
}

const globalRateLimiter =
  SERVER_CONFIG.NODE_ENV === "production"
    ? rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
          error: "Too many requests from this IP, please try again later.",
          retryAfter: "15 minutes",
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        // Note: trustProxy is configured on the Express app (line 86), not here
        skip: (req) => {
          // Skip rate limiting for health checks
          return req.path === "/health" || req.path === "/api/test-db";
        },
      })
    : (req, res, next) => next(); // No-op middleware for non-production

// Apply rate limiting to all API routes (only in production)
app.use("/api", globalRateLimiter);

// Stricter rate limiting for auth routes - Disabled in development/testing environments
const authRateLimiter =
  SERVER_CONFIG.NODE_ENV === "production"
    ? rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 login attempts per windowMs
        message: {
          error: "Too many authentication attempts, please try again later.",
          retryAfter: "15 minutes",
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Note: trustProxy is configured on the Express app (line 86), not here
        skipSuccessfulRequests: true, // Don't count successful requests
      })
    : (req, res, next) => next(); // No-op middleware for non-production

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from uploads directory
// Files are stored in server/uploads/profile-photos (based on employees.js multer config)
const uploadsPath = path.join(__dirname, "uploads");
logger.debug("📁 Static files directory:", uploadsPath);

// Ensure directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  logger.info("✅ Created uploads directory:", uploadsPath);
}

app.use("/uploads", express.static(uploadsPath));

// Serve Swagger UI custom CSS
const publicPath = path.join(__dirname, "public");
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}
app.get("/", (req, res) => {
  res.json({
    name: "PMS API",
    status: "running",
    docs: "/api-docs",
    health: "/health",
    node: process.version,
    env: process.env.NODE_ENV,
  });
});
// Serve static files with proper MIME types for cPanel
app.use(
  "/swagger-ui-assets",
  express.static(publicPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      } else if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
        res.setHeader("Content-Type", "application/javascript");
      } else if (filePath.endsWith(".json")) {
        res.setHeader("Content-Type", "application/json");
      }
    },
  })
);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    let dbStatus = "unknown";
    try {
      await db.query("SELECT 1 as test");
      dbStatus = "connected";
    } catch (dbError) {
      dbStatus = "disconnected";
      logger.warn("Database health check failed:", dbError.message);
    }

    const health = {
      status: dbStatus === "connected" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        server: "running",
      },
    };

    // Return 503 if database is disconnected
    if (dbStatus === "disconnected") {
      return res.status(503).json(health);
    }

    res.json(health);
  } catch (error) {
    logger.error("Health check error:", error);
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Test database connection
app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 as test");
    res.json({ status: "connected", data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Swagger API Documentation with Modern UI
const swaggerOptions = {
  customCssUrl: "/swagger-ui-assets/swagger-ui-custom.css",
  customSiteTitle: "Admin Dashboard API",
  customfavIcon: "/favicon.ico",
  customCss: `
    .swagger-ui .topbar { display: none !important; }
    .swagger-ui .info { margin-bottom: 40px; }
    .swagger-ui { background: #f8fafc; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: "list",
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
  },
};

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerOptions)
);

// Swagger JSON endpoint
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// API Routes
// Apply auth rate limiter to auth routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/bugs", bugsRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/positions", positionsRoutes);
app.use("/api/role-positions", rolePositionsRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/leaves", leavesRoutes);
app.use("/api/reimbursements", reimbursementsRoutes);
app.use("/api/prompts", promptsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/fcm", fcmRoutes);
app.use("/api/mfa", mfaRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/document-requests", documentRequestsRoutes);
app.use("/api/kanban", kanbanRoutes);
app.use("/api/holidays", holidaysRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Error:", err);

  // Report to crash analytics in production
  if (SERVER_CONFIG.NODE_ENV === "production") {
    const errorContext = createErrorContext(req);
    reportFatalError(err, {
      ...errorContext,
      source: "express_error_handler",
      statusCode: err.status || 500,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(SERVER_CONFIG.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler - only catch API routes, not static files
app.use((req, res) => {
  // Don't send 404 for static file requests that might have failed
  // Express static middleware handles 404s for files that don't exist
  if (req.path.startsWith("/uploads/")) {
    return res.status(404).json({ error: "File not found", path: req.path });
  }
  res.status(404).json({ error: "Route not found", path: req.path });
});

// Start server (HTTP or HTTPS based on configuration)
(async () => {
  // Check if HTTPS is enabled
  const useHttps = process.env.HTTPS_ENABLED === "true";
  const sslCertPath = process.env.SSL_CERT_PATH;
  const sslKeyPath = process.env.SSL_KEY_PATH;

  let server;

  if (useHttps && sslCertPath && sslKeyPath) {
    try {
      // Read SSL certificates
      const cert = fs.readFileSync(sslCertPath, "utf8");
      const key = fs.readFileSync(sslKeyPath, "utf8");

      const httpsOptions = {
        key,
        cert,
      };

      server = https.createServer(httpsOptions, app);
      logger.info(`🔒 HTTPS enabled - SSL certificates loaded`);
    } catch (error) {
      logger.error("❌ Failed to load SSL certificates:", error.message);
      logger.warn("⚠️  Falling back to HTTP");
      server = http.createServer(app);
    }
  } else {
    server = http.createServer(app);
    if (SERVER_CONFIG.NODE_ENV === "production") {
      logger.warn(
        "⚠️  HTTPS is not enabled. Consider enabling HTTPS in production."
      );
    }
  }

  // Initialize Socket.IO
  initializeSocketIO(server);

  // Listen on all interfaces (0.0.0.0) for cPanel compatibility
  // cPanel will automatically set the PORT environment variable
  // server.listen(PORT, "0.0.0.0", async () => {
  //   const protocol = useHttps && server !== app ? "https" : "http";
  //   const publicApiUrl =
  //     process.env.API_BASE_URL || `${protocol}://localhost:${PORT}/api`;

  //   logger.info(`🌐 Public Backend API URL: ${publicApiUrl}`);
  //   logger.info(`❤️ Health Check: ${publicApiUrl}/health`);
  //   logger.info(`✅ Server running on ${protocol}://0.0.0.0:${PORT}`);
  //   logger.info(`✅ Health check : ${protocol}://0.0.0.0:${PORT}/health`);

  //   // Perform database health check on startup
  //   try {
  //     await performHealthCheck();

  //     // Initialize refresh token cleanup job (run every 24 hours)
  //     const { cleanupExpiredTokens } = await import(
  //       "./utils/refreshTokenService.js"
  //     );
  //     setInterval(async () => {
  //       try {
  //         const deleted = await cleanupExpiredTokens();
  //         if (deleted > 0) {
  //           logger.info(`🧹 Cleaned up ${deleted} expired refresh tokens`);
  //         }
  //       } catch (error) {
  //         logger.error("Error cleaning up expired tokens:", error);
  //       }
  //     }, 24 * 60 * 60 * 1000); // 24 hours

  //     // Run cleanup once on startup
  //     try {
  //       const deleted = await cleanupExpiredTokens();
  //       if (deleted > 0) {
  //         logger.info(
  //           `🧹 Cleaned up ${deleted} expired refresh tokens on startup`
  //         );
  //       }
  //     } catch (error) {
  //       logger.error("Error cleaning up expired tokens on startup:", error);
  //     }

  //     // Initialize reminder scheduler
  //     initializeReminderScheduler();

  //     // Initialize ticket escalation scheduler
  //     initializeTicketEscalationScheduler();
  //   } catch (error) {
  //     logger.error("❌ Health check failed:", error);
  //     logger.error("⚠️  Server started but database may have issues");
  //   }
  // });
  const port = process.env.PORT || 3000;

  server.listen(port, async () => {
    const protocol = useHttps && server !== app ? "https" : "http";

    const publicApiUrl =
      process.env.API_BASE_URL || `${protocol}://localhost:${port}/api`;

    logger.info(`🌐 Public Backend API URL: ${publicApiUrl}`);
    logger.info(`❤️ Health Check: ${publicApiUrl}/health`);
    logger.info(`✅ Server listening on port ${port}`);

    // Perform database health check on startup
    try {
      await performHealthCheck();

      const { cleanupExpiredTokens } = await import(
        "./utils/refreshTokenService.js"
      );

      setInterval(async () => {
        try {
          const deleted = await cleanupExpiredTokens();
          if (deleted > 0) {
            logger.info(`🧹 Cleaned up ${deleted} expired refresh tokens`);
          }
        } catch (error) {
          logger.error("Error cleaning up expired tokens:", error);
        }
      }, 24 * 60 * 60 * 1000);

      const deleted = await cleanupExpiredTokens();
      if (deleted > 0) {
        logger.info(
          `🧹 Cleaned up ${deleted} expired refresh tokens on startup`
        );
      }

      initializeReminderScheduler();
      initializeTicketEscalationScheduler();
    } catch (error) {
      logger.error("❌ Health check failed:", error);
      logger.error("⚠️ Server started but database may have issues");
    }
  });
  // Handle server errors
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      logger.error(`❌ Port ${PORT} is already in use.`);
      logger.error(`   Please either:`);
      logger.error(
        `   1. Kill the process using port ${PORT}: lsof -ti:${PORT} | xargs kill -9`
      );
      logger.error(`   2. Change the PORT in your .env file`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, closing server...");
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  });

  process.on("SIGINT", async () => {
    logger.info("\nSIGINT received, closing server...");
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  });
})();
