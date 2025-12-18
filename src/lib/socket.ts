/**
 * Socket.IO Client Service
 * Manages real-time connections for comments and other live updates
 */

import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from './config';
import { secureStorageWithCache, getItemSync } from './secureStorage';
import { logger } from './logger';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Get or create Socket.IO connection
 */
export function getSocket(): Socket | null {
  if (socket?.connected) {
    return socket;
  }

  // Disconnect existing socket if not connected
  if (socket && !socket.connected) {
    socket.disconnect();
    socket = null;
  }

  // Get auth token
  const token = getItemSync('auth_token');
  if (!token) {
    logger.debug('No auth token available for Socket.IO connection');
    return null;
  }

  // Get server URL (remove /api suffix if present)
  const serverUrl = API_CONFIG.SERVER_URL || API_CONFIG.BASE_URL?.replace('/api', '').replace(/\/$/, '') || '';
  if (!serverUrl) {
    logger.warn('No server URL configured for Socket.IO');
    return null;
  }

  // Create socket connection
  socket = io(serverUrl, {
    auth: {
      token: token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
  });

  socket.on('connect', () => {
    logger.info('Socket.IO connected');
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    logger.warn('Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    reconnectAttempts++;
    logger.error('Socket.IO connection error:', error);
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnection attempts reached. Socket.IO connection failed.');
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    logger.info(`Socket.IO reconnected after ${attemptNumber} attempts`);
    reconnectAttempts = 0;
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    logger.debug(`Socket.IO reconnection attempt ${attemptNumber}`);
  });

  socket.on('reconnect_failed', () => {
    logger.error('Socket.IO reconnection failed');
  });

  return socket;
}

/**
 * Disconnect Socket.IO
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
}

/**
 * Join a room for real-time updates
 * @param roomName - Room name (e.g., 'task:123', 'bug:456')
 */
export function joinRoom(roomName: string): void {
  const sock = getSocket();
  if (sock?.connected) {
    sock.emit('join_room', roomName);
    logger.debug(`Joined room: ${roomName}`);
  }
}

/**
 * Leave a room
 * @param roomName - Room name to leave
 */
export function leaveRoom(roomName: string): void {
  const sock = getSocket();
  if (sock?.connected) {
    sock.emit('leave_room', roomName);
    logger.debug(`Left room: ${roomName}`);
  }
}

/**
 * Subscribe to comment events for a task or bug
 * @param type - 'task' or 'bug'
 * @param id - Task or bug ID
 * @param callback - Callback function to handle new comments
 * @returns Cleanup function
 */
export function subscribeToComments(
  type: 'task' | 'bug',
  id: number,
  callback: (data: any) => void
): () => void {
  const roomName = `${type}:${id}`;
  const sock = getSocket();

  if (!sock) {
    logger.warn('Socket not available for comment subscription');
    return () => {};
  }

  // Join room
  joinRoom(roomName);

  // Listen for comment events
  const eventName = type === 'task' ? 'task_comment' : 'bug_comment';
  const replyEventName = type === 'task' ? 'task_comment_reply' : 'bug_comment_reply';

  sock.on(eventName, callback);
  sock.on(replyEventName, callback);

  // Cleanup function
  return () => {
    sock.off(eventName, callback);
    sock.off(replyEventName, callback);
    leaveRoom(roomName);
  };
}

/**
 * Subscribe to Kanban board events
 * @param boardId - Board ID
 * @param callbacks - Object with event callbacks
 * @returns Cleanup function
 */
export function subscribeToKanbanBoard(
  boardId: number,
  callbacks: {
    onTaskCreated?: (data: any) => void;
    onTaskMoved?: (data: any) => void;
    onTaskUpdated?: (data: any) => void;
    onTaskDeleted?: (data: any) => void;
    onBulkUpdate?: (data: any) => void;
  }
): () => void {
  const roomName = `board:${boardId}`;
  const sock = getSocket();

  if (!sock) {
    logger.warn('Socket not available for Kanban board subscription');
    return () => {};
  }

  // Join board room (using kanban:join_board event)
  sock.emit('kanban:join_board', boardId);

  // Set up event listeners
  if (callbacks.onTaskCreated) {
    sock.on('kanban:task_created', callbacks.onTaskCreated);
  }
  if (callbacks.onTaskMoved) {
    sock.on('kanban:task_moved', callbacks.onTaskMoved);
  }
  if (callbacks.onTaskUpdated) {
    sock.on('kanban:task_updated', callbacks.onTaskUpdated);
  }
  if (callbacks.onTaskDeleted) {
    sock.on('kanban:task_deleted', callbacks.onTaskDeleted);
  }
  if (callbacks.onBulkUpdate) {
    sock.on('kanban:bulk_update', callbacks.onBulkUpdate);
  }

  // Cleanup function
  return () => {
    if (callbacks.onTaskCreated) {
      sock.off('kanban:task_created', callbacks.onTaskCreated);
    }
    if (callbacks.onTaskMoved) {
      sock.off('kanban:task_moved', callbacks.onTaskMoved);
    }
    if (callbacks.onTaskUpdated) {
      sock.off('kanban:task_updated', callbacks.onTaskUpdated);
    }
    if (callbacks.onTaskDeleted) {
      sock.off('kanban:task_deleted', callbacks.onTaskDeleted);
    }
    if (callbacks.onBulkUpdate) {
      sock.off('kanban:bulk_update', callbacks.onBulkUpdate);
    }
    sock.emit('kanban:leave_board', boardId);
  };
}

