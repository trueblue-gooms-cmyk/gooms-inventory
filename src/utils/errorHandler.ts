/**
 * Sistema centralizado de manejo de errores
 * Unifica el tratamiento de errores en toda la aplicación
 */

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
  timestamp: Date;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Procesa un error y retorna un objeto de error normalizado
   */
  processError(error: unknown, context?: Record<string, unknown>): AppError {
    let appError: AppError;

    if (error instanceof Error) {
      appError = this.mapErrorToAppError(error, context);
    } else if (typeof error === 'string') {
      appError = {
        code: 'GENERIC_ERROR',
        message: error,
        userMessage: 'Ha ocurrido un error inesperado',
        severity: 'medium',
        context,
        timestamp: new Date()
      };
    } else {
      appError = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error occurred',
        userMessage: 'Ha ocurrido un error desconocido',
        severity: 'medium',
        context,
        timestamp: new Date()
      };
    }

    // Log del error
    this.logError(appError);

    return appError;
  }

  /**
   * Mapea errores específicos a errores de aplicación
   */
  private mapErrorToAppError(error: Error, context?: Record<string, unknown>): AppError {
    // Errores de Supabase
    if (error.message.includes('duplicate key')) {
      return {
        code: 'DUPLICATE_KEY',
        message: error.message,
        userMessage: 'Este elemento ya existe en el sistema',
        severity: 'medium',
        context,
        timestamp: new Date()
      };
    }

    if (error.message.includes('Foreign key')) {
      return {
        code: 'FOREIGN_KEY_VIOLATION',
        message: error.message,
        userMessage: 'No se puede eliminar porque está siendo usado por otros elementos',
        severity: 'high',
        context,
        timestamp: new Date()
      };
    }

    if (error.message.includes('JWT')) {
      return {
        code: 'AUTH_ERROR',
        message: error.message,
        userMessage: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo',
        severity: 'high',
        context,
        timestamp: new Date()
      };
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: 'Error de conexión. Verifica tu conexión a internet',
        severity: 'high',
        context,
        timestamp: new Date()
      };
    }

    // Errores de validación
    if (error.message.includes('required') || error.message.includes('validation')) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message,
        userMessage: 'Por favor, verifica que todos los campos estén correctamente completados',
        severity: 'low',
        context,
        timestamp: new Date()
      };
    }

    // Error genérico
    return {
      code: 'GENERIC_ERROR',
      message: error.message,
      userMessage: 'Ha ocurrido un error inesperado',
      severity: 'medium',
      context,
      timestamp: new Date()
    };
  }

  /**
   * Log del error (en producción se enviaría a un servicio de logging)
   */
  private logError(error: AppError): void {
    this.errorLog.push(error);

    // En desarrollo, log a consola
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error [${error.severity.toUpperCase()}] - ${error.code}`);
      console.error('Message:', error.message);
      console.error('User Message:', error.userMessage);
      if (error.context) {
        console.error('Context:', error.context);
      }
      console.error('Timestamp:', error.timestamp);
      console.groupEnd();
    }

    // En producción, enviar a servicio de logging
    // this.sendToLoggingService(error);
  }

  /**
   * Obtiene errores recientes para debugging
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Limpia el log de errores
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

/**
 * Hook para manejo de errores en componentes React
 */
export const useErrorHandler = () => {
  const errorHandler = ErrorHandler.getInstance();

  const handleError = (error: unknown, context?: Record<string, unknown>) => {
    return errorHandler.processError(error, context);
  };

  const handleAsyncError = async <T>(
    asyncFn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<{ data?: T; error?: AppError }> => {
    try {
      const data = await asyncFn();
      return { data };
    } catch (error) {
      const appError = handleError(error, context);
      return { error: appError };
    }
  };

  return {
    handleError,
    handleAsyncError,
    getRecentErrors: () => errorHandler.getRecentErrors(),
    clearErrors: () => errorHandler.clearErrorLog()
  };
};

/**
 * Utility para manejo de errores en operaciones de Supabase
 */
export const handleSupabaseError = (error: unknown, operation: string = 'operación') => {
  const errorHandler = ErrorHandler.getInstance();

  return errorHandler.processError(error, {
    operation,
    provider: 'supabase'
  });
};

/**
 * Tipos de errores comunes predefinidos
 */
export const CommonErrors = {
  NETWORK_UNAVAILABLE: {
    code: 'NETWORK_UNAVAILABLE',
    userMessage: 'Sin conexión a internet. Algunas funcionalidades pueden no estar disponibles.',
    severity: 'high' as const
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    userMessage: 'No tienes permisos para realizar esta acción.',
    severity: 'high' as const
  },
  DATA_NOT_FOUND: {
    code: 'DATA_NOT_FOUND',
    userMessage: 'No se encontraron los datos solicitados.',
    severity: 'medium' as const
  },
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    userMessage: 'Los datos ingresados no son válidos.',
    severity: 'low' as const
  }
} as const;