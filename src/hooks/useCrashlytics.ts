import { useEffect } from 'react';
import { crashlyticsUtils } from '@/lib/firebase-crashlytics';
import { getCurrentUser } from '@/lib/auth';

/**
 * Hook to integrate Firebase Crashlytics with user authentication and navigation
 * Uses window.location instead of useLocation to avoid router context issues
 */
export function useCrashlytics() {
  // Use window.location for navigation tracking to avoid router context issues
  const getCurrentPath = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search + window.location.hash;
    }
    return '';
  };

  // Set user context when authenticated
  useEffect(() => {
    const user = getCurrentUser();

    if (user) {
      // Set user ID for crash reports
      crashlyticsUtils.setUser(user.id, {
        email: user.email,
        role: user.role,
        department: user.department || 'Unknown',
      });

      // Log successful authentication
      crashlyticsUtils.logEvent('user_authenticated', {
        user_id: user.id,
        role: user.role,
        login_time: new Date().toISOString(),
      });
    }
  }, []);

  // Track navigation and page views using window.location
  useEffect(() => {
    const trackNavigation = () => {
      const currentPath = getCurrentPath();
      const previousPath = sessionStorage.getItem('lastPath');

      if (previousPath && previousPath !== currentPath) {
        const prevPathOnly = previousPath.split('?')[0].split('#')[0];
        const currPathOnly = currentPath.split('?')[0].split('#')[0];
        crashlyticsUtils.logNavigation(prevPathOnly, currPathOnly);
      }

      sessionStorage.setItem('lastPath', currentPath);

      // Track page view
      crashlyticsUtils.logEvent('page_view', {
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        full_url: currentPath,
        timestamp: Date.now(),
      });
    };

    // Track initial page load
    trackNavigation();

    // Listen for navigation changes (simplified approach)
    const handlePopState = () => trackNavigation();
    const handlePushState = () => setTimeout(trackNavigation, 0); // Delay to allow state to update

    // Override history methods to track navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handlePushState();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handlePushState();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  return {
    // Expose crashlytics utilities for manual use
    logError: crashlyticsUtils.recordError,
    logEvent: crashlyticsUtils.logEvent,
    logPerformance: crashlyticsUtils.logPerformance,
    logUserAction: crashlyticsUtils.logUserAction,
    logApiError: crashlyticsUtils.logApiError,
  };
}
