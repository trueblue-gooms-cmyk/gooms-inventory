import { toast } from 'sonner';
import { useState, useCallback } from 'react';

export interface ValidationError {
  message: string;
  code?: string;
}

export interface ErrorState {
  [field: string]: string;
}

export class ErrorHandler {
  static validateRequired(value: any, fieldName: string): ValidationError | null {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { message: `${fieldName} es requerido` };
    }
    return null;
  }

  static validateEmail(email: string): ValidationError | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { message: 'Formato de email inválido' };
    }
    return null;
  }

  static validateNumber(value: any, fieldName: string, min?: number, max?: number): ValidationError | null {
    const num = Number(value);
    if (isNaN(num)) {
      return { message: `${fieldName} debe ser un número válido` };
    }
    if (min !== undefined && num < min) {
      return { message: `${fieldName} debe ser mayor o igual a ${min}` };
    }
    if (max !== undefined && num > max) {
      return { message: `${fieldName} debe ser menor o igual a ${max}` };
    }
    return null;
  }

  static validateDate(value: string, fieldName: string): ValidationError | null {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { message: `${fieldName} debe ser una fecha válida` };
    }
    return null;
  }

  static validateMinLength(value: string, minLength: number, fieldName: string): ValidationError | null {
    if (value.length < minLength) {
      return { message: `${fieldName} debe tener al menos ${minLength} caracteres` };
    }
    return null;
  }

  static showError(message: string, title?: string) {
    toast.error(title || 'Error', {
      description: message,
    });
  }

  static showSuccess(message: string, title?: string) {
    toast.success(title || 'Éxito', {
      description: message,
    });
  }

  static showWarning(message: string, title?: string) {
    toast.warning(title || 'Advertencia', {
      description: message,
    });
  }

  static handleSupabaseError(error: any): string {
    if (error?.code) {
      switch (error.code) {
        case '23505':
          return 'Este registro ya existe en el sistema';
        case '23503':
          return 'No se puede eliminar este registro porque está siendo usado por otros elementos';
        case '42501':
          return 'No tienes permisos para realizar esta acción';
        case 'PGRST116':
          return 'No se encontró el registro solicitado';
        default:
          return error.message || 'Ha ocurrido un error inesperado';
      }
    }
    return error?.message || 'Ha ocurrido un error inesperado';
  }
}

export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorState>({});
  const [isLoading, setIsLoading] = useState(false);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  const validateField = useCallback((
    field: string, 
    value: any, 
    validators: ((value: any) => ValidationError | null)[]
  ): boolean => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        setFieldError(field, error.message);
        return false;
      }
    }
    clearFieldError(field);
    return true;
  }, [setFieldError, clearFieldError]);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      const result = await operation();
      if (successMessage) {
        ErrorHandler.showSuccess(successMessage);
      }
      return result;
    } catch (error: any) {
      const errorMessage = ErrorHandler.handleSupabaseError(error);
      ErrorHandler.showError(errorMessage, `Error en ${context}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    errors,
    isLoading,
    clearErrors,
    clearFieldError,
    setFieldError,
    validateField,
    handleAsyncOperation
  };
}