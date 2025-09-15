/**
 * Validadores centralizados para toda la aplicación
 * Elimina validaciones duplicadas encontradas en Products, RawMaterials, etc.
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  field?: string;
}

export interface ValidationRule<T = Record<string, unknown>> {
  field: keyof T;
  rules: Array<(value: unknown, data?: T) => ValidationResult>;
}

/**
 * Validadores básicos
 */
export const validators = {
  required: (message: string = 'Este campo es requerido') =>
    (value: unknown): ValidationResult => ({
      isValid: value !== null && value !== undefined && value !== '',
      message: value === null || value === undefined || value === '' ? message : undefined
    }),

  minLength: (min: number, message?: string) =>
    (value: string): ValidationResult => ({
      isValid: !value || value.length >= min,
      message: value && value.length < min ?
        (message || `Debe tener al menos ${min} caracteres`) : undefined
    }),

  maxLength: (max: number, message?: string) =>
    (value: string): ValidationResult => ({
      isValid: !value || value.length <= max,
      message: value && value.length > max ?
        (message || `No puede tener más de ${max} caracteres`) : undefined
    }),

  email: (message: string = 'Email inválido') =>
    (value: string): ValidationResult => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        isValid: !value || emailRegex.test(value),
        message: value && !emailRegex.test(value) ? message : undefined
      };
    },

  numeric: (message: string = 'Debe ser un número válido') =>
    (value: unknown): ValidationResult => ({
      isValid: value === '' || value === null || !isNaN(Number(value)),
      message: value !== '' && value !== null && isNaN(Number(value)) ? message : undefined
    }),

  positiveNumber: (message: string = 'Debe ser un número positivo') =>
    (value: unknown): ValidationResult => {
      const num = Number(value);
      return {
        isValid: value === '' || value === null || (!isNaN(num) && num >= 0),
        message: value !== '' && value !== null && (isNaN(num) || num < 0) ? message : undefined
      };
    },

  integer: (message: string = 'Debe ser un número entero') =>
    (value: unknown): ValidationResult => {
      const num = Number(value);
      return {
        isValid: value === '' || value === null || (!isNaN(num) && Number.isInteger(num)),
        message: value !== '' && value !== null && (isNaN(num) || !Number.isInteger(num)) ? message : undefined
      };
    },

  sku: (message: string = 'SKU inválido (solo letras, números y guiones)') =>
    (value: string): ValidationResult => {
      const skuRegex = /^[A-Z0-9-]+$/;
      const normalizedValue = value?.toUpperCase();
      return {
        isValid: !value || skuRegex.test(normalizedValue),
        message: value && !skuRegex.test(normalizedValue) ? message : undefined
      };
    },

  code: (message: string = 'Código inválido (solo letras, números y guiones)') =>
    (value: string): ValidationResult => {
      const codeRegex = /^[A-Z0-9-_]+$/i;
      return {
        isValid: !value || codeRegex.test(value),
        message: value && !codeRegex.test(value) ? message : undefined
      };
    },

  phoneNumber: (message: string = 'Número de teléfono inválido') =>
    (value: string): ValidationResult => {
      const phoneRegex = /^[\d\s\-+()]+$/;
      return {
        isValid: !value || phoneRegex.test(value),
        message: value && !phoneRegex.test(value) ? message : undefined
      };
    },

  url: (message: string = 'URL inválida') =>
    (value: string): ValidationResult => {
      try {
        if (!value) return { isValid: true };
        new URL(value);
        return { isValid: true };
      } catch {
        return { isValid: false, message };
      }
    }
};

/**
 * Validadores específicos del dominio
 */
export const domainValidators = {
  // Validaciones para productos/materias primas
  productSku: (existingSkus: string[] = []) =>
    (value: string, currentId?: string): ValidationResult => {
      if (!value) return { isValid: false, message: 'SKU es requerido' };

      const normalizedValue = value.toUpperCase();
      const isDuplicate = existingSkus.some(sku =>
        sku.toUpperCase() === normalizedValue && sku !== currentId
      );

      if (isDuplicate) {
        return { isValid: false, message: 'Este SKU ya existe' };
      }

      return validators.sku()(value);
    },

  // Validaciones para precios y costos
  unitCost: (message: string = 'Costo unitario debe ser mayor a 0') =>
    (value: unknown): ValidationResult => {
      const num = Number(value);
      return {
        isValid: !isNaN(num) && num > 0,
        message: isNaN(num) || num <= 0 ? message : undefined
      };
    },

  // Validaciones para stock
  stockQuantity: (message: string = 'Cantidad de stock inválida') =>
    (value: unknown): ValidationResult => {
      const num = Number(value);
      return {
        isValid: !isNaN(num) && num >= 0 && Number.isInteger(num),
        message: isNaN(num) || num < 0 || !Number.isInteger(num) ? message : undefined
      };
    },

  // Validaciones para fechas
  futureDate: (message: string = 'La fecha debe ser futura') =>
    (value: string): ValidationResult => {
      if (!value) return { isValid: true };

      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return {
        isValid: date >= today,
        message: date < today ? message : undefined
      };
    },

  pastDate: (message: string = 'La fecha debe ser pasada') =>
    (value: string): ValidationResult => {
      if (!value) return { isValid: true };

      const date = new Date(value);
      const today = new Date();

      return {
        isValid: date <= today,
        message: date > today ? message : undefined
      };
    },

  // Validaciones para tipos de producto
  productType: (validTypes: string[] = ['materia_prima', 'empaques', 'gomas_granel', 'producto_final']) =>
    (value: string): ValidationResult => ({
      isValid: validTypes.includes(value),
      message: !validTypes.includes(value) ?
        `Tipo debe ser uno de: ${validTypes.join(', ')}` : undefined
    }),

  // Validaciones para ubicaciones
  location: (validLocations: string[] = ['bodega-central', 'pos-colina', 'pos-fontanar', 'pos-eventos']) =>
    (value: string): ValidationResult => ({
      isValid: validLocations.includes(value),
      message: !validLocations.includes(value) ?
        `Ubicación debe ser una de: ${validLocations.join(', ')}` : undefined
    })
};

/**
 * Función para validar un objeto completo
 */
export const validateObject = <T extends Record<string, unknown>>(
  data: T,
  rules: ValidationRule<T>[]
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const fieldValue = data[rule.field];

    for (const validator of rule.rules) {
      const result = validator(fieldValue, data);

      if (!result.isValid && result.message) {
        errors[rule.field as string] = result.message;
        break; // Solo mostrar el primer error por campo
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Hook para validación en tiempo real
 */
export const useValidation = <T extends Record<string, unknown>>(
  rules: ValidationRule<T>[]
) => {
  const validate = (data: T) => validateObject(data, rules);

  const validateField = (field: keyof T, value: unknown, data?: T) => {
    const fieldRules = rules.find(rule => rule.field === field);
    if (!fieldRules) return { isValid: true };

    for (const validator of fieldRules.rules) {
      const result = validator(value, data);
      if (!result.isValid) {
        return result;
      }
    }

    return { isValid: true };
  };

  return {
    validate,
    validateField
  };
};

/**
 * Reglas de validación predefinidas para entidades comunes
 */
export const validationRules = {
  product: [
    {
      field: 'sku' as const,
      rules: [validators.required('SKU es requerido'), validators.sku()]
    },
    {
      field: 'name' as const,
      rules: [validators.required('Nombre es requerido'), validators.minLength(2)]
    },
    {
      field: 'type' as const,
      rules: [validators.required('Tipo es requerido'), domainValidators.productType()]
    },
    {
      field: 'unit_cost' as const,
      rules: [validators.required('Costo es requerido'), domainValidators.unitCost()]
    }
  ],

  rawMaterial: [
    {
      field: 'code' as const,
      rules: [validators.required('Código es requerido'), validators.code()]
    },
    {
      field: 'name' as const,
      rules: [validators.required('Nombre es requerido'), validators.minLength(2)]
    },
    {
      field: 'price_per_unit' as const,
      rules: [validators.required('Precio es requerido'), domainValidators.unitCost()]
    }
  ],

  supplier: [
    {
      field: 'name' as const,
      rules: [validators.required('Nombre es requerido'), validators.minLength(2)]
    },
    {
      field: 'email' as const,
      rules: [validators.email()]
    },
    {
      field: 'phone' as const,
      rules: [validators.phoneNumber()]
    }
  ]
} as const;