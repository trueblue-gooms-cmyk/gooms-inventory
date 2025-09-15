/**
 * Sistema de diseño unificado para Gooms Inventory
 * Define estilos consistentes para toda la aplicación
 */

export const DESIGN_SYSTEM = {
  // Tipografía
  typography: {
    pageTitle: "text-2xl font-bold text-gray-900",
    pageSubtitle: "text-gray-600 mt-1",
    sectionTitle: "text-lg font-semibold text-gray-900",
    cardTitle: "text-base font-medium text-gray-900",
    label: "text-sm font-medium text-gray-700",
    bodyText: "text-sm text-gray-700",
    captionText: "text-xs text-gray-500",
    errorText: "text-sm text-red-600",
    successText: "text-sm text-green-600",
  },

  // Botones
  buttons: {
    primary: "flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors",
    secondary: "flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors",
    success: "flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors",
    danger: "flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors",
    small: "px-3 py-1 text-sm rounded-md",
    disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
  },

  // Tarjetas y contenedores
  containers: {
    page: "p-6 max-w-7xl mx-auto space-y-6",
    card: "bg-white rounded-lg border border-gray-200 overflow-hidden",
    cardHeader: "px-6 py-4 border-b border-gray-200",
    cardBody: "p-6",
    modal: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
    modalContent: "bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto",
  },

  // Estados
  status: {
    optimal: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    critical: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    neutral: "bg-gray-100 text-gray-700",
  },

  // Formularios
  forms: {
    input: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent",
    select: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent",
    textarea: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none",
    label: "block text-sm font-medium text-gray-700 mb-1",
    error: "text-xs text-red-500 mt-1",
  },

  // Espaciado
  spacing: {
    pageSection: "space-y-6",
    cardSection: "space-y-4",
    formSection: "space-y-3",
    buttonGroup: "flex gap-3",
  },

  // Tablas
  tables: {
    wrapper: "overflow-x-auto",
    table: "w-full",
    header: "bg-gray-50 border-b border-gray-200",
    headerCell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
    row: "hover:bg-gray-50 transition-colors",
    cell: "px-6 py-4",
    emptyState: "px-6 py-12 text-center text-gray-500",
  },

  // Iconos
  icons: {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6",
    xlarge: "w-8 h-8",
  },
} as const;

// Función helper para combinar clases
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Función para obtener estilos de estado
export const getStatusStyle = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'optimal':
    case 'active':
    case 'success':
      return DESIGN_SYSTEM.status.optimal;
    case 'low':
    case 'warning':
      return DESIGN_SYSTEM.status.warning;
    case 'critical':
    case 'error':
    case 'danger':
      return DESIGN_SYSTEM.status.critical;
    case 'info':
      return DESIGN_SYSTEM.status.info;
    default:
      return DESIGN_SYSTEM.status.neutral;
  }
};