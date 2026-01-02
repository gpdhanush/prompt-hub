import React, { Component, ErrorInfo, ReactNode } from 'react';
import { crashlyticsUtils } from '@/lib/firebase-crashlytics';
import { getCurrentUser } from '@/lib/auth';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Get current user for context
    const user = getCurrentUser();
    const userContext = user ? {
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
    } : {};

    // Prepare error context
    const errorContext = {
      component_stack: errorInfo.componentStack,
      error_boundary: true,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...userContext,
    };

    // Report to Crashlytics
    crashlyticsUtils.recordError(error, errorContext);

    // Also log to console for development
    console.error('🚨 React Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: errorContext,
    });

    // Log error event
    crashlyticsUtils.logEvent('react_error_boundary', {
      error_message: error.message,
      component_name: this.getComponentName(errorInfo.componentStack),
      has_user: !!user,
    });
  }

  private getComponentName(componentStack: string): string {
    try {
      // Extract component name from stack trace
      const lines = componentStack.split('\n');
      for (const line of lines) {
        if (line.includes(' in ')) {
          const match = line.match(/in (\w+)/);
          if (match) return match[1];
        }
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private handleReload = () => {
    crashlyticsUtils.logEvent('error_boundary_reload', {
      error_message: this.state.error?.message,
      user_initiated: true,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg border">
            <div className="text-center">
              <div className="text-6xl mb-4">😵</div>
              <h1 className="text-2xl font-bold text-destructive mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-6">
                An unexpected error occurred. This has been reported to our team.
              </p>

              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Reload Page
                </button>

                <button
                  onClick={() => window.history.back()}
                  className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Go Back
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;