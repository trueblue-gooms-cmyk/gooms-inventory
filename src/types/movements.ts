// Movement types that match the database enum exactly
export type MovementType = 'entrada' | 'salida' | 'produccion' | 'ajuste' | 'devolucion';

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entrada: 'Entrada',
  salida: 'Salida', 
  produccion: 'Producción',
  ajuste: 'Ajuste',
  devolucion: 'Devolución'
};

export const MOVEMENT_TYPE_OPTIONS: Array<{ value: MovementType; label: string }> = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'produccion', label: 'Producción' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'devolucion', label: 'Devolución' }
];