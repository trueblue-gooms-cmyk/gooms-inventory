import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Package, ArrowRight, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MovementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MOVEMENT_TYPES = [
  {
    value: 'entrada',
    label: 'Entrada',
    description: 'Ingreso de nuevo inventario',
    icon: <ArrowDownLeft className="w-5 h-5" />,
    color: 'bg-green-500'
  },
  {
    value: 'transferencia',
    label: 'Transferencia',
    description: 'Mover items entre ubicaciones',
    icon: <ArrowRight className="w-5 h-5" />,
    color: 'bg-blue-500'
  },
  {
    value: 'reemplazo',
    label: 'Reemplazo',
    description: 'Corrección de SKU en órdenes',
    icon: <RefreshCw className="w-5 h-5" />,
    color: 'bg-purple-500'
  },
  {
    value: 'transformacion',
    label: 'Transformación',
    description: 'Conversión de materias primas a producto final',
    icon: <Package className="w-5 h-5" />,
    color: 'bg-orange-500'
  }
];

const PRODUCT_TYPES = [
  { value: 'materia_prima', label: 'Materia Prima' },
  { value: 'empaques', label: 'Empaques' },
  { value: 'gomas_granel', label: 'Gomas al Granel' },
  { value: 'producto_final', label: 'Producto Final' }
];

// Locations will be loaded dynamically from Supabase
const [locations, setLocations] = useState<any[]>([]);

export function MovementFormModal({ isOpen, onClose, onSuccess }: MovementFormModalProps) {
  const [formData, setFormData] = useState({
    movement_type: '',
    product_type: '',
    product_id: '',
    quantity: '',
    from_location_id: '',
    to_location_id: '',
    movement_datetime: new Date().toISOString().slice(0, 16),
    notes: ''
  });
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadLocations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.product_type) {
      loadProducts();
    }
  }, [formData.product_type]);

  const resetForm = () => {
    setFormData({
      movement_type: '',
      product_type: '',
      product_id: '',
      quantity: '',
      from_location_id: '',
      to_location_id: '',
      movement_datetime: new Date().toISOString().slice(0, 16),
      notes: ''
    });
    setProducts([]);
    setErrors({});
  };

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      // Fallback locations
      setLocations([
        { id: 'demo-1', name: 'Bodega Central', code: 'BC001' },
        { id: 'demo-2', name: 'POS-Colina', code: 'PC001' },
        { id: 'demo-3', name: 'POS-Fontanar', code: 'PF001' },
        { id: 'demo-4', name: 'POS-Eventos', code: 'PE001' }
      ]);
    }
  };

  const loadProducts = async () => {
    try {
      // Load products by type using real Supabase data
      let query = supabase.from('products').select('id, sku, name, type, product_type');
      
      // Map frontend types to database types
      const typeMapping: Record<string, string> = {
        'materia_prima': 'materia_prima',
        'empaques': 'empaques', 
        'gomas_granel': 'gomas_granel',
        'producto_final': 'producto_final'
      };

      if (formData.product_type && typeMapping[formData.product_type]) {
        query = query.eq('product_type', typeMapping[formData.product_type] as any);
      }
      
      const { data, error } = await query
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading products:', error);
        setProducts([]);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    }
  };

  const getDemoProducts = () => [
    { id: 'demo-1', sku: 'MP-001', name: 'Ácido Cítrico 25kg', type: 'materia_prima', product_type: 'materia_prima' },
    { id: 'demo-2', sku: 'EMP-001', name: 'Bolsas Transparentes 100g', type: 'empaque', product_type: 'empaques' },
    { id: 'demo-3', sku: 'GB-001', name: 'Gomas Base Naranja', type: 'granel', product_type: 'gomas_granel' },
    { id: 'demo-4', sku: 'PF-001', name: 'Gomas Ácidas Premium 100g', type: 'producto_final', product_type: 'producto_final' }
  ];

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.movement_type) {
      newErrors.movement_type = 'Tipo de movimiento es obligatorio';
    }
    if (!formData.product_type) {
      newErrors.product_type = 'Tipo de producto es obligatorio';
    }
    if (!formData.product_id) {
      newErrors.product_id = 'Producto es obligatorio';
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      newErrors.quantity = 'Cantidad debe ser mayor a 0';
    }

    // Validaciones específicas por tipo de movimiento
    if (formData.movement_type === 'transferencia') {
      if (!formData.from_location_id) {
        newErrors.from_location_id = 'Ubicación origen es obligatoria';
      }
      if (!formData.to_location_id) {
        newErrors.to_location_id = 'Ubicación destino es obligatoria';
      }
      if (formData.from_location_id === formData.to_location_id) {
        newErrors.to_location_id = 'Las ubicaciones deben ser diferentes';
      }
    } else if (formData.movement_type === 'entrada') {
      if (!formData.to_location_id) {
        newErrors.to_location_id = 'Ubicación destino es obligatoria';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Errores de validación",
        description: "Por favor corrige los errores marcados",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const movementData = {
        movement_type: formData.movement_type as any,
        product_id: formData.product_id,
        quantity: Number(formData.quantity),
        from_location_id: formData.from_location_id || null,
        to_location_id: formData.to_location_id || null,
        notes: formData.notes || null,
        created_at: formData.movement_datetime
      };

      // Use the RPC function for better handling
      const { data, error } = await supabase.rpc('register_inventory_movement', {
        p_movement_type: movementData.movement_type,
        p_product_id: movementData.product_id,
        p_quantity: movementData.quantity,
        p_from_location_id: movementData.from_location_id,
        p_to_location_id: movementData.to_location_id,
        p_notes: movementData.notes
      });

      if (error) throw error;

      toast({
        title: "Movimiento registrado",
        description: `Movimiento de ${MOVEMENT_TYPES.find(t => t.value === formData.movement_type)?.label} registrado correctamente`,
        variant: "default"
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating movement:', error);
      toast({
        title: "Error",
        description: error.message || "Error al registrar el movimiento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedMovementType = MOVEMENT_TYPES.find(t => t.value === formData.movement_type);
  const filteredProducts = products.filter(p => 
    formData.product_type === 'all' || p.product_type === formData.product_type
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Nuevo Movimiento</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Movimiento */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              1. Tipo de Movimiento <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {MOVEMENT_TYPES.map(type => (
                <div
                  key={type.value}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.movement_type === type.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, movement_type: type.value }))}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${type.color}`}>
                      {type.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{type.label}</h3>
                      <p className="text-xs text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.movement_type && (
              <div className="flex items-center space-x-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.movement_type}</span>
              </div>
            )}
          </div>

          {/* Tipo de Producto */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              2. Tipo de Producto <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.product_type}
              onChange={(e) => setFormData(prev => ({ ...prev, product_type: e.target.value, product_id: '' }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.product_type ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar tipo de producto</option>
              {PRODUCT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            {errors.product_type && (
              <div className="flex items-center space-x-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.product_type}</span>
              </div>
            )}
          </div>

          {/* Producto */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              3. Producto <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                errors.product_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={!formData.product_type}
            >
              <option value="">Seleccionar producto</option>
              {filteredProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
            {errors.product_id && (
              <div className="flex items-center space-x-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.product_id}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Fecha/Hora */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                4. Fecha/Hora del Movimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.movement_datetime}
                onChange={(e) => setFormData(prev => ({ ...prev, movement_datetime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Cantidad */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Cantidad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.quantity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                min="1"
                placeholder="Cantidad"
              />
              {errors.quantity && (
                <div className="flex items-center space-x-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.quantity}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ubicaciones (condicional) */}
          {(formData.movement_type === 'transferencia' || formData.movement_type === 'entrada') && (
            <div className="space-y-4">
              {formData.movement_type === 'transferencia' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Ubicación Origen <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.from_location_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, from_location_id: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.from_location_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccionar ubicación origen</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                  {errors.from_location_id && (
                    <div className="flex items-center space-x-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors.from_location_id}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ubicación Destino <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.to_location_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, to_location_id: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    errors.to_location_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar ubicación destino</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
                {errors.to_location_id && (
                  <div className="flex items-center space-x-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.to_location_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Notas adicionales sobre el movimiento..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}