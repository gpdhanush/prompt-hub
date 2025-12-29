import { Server } from 'socket.io';
import { logger } from './logger.js';
import { verifyAccessToken } from './jwt.js';
import { db } from '../config/database.js';

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server|https.Server} server - HTTP/HTTPS server instance
 * @returns {Server} Socket.IO server instance
 */
export function initializeSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyAccessToken(token);
      const userId = decoded.userId || decoded.id;
      
      if (!userId) {
        return next(new Error('Authentication error: Invalid token payload'));
      }

      // Get user from database to verify and get role
      const [users] = await db.query(`
        SELECT u.*, r.name as role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ? AND u.status = 'Active'
      `, [userId]);

      if (users.length === 0) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      const user = users[0];
      
      // Check if user is active (for client activation/deactivation)
      if (user.is_active === 0 || user.is_active === false) {
        logger.warn(`Socket connection attempt for inactive user: ${userId}`);
        return next(new Error('Authentication error: Account has been deactivated'));
      }
      
      // Check token version for force logout on deactivation
      const tokenTokenVersion = decoded.tokenVersion;
      const userTokenVersion = user.token_version || 0;
      
      if (tokenTokenVersion !== undefined && tokenTokenVersion !== userTokenVersion) {
        logger.warn(`Token version mismatch for socket connection. User: ${userId}, Token version: ${tokenTokenVersion}, Current version: ${userTokenVersion}`);
        return next(new Error('Authentication error: Session has been invalidated'));
      }
      
      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userName = user.name;
      
      logger.debug(`Socket authenticated: User ${user.id} (${user.name})`);
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Socket connected: User ${socket.userId} (${socket.userName})`);

    // Periodic check for user deactivation (every 30 seconds)
    const deactivationCheck = setInterval(async () => {
      try {
        const [users] = await db.query(`
          SELECT is_active, token_version FROM users WHERE id = ?
        `, [socket.userId]);
        
        if (users.length === 0 || users[0].is_active === 0 || users[0].is_active === false) {
          logger.info(`Disconnecting socket for deactivated user: ${socket.userId}`);
          socket.emit('force_logout', { 
            message: 'Your account has been deactivated',
            code: 'ACCOUNT_DEACTIVATED'
          });
          socket.disconnect(true);
          clearInterval(deactivationCheck);
        }
      } catch (error) {
        logger.error('Error checking user deactivation status:', error);
      }
    }, 30000); // Check every 30 seconds
    
    // Disconnect handler
    socket.on('disconnect', (reason) => {
      clearInterval(deactivationCheck);
      logger.info(`Socket disconnected: User ${socket.userId} - ${reason}`);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}

/**
 * Get Socket.IO instance
 * @returns {Server|null} Socket.IO server instance
 */
export function getSocketIO() {
  return io;
}


/**
 * Emit event to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function emitToAll(event, data) {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot emit event');
    return;
  }

  io.emit(event, data);
  logger.debug(`Emitted ${event} to all clients`);
}

