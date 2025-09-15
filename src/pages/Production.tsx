// src/pages/Production.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Factory, 
  Plus, 
  Calendar,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit2,
  FileText
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface ProductionBatch {
  id: string;
  batch_number: string;
  product_id: string;
  planned_quantity: number;
  actual_quantity: number | null;
  location_id: string;
  status: 'planned' | 'in_production' | 'completed' | 'cancelled';
  production_date: string;
  expiry_date: string;
  notes: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  products?: {
    sku: string;
    name: string;
    shelf_life_days: number;
  };
  locations?: {
    name: string;
    type: string;
  };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  shelf_life_days: number;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

export function Production() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { profile } = useAppStore();

  const [formData, setFormData] = useState({
    batch_number: '',
    product_id: '',
    planned_quantity: '',
    actual_quantity: '',
    location_id: '',
    status: 'planned' as 'planned' | 'in_production' | 'completed' | 'cancelled',
    production_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [batchesRes, productsRes, locationsRes] = await Promise.all([
        supabase
          .from('production_batches')
          .select(`
            *,
            products (sku, name, shelf_life_days),
            locations (name, type)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('id, sku, name, shelf_life_days')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('locations')
          .select('*')
          .eq('type', 'maquila')
          .eq('is_active', true)
      ]);

      if (batchesRes.error) throw batchesRes.error;
      if (productsRes.error) throw productsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setBatches(batchesRes.data || []);
      setProducts(productsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBatchNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BATCH-${year}${month}${day}-${random}`;
  };

  const handleSubmit = async () => {
    try {
      const selectedProduct = products.find(p => p.id === formData.product_id);
      const productionDate = new Date(formData.production_date);
      const expiryDate = new Date(productionDate);
      expiryDate.setDate(expiryDate.getDate() + (selectedProduct?.shelf_life_days || 365));

      const batchData = {
        batch_number: formData.batch_number || generateBatchNumber(),
        product_id: formData.product_id,
        planned_quantity: parseInt(formData.planned_quantity),
        actual_quantity: formData.actual_quantity ? parseInt(formData.actual_quantity) : null,
        location_id: formData.location_id,
        status: formData.status,
        production_date: formData.production_date,
        expiry_date: expiryDate.toISOString().split('T')[0],
        notes: formData.notes,
        created_by: profile?.id,
        started_at: formData.status === 'in_production' ? new Date().toISOString() : null,
        completed_at: formData.status === 'completed' ? new Date().toISOString() : null
      };
      
      if (editingBatch) {
        const { error } = await supabase
          .from('production_batches')
          .update(batchData)
          .eq('id', editingBatch.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('production_batches')
          .insert([batchData]);
        
        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('Error al guardar el lote');
    }
  };

  const handleStatusChange = async (batchId: string, newStatus: string) => {
    try {
      const updateData: unknown = { status: newStatus };
      
      if (newStatus === 'in_production') {
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('production_batches')
        .update(updateData)
        .eq('id', batchId);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating batch status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      batch_number: '',
      product_id: '',
      planned_quantity: '',
      actual_quantity: '',
      location_id: '',
      status: 'planned',
      production_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingBatch(null);
  };

  const filteredBatches = batches.filter(batch => 
    filterStatus === 'all' || batch.status === filterStatus
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned':
        return <Clock className="w-4 h-4" />;
      case 'in_production':
        return <Factory className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-700';
      case 'in_production':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Producción</h1>
          <p className="text-gray-600 mt-1">Gestión de lotes y producción en maquila</p>
        </div>
        <button
          onClick={() => {
            setFormData({...formData, batch_number: generateBatchNumber()});
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Lote</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Planificados</p>
              <p className="text-2xl font-bold text-blue-600">
                {batches.filter(b => b.status === 'planned').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Producción</p>
              <p className="text-2xl font-bold text-yellow-600">
                {batches.filter(b => b.status === 'in_production').length}
              </p>
            </div>
            <Factory className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-green-600">
                {batches.filter(b => b.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Unidades</p>
              <p className="text-2xl font-bold text-gray-900">
                {batches.reduce((sum, b) => sum + (b.actual_quantity || b.planned_quantity), 0)}
              </p>
            </div>
            <Package className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'all' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus('planned')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'planned' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Planificados
          </button>
          <button
            onClick={() => setFilterStatus('in_production')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'in_production' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            En Producción
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg ${
              filterStatus === 'completed' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completados
          </button>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBatches.map((batch) => (
          <div key={batch.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-gray-900">{batch.batch_number}</p>
                <p className="text-sm text-gray-600">{batch.products?.name}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getStatusColor(batch.status)}`}>
                {getStatusIcon(batch.status)}
                {batch.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ubicación:</span>
                <span className="font-medium">{batch.locations?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cantidad:</span>
                <span className="font-medium">
                  {batch.actual_quantity || batch.planned_quantity} unidades
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Producción:</span>
                <span className="font-medium">
                  {new Date(batch.production_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vencimiento:</span>
                <span className="font-medium">
                  {new Date(batch.expiry_date).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
              {batch.status === 'planned' && (
                <button
                  onClick={() => handleStatusChange(batch.id, 'in_production')}
                  className="text-sm px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                >
                  Iniciar Producción
                </button>
              )}
              {batch.status === 'in_production' && (
                <button
                  onClick={() => handleStatusChange(batch.id, 'completed')}
                  className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Completar
                </button>
              )}
              <button className="text-gray-400 hover:text-gray-600">
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingBatch ? 'Editar Lote' : 'Nuevo Lote de Producción'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Lote
                  </label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Auto-generado"
                  />
                </div>
                
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad Planificada
                  </label>
                  <input
                    type="number"
                    value={formData.planned_quantity}
                    onChange={(e) => setFormData({...formData, planned_quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad Real (opcional)
                  </label>
                  <input
                    type="number"
                    value={formData.actual_quantity}
                    onChange={(e) => setFormData({...formData, actual_quantity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación (Maquila)
                  </label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({...formData, location_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">Seleccionar maquila</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Producción
                  </label>
                  <input
                    type="date"
                    value={formData.production_date}
                    onChange={(e) => setFormData({...formData, production_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="planned">Planificado</option>
                    <option value="in_production">En Producción</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div className="col-span-2">
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
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  {editingBatch ? 'Guardar Cambios' : 'Crear Lote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}