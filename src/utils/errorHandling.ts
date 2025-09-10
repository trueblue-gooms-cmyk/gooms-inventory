import { toast } from 'sonner';
import { PostgrestError } from '@supabase/supabase-js';
import { useState } from 'react';

export interface AppError {
  code: string;
  message: string;
  details?: string;
  userMessage: string;
}

export class ErrorHandler {
  static handleSupabaseError(error: PostgrestError | null, context: string = ''): AppError {
    if (!error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: 'Error desconocido',
        userMessage: 'Ha ocurrido un error inesperado'
      };
    }

    // Mapear códigos de error de PostgreSQL a mensajes útiles
    const errorMappings: Record<string, string> = {
      '23505': 'Ya existe un registro con estos datos únicos',
      '23503': 'No se puede completar la operación por dependencias',
      '23514': 'Los datos no cumplen con las restricciones requeridas',
      '42P01': 'La tabla solicitada no existe',
      '42703': 'La columna especificada no existe',
      'PGRST116': 'No se encontraron registros que coincidan',
      'PGRST301': 'No tienes permisos para realizar esta acción'
    };

    // Mensajes específicos por contexto
    const contextMessages: Record<string, Record<string, string>> = {
      'products': {
        '23505': 'Ya existe un producto con este SKU. Usa un código diferente.',
        '23503': 'No se puede eliminar este producto porque tiene dependencias.',
      },
      'batches': {
        '23505': 'Ya existe un lote con este número. Usa un número diferente.',
        'general': 'Error al guardar el lote. Verifica que todos los campos estén completos.',
      },
      'purchases': {
        '23503': 'No se puede procesar la orden. Verifica proveedor y materias primas.',
        'general': 'Error procesando la orden de compra.',
      },
      'users': {
        'PGRST301': 'No tienes permisos suficientes para esta acción.',
        'general': 'Error en la gestión de usuarios.',
      }
    };

    const userMessage = contextMessages[context]?.[error.code] || 
                       contextMessages[context]?.['general'] ||
                       errorMappings[error.code] || 
                       `Error en ${context}: ${error.message}`;

    return {
      code: error.code,
      message: error.message,
      details: error.details,
      userMessage
    };
  }

  static showError(error: AppError | string, duration: number = 5000) {
    const message = typeof error === 'string' ? error : error.userMessage;
    toast.error(message, { duration });
  }

  static showSuccess(message: string, duration: number = 3000) {
    toast.success(message, { duration });
  }

  static showWarning(message: string, duration: number = 4000) {
    toast.warning(message, { duration });
  }

  static showInfo(message: string, duration: number = 3000) {
    toast.info(message, { duration });
  }

  // Wrapper para operaciones async con manejo de errores
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context: string,
    successMessage?: string
  ): Promise<T | null> {
    try {
      const result = await operation();
      if (successMessage) {
        this.showSuccess(successMessage);
      }
      return result;
    } catch (error: any) {
      console.error(`Error in ${context}:`, error);
      
      if (error.code) {
        // Es un error de Supabase
        const appError = this.handleSupabaseError(error, context);
        this.showError(appError);
      } else {
        // Error general
        this.showError(`Error inesperado en ${context}`);
      }
      
      return null;
    }
  }

  // Validaciones de formularios
  static validateRequired(value: any, fieldName: string): string | null {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} es requerido`;
    }
    return null;
  }

  static validateEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Formato de email inválido';
    }
    return null;
  }

  static validateSKU(sku: string): string | null {
    if (!sku || sku.length < 3) {
      return 'SKU debe tener al menos 3 caracteres';
    }
    
    const skuRegex = /^[A-Z0-9-]+$/;
    if (!skuRegex.test(sku.toUpperCase())) {
      return 'SKU solo puede contener letras, números y guiones';
    }
    
    return null;
  }

  static validateNumber(value: any, fieldName: string, min?: number, max?: number): string | null {
    const num = Number(value);
    
    if (isNaN(num)) {
      return `${fieldName} debe ser un número válido`;
    }
    
    if (min !== undefined && num < min) {
      return `${fieldName} debe ser mayor o igual a ${min}`;
    }
    
    if (max !== undefined && num > max) {
      return `${fieldName} debe ser menor o igual a ${max}`;
    }
    
    return null;
  }

  static validateDate(value: string, fieldName: string): string | null {
    if (!value) {
      return `${fieldName} es requerido`;
    }
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${fieldName} debe ser una fecha válida`;
    }
    
    return null;
  }
}

// Hook para usar manejo de errores en componentes
export function useErrorHandler() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (fieldName: string, value: any, validations: Array<(value: any) => string | null>) => {
    const errorMessage = validations.find(validation => {
      const result = validation(value);
      return result !== null;
    });
    
    const error = errorMessage ? errorMessage(value) : null;
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: error || ''
    }));

    return !error;
  };

  const clearErrors = () => setErrors({});
  
  const clearFieldError = (fieldName: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  };

  const handleAsyncOperation = async <T,>(
    operation: () => Promise<T>,
    context: string,
    successMessage?: string
  ) => {
    setIsLoading(true);
    try {
      const result = await ErrorHandler.handleAsync(operation, context, successMessage);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    errors,
    isLoading,
    validateField,
    clearErrors,
    clearFieldError,
    handleAsyncOperation
  };
}