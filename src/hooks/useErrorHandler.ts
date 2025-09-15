import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  retryable?: boolean;
}

interface RetryableOperation<T> {
  operation: () => Promise<T>;
  maxRetries?: number;
  delay?: number;
  backoffMultiplier?: number;
}

export const useAdvancedErrorHandler = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Enhanced error handling with retry logic
  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    const { showToast = true, logError = true } = options;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation();
      setRetryCount(0);
      return result;
    } catch (err: unknown) {
      const errorMessage = err.message || 'Ha ocurrido un error inesperado';
      
      if (logError) {
        console.error('Operation failed:', err);
      }
      
      setError(errorMessage);
      
      if (showToast) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Retry mechanism with exponential backoff
  const executeWithRetry = useCallback(async <T>(
    { operation, maxRetries = 3, delay = 1000, backoffMultiplier = 2 }: RetryableOperation<T>
  ): Promise<T | null> => {
    let currentDelay = delay;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        const result = await operation();
        setRetryCount(0);
        return result;
      } catch (err: unknown) {
        if (attempt === maxRetries) {
          // Last attempt failed
          const errorMessage = `Operación falló después de ${maxRetries + 1} intentos: ${err.message}`;
          setError(errorMessage);
          
          toast({
            title: "Error persistente",
            description: errorMessage,
            variant: "destructive",
          });
          
          return null;
        }
        
        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= backoffMultiplier;
        }
      }
    }
    
    return null;
  }, [toast]);

  // Network-aware error handling
  const handleNetworkOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    fallbackData?: T
  ): Promise<T | null> => {
    if (!navigator.onLine) {
      const message = 'Sin conexión a internet. Usando datos guardados localmente.';
      
      toast({
        title: "Modo offline",
        description: message,
        variant: "default",
      });
      
      return fallbackData || null;
    }

    return handleAsyncOperation(operation, { retryable: true });
  }, [handleAsyncOperation, toast]);

  // Auto-recovery for authentication errors
  const handleAuthError = useCallback(async (error: unknown) => {
    if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      toast({
        title: "Sesión expirada",
        description: "Redirigiendo al login...",
        variant: "destructive",
      });
      
      // Clear any cached auth data
      localStorage.removeItem('supabase.auth.token');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
      return true; // Indicates auth error was handled
    }
    
    return false;
  }, [toast]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    isLoading,
    error,
    retryCount,
    handleAsyncOperation,
    executeWithRetry,
    handleNetworkOperation,
    handleAuthError,
    clearError
  };
};

// Global error boundary helper
export const logGlobalError = (error: Error, errorInfo?: unknown) => {
  console.error('Global error caught:', error, errorInfo);
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry, LogRocket, etc.
    // Sentry.captureException(error, { extra: errorInfo });
  }
};