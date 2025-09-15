/**
 * Utilities centralizadas para formateo de datos
 * Elimina redundancias encontradas en múltiples páginas
 */

// Formateo de moneda (usado en Dashboard, Financial, Inventory, etc.)
export const formatCurrency = (value: number, currency: string = 'COP'): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Formateo de números con separadores de miles
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-CO').format(value);
};

// Formateo de porcentajes
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

// Formateo de fechas (usado en Reception, Financial, etc.)
export const formatDate = (date: string | Date, format: 'short' | 'long' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'long') {
    return dateObj.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return dateObj.toLocaleDateString('es-CO');
};

// Formateo de fechas relativas (hace X días)
export const formatRelativeDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;

  return formatDate(dateObj);
};

// Formateo de texto para SKU/códigos (mayúsculas, sin espacios)
export const formatCode = (code: string): string => {
  return code.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
};

// Formateo de estado con colores (usado en múltiples páginas)
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    // Inventory statuses
    'optimal': 'bg-green-100 text-green-700',
    'low': 'bg-yellow-100 text-yellow-700',
    'critical': 'bg-red-100 text-red-700',
    'overstock': 'bg-purple-100 text-purple-700',

    // Order statuses
    'sent': 'bg-blue-100 text-blue-700',
    'partial': 'bg-yellow-100 text-yellow-700',
    'received': 'bg-green-100 text-green-700',
    'cancelled': 'bg-gray-100 text-gray-700',

    // General statuses
    'active': 'bg-green-100 text-green-700',
    'inactive': 'bg-gray-100 text-gray-700',
    'pending': 'bg-yellow-100 text-yellow-700',
    'approved': 'bg-green-100 text-green-700',
    'rejected': 'bg-red-100 text-red-700'
  };

  return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

// Formateo de texto de estado (traducción)
export const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    // Inventory statuses
    'optimal': 'Óptimo',
    'low': 'Bajo',
    'critical': 'Crítico',
    'overstock': 'Sobrestock',

    // Order statuses
    'sent': 'Enviado',
    'partial': 'Parcial',
    'received': 'Recibido',
    'cancelled': 'Cancelado',

    // General statuses
    'active': 'Activo',
    'inactive': 'Inactivo',
    'pending': 'Pendiente',
    'approved': 'Aprobado',
    'rejected': 'Rechazado'
  };

  return statusLabels[status.toLowerCase()] || status;
};

// Formateo de unidades de medida
export const formatUnit = (quantity: number, unit: string): string => {
  const units: Record<string, { singular: string; plural: string }> = {
    'kg': { singular: 'kg', plural: 'kg' },
    'g': { singular: 'g', plural: 'g' },
    'l': { singular: 'litro', plural: 'litros' },
    'ml': { singular: 'ml', plural: 'ml' },
    'unit': { singular: 'unidad', plural: 'unidades' },
    'units': { singular: 'unidad', plural: 'unidades' },
    'box': { singular: 'caja', plural: 'cajas' },
    'pack': { singular: 'paquete', plural: 'paquetes' }
  };

  const unitConfig = units[unit.toLowerCase()] || { singular: unit, plural: unit };
  const formattedQuantity = formatNumber(quantity);

  if (quantity === 1) {
    return `${formattedQuantity} ${unitConfig.singular}`;
  }

  return `${formattedQuantity} ${unitConfig.plural}`;
};

// Formateo de tamaño de archivos
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};