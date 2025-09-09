// src/components/InventoryMovementModal.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Package, ArrowRight, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface Batch {
  id: string;
  batch_number: string;
  expiry_date: string;
  quantity_available: number;
}

export function InventoryMovementModal({ isOpen, onClose, onSuccess, productId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAppStore();

  const [formData, setFormData] = useState({
    movement_type: 'entrada',
    product_id: productId || '',
    batch_id: '',
    from_location_id: '',
    to_location_id: '',
    quantity: '',
    unit_cost: '',
    reference_type: '',
    reference_id: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.product_id && formData.from_location_id) {
      loadBatches();
    }
  }, [formData.product_id, formData.from_location_id]);

  const loadData = async () => {
    try {
      const [productsRes, locationsRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, sku, name')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (locationsRes.data) setLocations(locationsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadBatches = async () => {
    try {
      const { data } = await supabase
        .from('inventory_current')
        .select(`
          batch_id,
          quantity_available,
          production_batches!inner (
            id,
            batch_number,
            expiry_date
          )
        `)
        .eq('product_id', formData.product_id)
        .eq('location_id', formData.from_location_id)
        .gt('quantity_available', 0);

      if (data) {
        const formattedBatches = data.map((item: any) => ({
          id: item.batch_id,
          batch_number: item.production_batches.batch_number,
          expiry_date: item.production_batches.expiry_date,
          quantity_available: item.quantity_available
        }));
        setBatches(formattedBatches);
      }
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Registrar movimiento
      const movementData = {
        movement_type: formData.movement_type,
        product_id: formData.product_id,
        batch_id: formData.batch_id || null,
        from_location_id: formData.from_location_id || null,
        to_location_id: formData.to_location_id || null,
        quantity: parseInt(formData.quantity),
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        total_cost: formData.unit_cost ? parseFloat(formData.unit_cost) * parseInt(formData.quantity) : null,
        reference_type: formData.reference_type || null,
        reference_id: formData.reference_id || null,
        notes: formData.notes,
        created_by: profile?.id
      };

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert([movementData]);

      if (movementError) throw movementError;

      // Actualizar inventario actual
      if (formData.movement_type === 'salida' && formData.from_location_id) {
        // Reducir inventario en ubicación origen
        const { data: currentInventory } = await supabase
          .from('inventory_current')
          .select('*')
          .eq('product_id', formData.product_id)
          .eq('location_id', formData.from_location_id)
          .eq('batch_id', formData.batch_id)
          .single();

        if (currentInventory) {
          const newQuantity = currentInventory.quantity_available - parseInt(formData.quantity);
          await supabase
            .from('inventory_current')
            .update({ 
              quantity_available: newQuantity,
              last_movement_date: new Date().toISOString()
            })
            .eq('id', currentInventory.id);
        }
      }

      if (formData.movement_type === 'entrada' && formData.to_location_id) {
        // Aumentar inventario en ubicación destino
        const { data: currentInventory } = await supabase
          .from('inventory_current')
          .select('*')
          .eq('product_id', formData.product_id)
          .eq('location_id', formData.to_location_id)
          .eq('batch_id', formData.batch_id)
          .single();

        if (currentInventory) {
          const newQuantity = currentInventory.quantity_available + parseInt(formData.quantity);
          await supabase
            .from('inventory_current')
            .update({ 
              quantity_available: newQuantity,
              last_movement_date: new Date().toISOString()
            })
            .eq('id', currentInventory.id);
        } else {
          // Crear nuevo registro si no existe
          await supabase
            .from('inventory_current')
            .insert({
              product_id: formData.product_id,
              location_id: formData.to_location_id,
              batch_id: formData.batch_id || null,
              quantity_available: parseInt(formData.quantity),
              quantity_reserved: 0,
              quantity_in_transit: 0,
              last_movement_date: new Date().toISOString()
            });
        }
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error registering movement:', error);
      alert('Error al registrar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      movement_type: 'entrada',
      product_id: productId || '',
      batch_id: '',
      from_location_id: '',
      to_location_id: '',
      quantity: '',
      unit_cost: '',
      reference_type: '',
      reference_id: '',
      notes: ''
    });
    setBatches([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Registrar Movimiento de Inventario</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Tipo de Movimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['entrada', 'salida', 'ajuste', 'devolucion'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFormData({...formData, movement_type: type})}
                  className={`px-3 py-2 rounded-lg border capitalize ${
                    formData.movement_type === type
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto
              </label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Seleccionar producto</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0"
                required
              />
            </div>

            {/* Ubicación Origen */}
            {(formData.movement_type === 'salida' || formData.movement_type === 'ajuste') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación Origen
                </label>
                <select
                  value={formData.from_location_id}
                  onChange={(e) => setFormData({...formData, from_location_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Seleccionar ubicación</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ubicación Destino */}
            {(formData.movement_type === 'entrada' || formData.movement_type === 'devolucion') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación Destino
                </label>
                <select
                  value={formData.to_location_id}
                  onChange={(e) => setFormData({...formData, to_location_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Seleccionar ubicación</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lote */}
            {batches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lote
                </label>
                <select
                  value={formData.batch_id}
                  onChange={(e) => setFormData({...formData, batch_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Seleccionar lote</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_number} (Disponible: {batch.quantity_available})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Costo Unitario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo Unitario (opcional)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="Observaciones adicionales..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.product_id || !formData.quantity}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}