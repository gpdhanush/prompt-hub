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

    // Join board room
    socket.on('kanban:join_board', async (boardId) => {
      try {
        // Verify user has access to board
        const [members] = await db.query(
          'SELECT * FROM kanban_board_members WHERE board_id = ? AND user_id = ?',
          [boardId, socket.userId]
        );

        // Allow if user is admin/super admin
        if (socket.userRole === 'Super Admin' || socket.userRole === 'Admin') {
          socket.join(`board:${boardId}`);
          logger.debug(`User ${socket.userId} joined board ${boardId} (admin)`);
          return;
        }

        if (members.length === 0) {
          logger.warn(`User ${socket.userId} attempted to join board ${boardId} without access`);
          socket.emit('kanban:error', { message: 'Access denied to board' });
          return;
        }

        socket.join(`board:${boardId}`);
        logger.debug(`User ${socket.userId} joined board ${boardId}`);
        socket.emit('kanban:joined_board', { boardId });
      } catch (error) {
        logger.error('Error joining board:', error);
        socket.emit('kanban:error', { message: 'Failed to join board' });
      }
    });

    // Leave board room
    socket.on('kanban:leave_board', (boardId) => {
      socket.leave(`board:${boardId}`);
      logger.debug(`User ${socket.userId} left board ${boardId}`);
    });

    // Join room for comments (task or bug)
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      logger.debug(`User ${socket.userId} joined room: ${roomName}`);
    });

    // Leave room for comments
    socket.on('leave_room', (roomName) => {
      socket.leave(roomName);
      logger.debug(`User ${socket.userId} left room: ${roomName}`);
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
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
 * Emit event to board room
 * @param {number} boardId - Board ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function emitToBoard(boardId, event, data) {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot emit event');
    return;
  }

  io.to(`board:${boardId}`).emit(event, data);
  logger.debug(`Emitted ${event} to board ${boardId}`);
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

/**
 * Emit event to a specific room (e.g., task:123, bug:456)
 * @param {string} roomName - Room name
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function emitToRoom(roomName, event, data) {
  if (!io) {
    logger.warn('Socket.IO not initialized, cannot emit event');
    return;
  }

  io.to(roomName).emit(event, data);
  logger.debug(`Emitted ${event} to room ${roomName}`);
}

