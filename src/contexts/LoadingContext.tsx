import { createContext, useContext, useState, ReactNode, useRef, useCallback } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const loadingCountRef = useRef(0);

  const setLoading = useCallback((loading: boolean) => {
    if (loading) {
      loadingCountRef.current += 1;
      setIsLoading(true);
    } else {
      loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
      if (loadingCountRef.current === 0) {
        setIsLoading(false);
      }
    }
  }, []);

  const startLoading = useCallback(() => setLoading(true), [setLoading]);
  const stopLoading = useCallback(() => setLoading(false), [setLoading]);

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, startLoading, stopLoading }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="relative flex flex-col items-center gap-6">
            {/* Modern Spinner */}
            <div className="relative w-20 h-20">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/50 animate-spin" 
                   style={{ animationDuration: '1s' }} />
              
              {/* Middle pulsing ring */}
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-primary border-l-primary/50 animate-spin" 
                   style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
              
              {/* Inner gradient dot */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/40 animate-pulse" />
              
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
            </div>

            {/* Loading text with animation */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent animate-pulse">
                Loading
              </span>
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>

            {/* Progress bar effect */}
            <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary via-primary/60 to-primary rounded-full animate-progress" />
            </div>
          </div>

          {/* Add custom animation styles */}
          <style>{`
            @keyframes progress {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(400%);
              }
            }
            .animate-progress {
              animation: progress 1.5s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
