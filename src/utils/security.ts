/**
 * Utilities de seguridad centralizadas
 * Asegura integridad de datos y manejo seguro de permisos
 */

import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'operator' | 'user';
export type Permission = 'read' | 'create' | 'update' | 'delete' | 'admin';

/**
 * Configuración de permisos por rol
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ['read', 'create', 'update', 'delete', 'admin'],
  operator: ['read', 'create', 'update'],
  user: ['read']
};

/**
 * Operaciones sensibles que requieren logging adicional
 */
export const SENSITIVE_OPERATIONS = [
  'user_management',
  'role_changes',
  'data_deletion',
  'bulk_operations',
  'financial_data',
  'export_data'
] as const;

export type SensitiveOperation = typeof SENSITIVE_OPERATIONS[number];

/**
 * Clase para manejo centralizado de seguridad
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private currentUser: any = null;
  private currentRole: UserRole | null = null;

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Inicializa el manager de seguridad con datos del usuario
   */
  async initialize(user: any): Promise<void> {
    this.currentUser = user;
    this.currentRole = await this.getUserRole(user.id);
  }

  /**
   * Obtiene el rol del usuario desde la base de datos
   */
  private async getUserRole(userId: string): Promise<UserRole> {
    try {
      // Intentar usar RPC primero
      const { data: roleData, error: rpcError } = await supabase.rpc('get_my_role');

      if (!rpcError && roleData) {
        return roleData as UserRole;
      }

      // Fallback a consulta directa
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!profileError && profileData?.role) {
        return profileData.role as UserRole;
      }

      // Rol por defecto
      return 'user';
    } catch (error) {
      console.warn('Error obteniendo rol del usuario:', error);
      return 'user';
    }
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: Permission): boolean {
    if (!this.currentRole) return false;

    const rolePermissions = ROLE_PERMISSIONS[this.currentRole];
    return rolePermissions.includes(permission);
  }

  /**
   * Verifica si el usuario puede realizar una operación
   */
  canPerformOperation(operation: string): boolean {
    switch (operation) {
      case 'create_product':
      case 'edit_product':
      case 'create_raw_material':
      case 'edit_raw_material':
        return this.hasPermission('create') || this.hasPermission('update');

      case 'delete_product':
      case 'delete_raw_material':
        return this.hasPermission('delete');

      case 'manage_users':
      case 'view_settings':
        return this.hasPermission('admin');

      case 'process_reception':
      case 'create_movement':
        return this.hasPermission('create');

      case 'view_financial':
        return this.hasPermission('read'); // Todos pueden ver finanzas básicas

      case 'export_data':
        return this.hasPermission('admin'); // Solo admins pueden exportar

      default:
        return this.hasPermission('read'); // Por defecto solo lectura
    }
  }

  /**
   * Sanitiza datos de entrada para prevenir inyecciones
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .trim()
        .replace(/[<>]/g, '') // Remover caracteres HTML básicos
        .replace(/javascript:/gi, '') // Remover javascript:
        .replace(/on\w+=/gi, ''); // Remover event handlers
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Solo permitir keys válidos (alfanuméricos y underscore)
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          sanitized[key] = this.sanitizeInput(value);
        }
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Valida datos antes de operaciones críticas
   */
  validateCriticalOperation(
    operation: SensitiveOperation,
    data: any
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Verificar permisos
    if (!this.canPerformOperation(operation)) {
      errors.push('No tienes permisos para realizar esta operación');
    }

    // Validaciones específicas por operación
    switch (operation) {
      case 'user_management':
        if (!this.hasPermission('admin')) {
          errors.push('Solo administradores pueden gestionar usuarios');
        }
        break;

      case 'role_changes':
        if (!this.hasPermission('admin')) {
          errors.push('Solo administradores pueden cambiar roles');
        }
        if (data.targetUserId === this.currentUser?.id) {
          errors.push('No puedes cambiar tu propio rol');
        }
        break;

      case 'data_deletion':
        if (!this.hasPermission('delete')) {
          errors.push('No tienes permisos para eliminar datos');
        }
        break;

      case 'bulk_operations':
        if (!this.hasPermission('admin') && data.count > 100) {
          errors.push('Operaciones masivas de más de 100 elementos requieren permisos de administrador');
        }
        break;

      case 'financial_data':
        if (!this.hasPermission('read')) {
          errors.push('No tienes permisos para ver datos financieros');
        }
        break;

      case 'export_data':
        if (!this.hasPermission('admin')) {
          errors.push('Solo administradores pueden exportar datos');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Registra operaciones sensibles para auditoría
   */
  async logSensitiveOperation(
    operation: SensitiveOperation,
    details: Record<string, any>
  ): Promise<void> {
    try {
      // En una implementación real, esto se guardaría en una tabla de auditoría
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: this.currentUser?.id,
        userRole: this.currentRole,
        operation,
        details: this.sanitizeInput(details),
        userAgent: navigator.userAgent,
        ip: 'hidden' // En producción se obtendría del servidor
      };

      // Log a consola en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.group('🔒 Operación Sensible Registrada');
        console.log('Operación:', operation);
        console.log('Usuario:', this.currentUser?.email);
        console.log('Rol:', this.currentRole);
        console.log('Detalles:', details);
        console.groupEnd();
      }

      // En producción, enviar a servicio de auditoría
      // await this.sendToAuditService(logEntry);

    } catch (error) {
      console.error('Error registrando operación sensible:', error);
    }
  }

  /**
   * Valida que los datos no contengan información sensible
   */
  validateDataSensitivity(data: any): { isSafe: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /api_key/i,
      /private/i,
      /credential/i
    ];

    const checkForSensitiveData = (obj: any, path: string = ''): void => {
      if (typeof obj === 'string') {
        sensitivePatterns.forEach(pattern => {
          if (pattern.test(obj) || pattern.test(path)) {
            warnings.push(`Posible información sensible detectada en: ${path}`);
          }
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          checkForSensitiveData(value, path ? `${path}.${key}` : key);
        });
      }
    };

    checkForSensitiveData(data);

    return {
      isSafe: warnings.length === 0,
      warnings
    };
  }

  /**
   * Getters para información del usuario actual
   */
  getCurrentUser() {
    return this.currentUser;
  }

  getCurrentRole(): UserRole | null {
    return this.currentRole;
  }

  isAdmin(): boolean {
    return this.currentRole === 'admin';
  }

  isOperator(): boolean {
    return this.currentRole === 'operator' || this.currentRole === 'admin';
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }
}

/**
 * Hook para usar el manager de seguridad en componentes React
 */
export const useSecurity = () => {
  const securityManager = SecurityManager.getInstance();

  return {
    hasPermission: (permission: Permission) => securityManager.hasPermission(permission),
    canPerform: (operation: string) => securityManager.canPerformOperation(operation),
    sanitize: (input: any) => securityManager.sanitizeInput(input),
    validateOperation: (operation: SensitiveOperation, data: any) =>
      securityManager.validateCriticalOperation(operation, data),
    logOperation: (operation: SensitiveOperation, details: Record<string, any>) =>
      securityManager.logSensitiveOperation(operation, details),
    getCurrentUser: () => securityManager.getCurrentUser(),
    getCurrentRole: () => securityManager.getCurrentRole(),
    isAdmin: () => securityManager.isAdmin(),
    isOperator: () => securityManager.isOperator(),
    isAuthenticated: () => securityManager.isAuthenticated()
  };
};

/**
 * Decorator para funciones que requieren permisos específicos
 */
export const requiresPermission = (permission: Permission) => {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const securityManager = SecurityManager.getInstance();

      if (!securityManager.hasPermission(permission)) {
        throw new Error(`Operación no autorizada. Se requiere permiso: ${permission}`);
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
};

/**
 * Constantes de seguridad
 */
export const SECURITY_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.xlsx', '.xls', '.csv', '.pdf'],
  MAX_BULK_OPERATIONS: 1000,
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 horas
  MAX_LOGIN_ATTEMPTS: 5,
  PASSWORD_MIN_LENGTH: 8
} as const;