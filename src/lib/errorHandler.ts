import { AxiosError } from 'axios';
import { toast } from '@/hooks/use-toast';
import { logger } from './logger';

export interface ErrorToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

/**
 * Centralized error handler for API errors
 * Handles different error types and shows appropriate toast messages
 */
export function handleApiError(
  error: unknown,
  options: ErrorToastOptions = {}
): void {
  // Default options
  const {
    title = 'Error',
    description,
    variant = 'destructive',
    duration = 5000,
  } = options;

  let errorMessage = description;
  let errorTitle = title;

  // Handle Axios errors
  if (error instanceof AxiosError) {
    const response = error.response;
    const status = response?.status;
    const data = response?.data as any;

    // Extract error message from response
    if (data) {
      errorMessage = data.error || data.message || data.details || errorMessage || 'An unexpected error occurred';
    } else {
      errorMessage = errorMessage || error.message || 'Network error occurred';
    }

    // Customize title based on status code
    if (status) {
      switch (status) {
        case 400:
          errorTitle = 'Bad Request';
          break;
        case 401:
          errorTitle = 'Unauthorized';
          break;
        case 403:
          errorTitle = 'Forbidden';
          break;
        case 404:
          errorTitle = 'Not Found';
          break;
        case 422:
          errorTitle = 'Validation Error';
          break;
        case 429:
          errorTitle = 'Too Many Requests';
          errorMessage = 'Please wait a moment before trying again.';
          break;
        case 500:
          errorTitle = 'Server Error';
          errorMessage = 'An internal server error occurred. Please try again later.';
          break;
        case 503:
          errorTitle = 'Service Unavailable';
          errorMessage = 'The service is temporarily unavailable. Please try again later.';
          break;
        default:
          errorTitle = title;
      }
    }

    // Log error for debugging
    logger.error('API Error:', {
      status,
      message: errorMessage,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
    });
  } else if (error instanceof Error) {
    // Handle generic errors
    errorMessage = errorMessage || error.message || 'An unexpected error occurred';
    logger.error('Error:', error);
  } else {
    // Handle unknown error types
    errorMessage = errorMessage || 'An unexpected error occurred';
    logger.error('Unknown error:', error);
  }

  // Show toast notification
  toast({
    title: errorTitle,
    description: errorMessage,
    variant,
    duration,
  });
}

/**
 * Handle form validation errors
 */
export function handleValidationError(errors: Record<string, string[]>): void {
  const firstError = Object.values(errors)[0]?.[0];
  if (firstError) {
    toast({
      title: 'Validation Error',
      description: firstError,
      variant: 'destructive',
      duration: 5000,
    });
  }
}

/**
 * Handle success messages
 */
export function handleSuccess(message: string, title = 'Success'): void {
  toast({
    title,
    description: message,
    variant: 'default',
    duration: 3000,
  });
}

