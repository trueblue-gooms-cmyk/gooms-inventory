/**
 * Unified Design System - Dashboard-inspired styling
 * This file provides consistent design tokens and utilities for the entire application
 */

export const UNIFIED_DESIGN = {
  // Layout & Spacing
  layout: {
    page: "p-8 max-w-7xl mx-auto space-y-8",
    section: "space-y-6",
    cardGrid: "grid gap-6",
  },

  // Cards & Containers
  cards: {
    modern: "bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border-0 p-6",
    standard: "bg-white rounded-xl shadow-sm border border-gray-100 p-6",
    metric: "bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border-0 p-6",
    table: "bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border-0 overflow-hidden",
  },

  // Typography
  typography: {
    pageTitle: "text-3xl font-thin text-gray-900 tracking-tight",
    pageSubtitle: "text-sm text-gray-500 font-light mt-2",
    sectionTitle: "text-lg font-light text-gray-900",
    cardTitle: "text-base font-light text-gray-900",
    metricValue: "text-4xl font-thin text-gray-900",
    metricLabel: "text-sm text-gray-500 font-light",
    metricDescription: "text-xs text-gray-400 mt-1",
    bodyText: "text-sm font-light text-gray-700",
    captionText: "text-xs font-light text-gray-500",
  },

  // Buttons
  buttons: {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-xl font-light transition-all duration-300 flex items-center gap-2",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-light transition-all duration-300 flex items-center gap-2",
    ghost: "hover:bg-gray-100/50 p-2 rounded-xl transition-all",
  },

  // Form Elements
  forms: {
    input: "w-full px-4 py-3 border-0 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-light",
    select: "px-4 py-3 border-0 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-light",
    label: "block text-sm font-light text-gray-700 mb-2",
  },

  // Status & Badges
  status: {
    badge: "px-3 py-1 rounded-full text-xs font-light border",
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    neutral: "bg-gray-50 text-gray-700 border-gray-200",
  },

  // Tables
  tables: {
    container: "overflow-x-auto",
    table: "w-full",
    header: "border-b border-gray-100",
    headerCell: "px-6 py-4 text-left text-xs font-light text-gray-500 uppercase tracking-wider",
    row: "hover:bg-gray-50/50 transition-colors",
    cell: "px-6 py-4 text-sm font-light text-gray-700",
    divider: "divide-y divide-gray-50",
  },

  // Navigation
  navigation: {
    tab: "px-4 py-2.5 rounded-lg font-light transition-all",
    tabActive: "bg-white text-gray-900 shadow-sm",
    tabInactive: "text-gray-600 hover:text-gray-900 hover:bg-white/50",
    tabContainer: "flex space-x-1 bg-gray-50/50 p-1 rounded-xl",
  },

  // Modals
  modals: {
    backdrop: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50",
    container: "bg-white/95 backdrop-blur-md rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100",
    header: "p-6 border-b border-gray-100",
    title: "text-2xl font-thin text-gray-900",
    content: "p-6 space-y-6",
  },

  // Icons
  icons: {
    small: "w-4 h-4",
    medium: "w-5 h-5",
    large: "w-6 h-6",
    metric: "w-5 h-5",
  },

  // Colors (Semantic)
  colors: {
    primary: "text-primary",
    success: "text-green-500",
    warning: "text-yellow-500",
    error: "text-red-500",
    info: "text-blue-500",
    muted: "text-gray-500",
  },
} as const;

// Utility function to combine classes
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Helper to get status styling
export const getStatusStyling = (status: 'success' | 'warning' | 'error' | 'info' | 'neutral') => {
  return `${UNIFIED_DESIGN.status.badge} ${UNIFIED_DESIGN.status[status]}`;
};

// Helper to create metric cards
export const createMetricCard = (value: string | number, label: string, description?: string, icon?: React.ReactNode) => {
  return {
    className: UNIFIED_DESIGN.cards.metric,
    content: {
      value: UNIFIED_DESIGN.typography.metricValue,
      label: UNIFIED_DESIGN.typography.metricLabel,
      description: UNIFIED_DESIGN.typography.metricDescription,
    }
  };
};