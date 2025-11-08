import { AxiosError } from 'axios';
import { ApiError } from '../api/types';

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AI_PROCESSING_ERROR = 'AI_PROCESSING_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ProcessedError {
  type: ErrorType;
  message: string;
  originalError: any;
  retryable: boolean;
}

export class GlobalErrorHandler {
  /**
   * Process and categorize errors for consistent handling
   */
  static processError(error: any, context?: string): ProcessedError {
    let processedError: ProcessedError = {
      type: ErrorType.UNKNOWN_ERROR,
      message: 'Something went wrong. Please try again.',
      originalError: error,
      retryable: true,
    };

    // Handle Axios errors
    if (error.isAxiosError) {
      const axiosError = error as AxiosError<ApiError>;
      
      if (!axiosError.response) {
        // Network error
        processedError = {
          type: ErrorType.NETWORK_ERROR,
          message: 'Network connection issue. Please check your internet connection.',
          originalError: error,
          retryable: true,
        };
      } else {
        const status = axiosError.response.status;
        const errorData = axiosError.response.data;

        switch (status) {
          case 401:
            processedError = {
              type: ErrorType.AUTH_ERROR,
              message: 'Authentication failed. Please log in again.',
              originalError: error,
              retryable: false,
            };
            break;

          case 400:
            processedError = {
              type: ErrorType.VALIDATION_ERROR,
              message: errorData?.message || 'Invalid request. Please check your input.',
              originalError: error,
              retryable: false,
            };
            break;

          case 422:
            if (errorData?.error === 'AI_PROCESSING_ERROR') {
              processedError = {
                type: ErrorType.AI_PROCESSING_ERROR,
                message: 'Processing failed. Please try with a different image or video.',
                originalError: error,
                retryable: errorData?.retry_possible ?? true,
              };
            } else {
              processedError = {
                type: ErrorType.VALIDATION_ERROR,
                message: errorData?.message || 'Invalid data provided.',
                originalError: error,
                retryable: false,
              };
            }
            break;

          case 500:
          case 502:
          case 503:
          case 504:
            processedError = {
              type: ErrorType.SERVER_ERROR,
              message: 'Server error. Please try again later.',
              originalError: error,
              retryable: true,
            };
            break;

          default:
            processedError = {
              type: ErrorType.UNKNOWN_ERROR,
              message: errorData?.message || 'An unexpected error occurred.',
              originalError: error,
              retryable: true,
            };
        }
      }
    }

    // Log error in development
    if (__DEV__) {
      console.error(`🚨 Error in ${context || 'Unknown context'}:`, {
        type: processedError.type,
        message: processedError.message,
        originalError: error,
      });
    }

    return processedError;
  }

  /**
   * Handle error with appropriate user feedback
   * This method should be called from UI components
   */
  static handle(error: any, context?: string): ProcessedError {
    const processedError = this.processError(error, context);
    
    // Here you would typically show a toast, alert, or update UI state
    // For now, we'll just return the processed error for the component to handle
    
    return processedError;
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: any): boolean {
    const processedError = this.processError(error);
    return processedError.retryable;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any): string {
    const processedError = this.processError(error);
    return processedError.message;
  }
}

export default GlobalErrorHandler;