import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureStorageWithCache } from '@/lib/secureStorage';
import { toast } from '@/hooks/use-toast';

interface UseIdleTimeoutOptions {
  timeoutMinutes: number;
  onIdle?: () => void;
  enabled?: boolean;
}

/**
 * Hook to handle idle timeout and auto-logout
 * Monitors user activity and logs out when idle for the specified duration
 */
export function useIdleTimeout({ 
  timeoutMinutes, 
  onIdle,
  enabled = true 
}: UseIdleTimeoutOptions) {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  const logout = useCallback(async () => {
    try {
      // Try to call backend logout API to revoke refresh token
      try {
        const { authApi } = await import('@/lib/api');
        const refreshToken = await secureStorageWithCache.getItem('refresh_token');
        if (refreshToken) {
          await authApi.logout(refreshToken);
        }
      } catch (apiError) {
        // Log but don't throw - we still want to clear frontend state
        console.warn('Logout API call failed during idle timeout (continuing):', apiError);
      }
      
      // Clear secure storage
      await secureStorageWithCache.removeItem('auth_token');
      await secureStorageWithCache.removeItem('user');
      await secureStorageWithCache.removeItem('remember_me');
      await secureStorageWithCache.removeItem('refresh_token');
      
      // Clear any other auth-related data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
      
      // Call custom onIdle handler if provided
      if (onIdle) {
        onIdle();
      } else {
        // Default: navigate to login
        navigate('/login');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      navigate('/login');
    }
  }, [navigate, onIdle]);

  const resetTimer = useCallback(() => {
    // Clear existing timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Reset warning flag
    warningShownRef.current = false;
    
    // Update last activity time
    lastActivityRef.current = Date.now();
    
    if (!enabled || timeoutMinutes <= 0) {
      return;
    }
    
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningTime = timeoutMs - (5 * 60 * 1000); // Show warning 5 minutes before timeout
    
    // Set warning timer (5 minutes before timeout)
    if (warningTime > 0) {
      setTimeout(() => {
        if (!warningShownRef.current && Date.now() - lastActivityRef.current >= warningTime) {
          warningShownRef.current = true;
          toast({
            title: "Session Expiring Soon",
            description: `You will be logged out in 5 minutes due to inactivity.`,
            variant: "default",
          });
        }
      }, warningTime);
    }
    
    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= timeoutMs) {
        logout();
      }
    }, timeoutMs);
  }, [timeoutMinutes, enabled, logout]);

  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) {
      return;
    }

    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ];

    // Add event listeners
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer, enabled, timeoutMinutes]);

  // Reset timer when timeoutMinutes changes
  useEffect(() => {
    resetTimer();
  }, [timeoutMinutes, resetTimer]);

  return {
    resetTimer,
    logout,
  };
}
