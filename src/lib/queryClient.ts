import { QueryClient } from '@tanstack/react-query';
import { handleApiError } from './errorHandler';

/**
 * Optimized React Query client configuration
 * - Proper staleTime and cacheTime for better performance
 * - Disabled refetchOnWindowFocus for most queries
 * - Global error handling
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cache data for 10 minutes after it becomes unused
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Don't refetch on window focus by default (can be overridden per query)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default (can be overridden per query)
      refetchOnReconnect: false,
      // Don't refetch on mount if data exists
      refetchOnMount: true,
      // Retry failed requests once
      retry: 1,
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Global error handler
      onError: (error) => {
        handleApiError(error);
      },
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Global error handler for mutations
      onError: (error) => {
        handleApiError(error);
      },
    },
  },
});

// Expose QueryClient globally for logout function
if (typeof window !== 'undefined') {
  (window as any).__REACT_QUERY_CLIENT__ = queryClient;
}

export default queryClient;

