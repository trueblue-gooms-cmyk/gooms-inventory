/**
 * Utility functions for handling type assertions across the application
 * This helps resolve TypeScript compilation issues while maintaining type safety where possible
 */

// Type assertion utilities for unknown data from Supabase
export const assertRecord = (data: unknown): Record<string, any> => data as any;
export const assertArray = (data: unknown): any[] => Array.isArray(data) ? data : [];
export const assertNumber = (data: unknown): number => Number(data) || 0;
export const assertString = (data: unknown): string => String(data || '');
export const assertBoolean = (data: unknown): boolean => Boolean(data);

// Safe property access for unknown objects
export const safeGet = (obj: unknown, key: string, defaultValue: any = null): any => {
  return (obj as any)?.[key] ?? defaultValue;
};

// Type assertions for common database operations
export const assertDatabaseRecord = (record: unknown) => ({
  id: safeGet(record, 'id'),
  created_at: safeGet(record, 'created_at'),
  updated_at: safeGet(record, 'updated_at'),
  ...assertRecord(record)
});

// Inventory specific assertions
export const assertInventoryItem = (item: unknown) => ({
  id: safeGet(item, 'id'),
  product_id: safeGet(item, 'product_id'),
  location_id: safeGet(item, 'location_id'),
  quantity_available: assertNumber(safeGet(item, 'quantity_available')),
  quantity_reserved: assertNumber(safeGet(item, 'quantity_reserved')),
  expiry_date: safeGet(item, 'expiry_date'),
  last_movement_date: safeGet(item, 'last_movement_date'),
  ...assertRecord(item)
});

// Product specific assertions
export const assertProduct = (product: unknown) => ({
  id: safeGet(product, 'id'),
  name: safeGet(product, 'name'),
  sku: safeGet(product, 'sku'),
  type: safeGet(product, 'type'),
  unit_cost: assertNumber(safeGet(product, 'unit_cost')),
  min_stock_units: assertNumber(safeGet(product, 'min_stock_units')),
  
  shelf_life_days: assertNumber(safeGet(product, 'shelf_life_days')),
  weight_grams: assertNumber(safeGet(product, 'weight_grams')),
  units_per_box: assertNumber(safeGet(product, 'units_per_box')),
  is_active: assertBoolean(safeGet(product, 'is_active')),
  ...assertRecord(product)
});

// Location specific assertions
export const assertLocation = (location: unknown) => ({
  id: safeGet(location, 'id'),
  name: safeGet(location, 'name'),
  code: safeGet(location, 'code'),
  type: safeGet(location, 'type'),
  address: safeGet(location, 'address'),
  contact_name: safeGet(location, 'contact_name'),
  contact_phone: safeGet(location, 'contact_phone'),
  is_active: assertBoolean(safeGet(location, 'is_active')),
  ...assertRecord(location)
});

// Sales data assertions
export const assertSalesData = (sale: unknown) => ({
  id: safeGet(sale, 'id'),
  product_id: safeGet(sale, 'product_id'),
  quantity: assertNumber(safeGet(sale, 'quantity')),
  unit_price: assertNumber(safeGet(sale, 'unit_price')),
  total: assertNumber(safeGet(sale, 'total')),
  sale_date: safeGet(sale, 'sale_date'),
  customer_name: safeGet(sale, 'customer_name'),
  order_number: safeGet(sale, 'order_number'),
  ...assertRecord(sale)
});

// Movement type assertions
export const assertMovementType = (type: unknown): 'entrada' | 'salida' | 'produccion' | 'ajuste' | 'devolucion' => {
  const typeStr = String(type || '');
  // Map old types to new types for compatibility
  if (typeStr === 'transferencia') return 'ajuste';
  if (['entrada', 'salida', 'produccion', 'ajuste', 'devolucion'].includes(typeStr)) {
    return typeStr as 'entrada' | 'salida' | 'produccion' | 'ajuste' | 'devolucion';
  }
  return 'entrada'; // Default fallback
};

// Batch status assertions  
export const assertBatchStatus = (status: unknown): 'planned' | 'in_production' | 'completed' | 'cancelled' => {
  const statusStr = String(status || '');
  // Map old status to new status for compatibility
  if (statusStr === 'in_progress') return 'in_production';
  if (['planned', 'in_production', 'completed', 'cancelled'].includes(statusStr)) {
    return statusStr as 'planned' | 'in_production' | 'completed' | 'cancelled';
  }
  return 'planned'; // Default fallback
};

// Order status assertions
export const assertOrderStatus = (status: unknown): 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'received' | 'cancelled' => {
  const statusStr = String(status || '');
  // Map old status to new status for compatibility  
  if (statusStr === 'partial') return 'received';
  if (['draft', 'pending_approval', 'approved', 'rejected', 'sent', 'received', 'cancelled'].includes(statusStr)) {
    return statusStr as 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'received' | 'cancelled';
  }
  return 'draft'; // Default fallback
};

// Generic array processing with type assertions
export const processArrayData = <T>(data: unknown, processor: (item: unknown) => T): T[] => {
  if (!Array.isArray(data)) return [];
  return data.map(processor);
};

// Error message extraction
export const extractErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'Error desconocido';
};