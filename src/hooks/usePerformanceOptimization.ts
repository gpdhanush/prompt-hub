import { useMemo, useCallback, useRef } from 'react';

/**
 * Hook for performance optimizations in authenticated SPA
 * Helps prevent unnecessary re-renders and API calls
 */

// Memoize expensive computations
export function useMemoizedValue<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}

// Stable callback reference to prevent child re-renders
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

// Prevent unnecessary re-renders of heavy components
export function useRenderOptimization(deps: React.DependencyList = []) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  // Log excessive re-renders in development
  if (process.env.NODE_ENV === 'development' && renderCount.current > 10) {
    console.warn('Component re-rendered excessively:', renderCount.current, 'times');
  }

  return useMemo(() => ({
    renderCount: renderCount.current,
    deps
  }), deps);
}

// Cache API responses to prevent duplicate calls
export function useApiCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000) { // 5 minutes default
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  return useCallback(async (): Promise<T> => {
    const now = Date.now();
    const cached = cache.current.get(key);

    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }

    // Fetch new data
    const data = await fetcher();
    cache.current.set(key, { data, timestamp: now });

    return data;
  }, [key, fetcher, ttl]);
}

// Lazy load heavy components only when needed
export function useLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);

  const loadComponent = useCallback(async () => {
    if (Component || loading) return;

    setLoading(true);
    try {
      const module = await importFn();
      setComponent(() => module.default);
    } catch (error) {
      console.error('Failed to load component:', error);
    } finally {
      setLoading(false);
    }
  }, [Component, loading, importFn]);

  // Auto-load when component becomes visible (using Intersection Observer)
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node || Component || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadComponent();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [Component, loading, loadComponent]);

  const LazyComponent = Component ? Component : () => fallback || null;

  return { LazyComponent, ref, loading, loaded: !!Component };
}

// Debounce expensive operations
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [callback, delay]) as T;
}

// Throttle function calls
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      return callback(...args);
    }
  }, [callback, delay]) as T;
}

// Track component performance
export function usePerformanceTracker(componentName: string) {
  const mountTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  renderCount.current += 1;

  React.useEffect(() => {
    const unmountTime = Date.now();
    const mountDuration = unmountTime - mountTime.current;

    // Log performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${componentName} Performance:`, {
        renderCount: renderCount.current,
        mountDuration: `${mountDuration}ms`,
        averageRenderTime: mountDuration / renderCount.current
      });
    }

    return () => {
      const totalDuration = Date.now() - mountTime.current;
      console.log(`🗑️ ${componentName} unmounted after ${totalDuration}ms`);
    };
  });

  return {
    renderCount: renderCount.current,
    mountTime: mountTime.current
  };
}
