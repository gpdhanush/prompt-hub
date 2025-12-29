import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from './config';
import { getAuthToken } from './auth';
import { logger } from './logger';

let socket: Socket | null = null;

/**
 * Get or create Socket.IO connection
 */
function getSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const serverUrl = API_CONFIG.SERVER_URL;
  if (!serverUrl) {
    throw new Error('Server URL not configured');
  }

  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found');
  }

  // Create new socket connection
  socket = io(serverUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    logger.info('Socket.IO connected');
  });

  socket.on('disconnect', (reason) => {
    logger.warn('Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    logger.error('Socket.IO connection error:', error);
  });

  socket.on('error', (error) => {
    logger.error('Socket.IO error:', error);
  });

  return socket;
}


/**
 * Disconnect socket (useful for cleanup on logout)
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

