/**
 * Zustand store for Kanban state management
 * Handles real-time updates via Socket.IO
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface KanbanTask {
  id: number;
  board_id: number;
  column_id: number;
  task_code: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: string;
  position: number;
  assigned_to?: number;
  assigned_to_name?: string;
  due_date?: string;
  tags?: any;
  github_repo?: string;
  last_commit_hash?: string;
  last_commit_message?: string;
  auto_updated?: boolean;
  is_locked?: boolean;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: number;
  board_id: number;
  name: string;
  status: string;
  position: number;
  tasks: KanbanTask[];
}

export interface KanbanBoard {
  id: number;
  name: string;
  description?: string;
  project_id?: number;
  project_name?: string;
  is_active: boolean;
  columns: KanbanColumn[];
  created_by: number;
  created_by_name?: string;
  updated_by?: number;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface KanbanState {
  // Board data
  boards: Record<number, KanbanBoard>;
  currentBoardId: number | null;
  
  // Loading states
  isLoading: boolean;
  isMovingTask: boolean;
  
  // Actions
  setBoard: (board: KanbanBoard) => void;
  updateBoard: (boardId: number, updates: Partial<KanbanBoard>) => void;
  setCurrentBoard: (boardId: number | null) => void;
  
  // Task actions
  addTask: (boardId: number, columnId: number, task: KanbanTask) => void;
  updateTask: (boardId: number, taskId: number, updates: Partial<KanbanTask>) => void;
  moveTask: (boardId: number, taskId: number, newColumnId: number, newPosition: number) => void;
  removeTask: (boardId: number, taskId: number) => void;
  
  // Column actions
  updateColumn: (boardId: number, columnId: number, updates: Partial<KanbanColumn>) => void;
  
  // Bulk update
  bulkUpdate: (boardId: number, updates: {
    tasks?: Array<{ id: number; updates: Partial<KanbanTask> }>;
    columns?: Array<{ id: number; updates: Partial<KanbanColumn> }>;
  }) => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setMovingTask: (moving: boolean) => void;
  
  // Clear board
  clearBoard: (boardId: number) => void;
  clearAll: () => void;
}

export const useKanbanStore = create<KanbanState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    boards: {},
    currentBoardId: null,
    isLoading: false,
    isMovingTask: false,

    // Set board
    setBoard: (board: KanbanBoard) => {
      set((state) => ({
        boards: {
          ...state.boards,
          [board.id]: board,
        },
        currentBoardId: board.id,
      }));
    },

    // Update board
    updateBoard: (boardId: number, updates: Partial<KanbanBoard>) => {
      set((state) => {
        const board = state.boards[boardId];
        if (!board) return state;

        return {
          boards: {
            ...state.boards,
            [boardId]: {
              ...board,
              ...updates,
            },
          },
        };
      });
    },

    // Set current board
    setCurrentBoard: (boardId: number | null) => {
      set({ currentBoardId: boardId });
    },

    // Add task
    addTask: (boardId: number, columnId: number, task: KanbanTask) => {
      set((state) => {
        const board = state.boards[boardId];
        if (!board) return state;

        const columns = board.columns.map((col) => {
          if (col.id === columnId) {
            return {
              ...col,
              tasks: [...col.tasks, task].sort((a, b) => a.position - b.position),
            };
          }
          return col;
        });

        return {
          boards: {
            ...state.boards,
            [boardId]: {
              ...board,
              columns,
            },
          },
        };
      });
    },

    // Update task
    updateTask: (boardId: number, taskId: number, updates: Partial<KanbanTask>) => {
      set((state) => {
        const board = state.boards[boardId];
        if (!board) return state;

        const columns = board.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task.id === taskId ? { ...task, ...updates } : task
          ),
        }));

        return {
          boards: {
            ...state.boards,
            [boardId]: {
              ...board,
              columns,
            },
          },
        };
      });
    },

    // Move task
    moveTask: (boardId: number, taskId: number, newColumnId: number, newPosition: number) => {
      set((state) => {
        const board = state.boards[boardId];
        if (!board) return state;

        let taskToMove: KanbanTask | null = null;
        const oldColumnId: number | null = null;

        // Find and remove task from old column
        const columns = board.columns.map((col) => {
          const taskIndex = col.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex !== -1) {
            taskToMove = col.tasks[taskIndex];
            return {
              ...col,
              tasks: col.tasks.filter((t) => t.id !== taskId),
            };
          }
          return col;
        });

        if (!taskToMove) return state;

        // Add task to new column at new position
        const updatedColumns = columns.map((col) => {
          if (col.id === newColumnId) {
            const newTasks = [...col.tasks];
            newTasks.splice(newPosition, 0, {
              ...taskToMove!,
              column_id: newColumnId,
              position: newPosition,
            });

            // Reorder tasks
            const reorderedTasks = newTasks.map((task, index) => ({
              ...task,
              position: index,
            }));

            return {
              ...col,
              tasks: reorderedTasks,
            };
          }
          return col;
        });

        return {
          boards: {
            ...state.boards,
            [boardId]: {
              ...board,
              columns: updatedColumns,
            },
          },
        };
      });
    },

    // Remove task
    removeTask: (boardId: number, taskId: number) => {
      set((state) => {
        const board = state.boards[boardId];
        if (!board) return state;

        const columns = board.columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }));

        return {
          boards: {
            ...state.boards,
            [boardId]: {
              ...board,
              columns,
            },
          },
        };
      });
    },

    // Update column
    updateColumn: (boardId: number, columnId: number, updates: Partial<KanbanColumn>) => {
      set((state) => {
        const board = state.boards[boardId];
        if (!board) return state;

        const columns = board.columns.map((col) =>
          col.id === columnId ? { ...col, ...updates } : col
        );

        return {
          boards: {
            ...state.boards,
            [boardId]: {
              ...board,
              columns,
            },
          },
        };
      });
    },

    // Bulk update
    bulkUpdate: (boardId: number, updates: {
      tasks?: Array<{ id: number; updates: Partial<KanbanTask> }>;
      columns?: Array<{ id: number; updates: Partial<KanbanColumn> }>;
    }) => {
      set((state) => {
        const board = state.boards[boardId];
        if (!board) return state;

        let columns = [...board.columns];

        // Update tasks
        if (updates.tasks) {
          columns = columns.map((col) => ({
            ...col,
            tasks: col.tasks.map((task) => {
              const taskUpdate = updates.tasks!.find((tu) => tu.id === task.id);
              return taskUpdate ? { ...task, ...taskUpdate.updates } : task;
            }),
          }));
        }

        // Update columns
        if (updates.columns) {
          columns = columns.map((col) => {
            const colUpdate = updates.columns!.find((cu) => cu.id === col.id);
            return colUpdate ? { ...col, ...colUpdate.updates } : col;
          });
        }

        return {
          boards: {
            ...state.boards,
            [boardId]: {
              ...board,
              columns,
            },
          },
        };
      });
    },

    // Set loading
    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    // Set moving task
    setMovingTask: (moving: boolean) => {
      set({ isMovingTask: moving });
    },

    // Clear board
    clearBoard: (boardId: number) => {
      set((state) => {
        const { [boardId]: _, ...rest } = state.boards;
        return {
          boards: rest,
          currentBoardId: state.currentBoardId === boardId ? null : state.currentBoardId,
        };
      });
    },

    // Clear all
    clearAll: () => {
      set({
        boards: {},
        currentBoardId: null,
        isLoading: false,
        isMovingTask: false,
      });
    },
  }))
);

