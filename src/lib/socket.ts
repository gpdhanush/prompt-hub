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
 * Subscribe to Kanban board events
 * @param boardId - Board ID to subscribe to
 * @param callbacks - Event callbacks
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToKanbanBoard(
  boardId: number,
  callbacks: {
    onTaskCreated?: (data: { task: any; boardId: number }) => void;
    onTaskMoved?: (data: {
      taskId: number;
      task: any;
      boardId: number;
      oldColumnId?: number;
      newColumnId?: number;
      oldPosition?: number;
      newPosition?: number;
    }) => void;
    onTaskUpdated?: (data: {
      taskId: number;
      task: any;
      boardId: number;
      source?: string;
      taskCode?: string;
      newStatus?: string;
    }) => void;
    onTaskDeleted?: (data: { taskId: number; boardId: number }) => void;
    onListUpdated?: (data: {
      boardId: number;
      columnId?: number;
      column?: any;
      columns?: any[];
      action: 'update' | 'delete' | 'reorder';
    }) => void;
    onBulkUpdate?: (data: { boardId: number }) => void;
    onError?: (error: { message: string }) => void;
  }
): () => void {
  try {
    const socketInstance = getSocket();

    // Join board room
    socketInstance.emit('kanban:join_board', boardId);

    // Listen for join confirmation
    const onJoined = (data: { boardId: number }) => {
      if (data.boardId === boardId) {
        logger.debug(`Joined board ${boardId}`);
      }
    };

    // Listen for errors
    const onError = (error: { message: string }) => {
      logger.error('Kanban board error:', error);
      callbacks.onError?.(error);
    };

    // Map server events to callbacks
    const onTaskCreated = (data: { task: any; boardId: number }) => {
      if (data.boardId === boardId) {
        callbacks.onTaskCreated?.(data);
      }
    };

    const onTaskMoved = (data: {
      taskId: number;
      task: any;
      boardId: number;
      oldColumnId?: number;
      newColumnId?: number;
      oldPosition?: number;
      newPosition?: number;
    }) => {
      if (data.boardId === boardId) {
        callbacks.onTaskMoved?.(data);
      }
    };

    const onTaskUpdated = (data: {
      taskId: number;
      task: any;
      boardId: number;
      source?: string;
      taskCode?: string;
      newStatus?: string;
    }) => {
      if (data.boardId === boardId) {
        callbacks.onTaskUpdated?.(data);
      }
    };

    const onTaskDeleted = (data: { taskId: number; boardId: number }) => {
      if (data.boardId === boardId) {
        callbacks.onTaskDeleted?.(data);
      }
    };

    const onBulkUpdate = (data: { boardId: number }) => {
      if (data.boardId === boardId) {
        callbacks.onBulkUpdate?.(data);
      }
    };

    const onListUpdated = (data: {
      boardId: number;
      columnId?: number;
      column?: any;
      columns?: any[];
      action: 'update' | 'delete' | 'reorder';
    }) => {
      if (data.boardId === boardId) {
        callbacks.onListUpdated?.(data);
      }
    };

    // Register event listeners
    socketInstance.on('kanban:joined_board', onJoined);
    socketInstance.on('kanban:error', onError);
    socketInstance.on('kanban:task_created', onTaskCreated);
    socketInstance.on('kanban:task_moved', onTaskMoved);
    socketInstance.on('kanban:task_updated', onTaskUpdated);
    socketInstance.on('kanban:task_deleted', onTaskDeleted);
    socketInstance.on('kanban:list_updated', onListUpdated);
    socketInstance.on('kanban:bulk_update', onBulkUpdate);

    // Return cleanup function
    return () => {
      // Leave board room
      socketInstance.emit('kanban:leave_board', boardId);

      // Remove event listeners
      socketInstance.off('kanban:joined_board', onJoined);
      socketInstance.off('kanban:error', onError);
      socketInstance.off('kanban:task_created', onTaskCreated);
      socketInstance.off('kanban:task_moved', onTaskMoved);
      socketInstance.off('kanban:task_updated', onTaskUpdated);
      socketInstance.off('kanban:task_deleted', onTaskDeleted);
      socketInstance.off('kanban:list_updated', onListUpdated);
      socketInstance.off('kanban:bulk_update', onBulkUpdate);
    };
  } catch (error) {
    logger.error('Error subscribing to kanban board:', error);
    // Return no-op cleanup function if subscription fails
    return () => {};
  }
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

