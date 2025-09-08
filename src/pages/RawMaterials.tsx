// src/pages/RawMaterials.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit2, Trash2, Package2, AlertTriangle } from 'lucide-react';
import { useCanEdit } from '@/stores/useAppStore';

interface Supplier {
  id: string;
  name: string;
  code: string;
}

interface RawMaterial {
  id: string;
  code: string;
  name: string;
  description: string;
  supplier_id: string;
  supplier_code: string;
  unit_measure: string;
  price_per_unit: number;
  moq_kg: number;
  shelf_life_days: number;
  lead_time_days: number;
  safety_stock_kg: number;
  current_stock_kg: number;
  is_active: boolean;
  suppliers?: Supplier;
}

export function RawMaterials() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const canEdit = useCanEdit();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    supplier_id: '',
    supplier_code: '',
    unit_measure: 'kg',
    price_per_unit: '',
    moq_kg: '',
    shelf_life_days: '',
    lead_time_days: '',
    safety_stock_kg: '',
    current_stock_kg: '0',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materialsRes, suppliersRes] = await Promise.all([
        supabase
          .from('raw_materials')
          .select('*, suppliers(id, name, code)')
          .order('name'),
        supabase
          .from('suppliers')
          .select('id, name, code')
          .eq('is_active', true)
          .order('name')
      ]);

      if (materialsRes.error) throw materialsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      setMaterials(materialsRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const materialData = {
        ...formData,
        price_per_unit: parseFloat(formData.price_per_unit),
        moq_kg: parseFloat(formData.moq_kg),
        shelf_life_days: parseInt(formData.shelf_life_days),
        lead_time_days: parseInt(formData.lead_time_days),
        safety_stock_kg: parseFloat(formData.safety_stock_kg),
        current_stock_kg: parseFloat(formData.current_stock_kg)
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from('raw_materials')
          .update(materialData)
          .eq('id', editingMaterial.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('raw_materials')
          .insert([materialData]);
        
        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Error al guardar la materia prima');
    }
  };

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      code: material.code,
      name: material.name,
      description: material.description || '',
      supplier_id: material.supplier_id || '',
      supplier_code: material.supplier_code || '',
      unit_measure: material.unit_measure,
      price_per_unit: material.price_per_unit.toString(),
      moq_kg: material.moq_kg.toString(),
      shelf_life_days: material.shelf_life_days.toString(),
      lead_time_days: material.lead_time_days.toString(),
      safety_stock_kg: material.safety_stock_kg.toString(),
      current_stock_kg: material.current_stock_kg.toString(),
      is_active: material.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta materia prima?')) return;
    
    try {
      const { error } = await supabase
        .from('raw_materials')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      supplier_id: '',
      supplier_code: '',
      unit_measure: 'kg',
      price_per_unit: '',
      moq_kg: '',
      shelf_life_days: '',
      lead_time_days: '',
      safety_stock_kg: '',
      current_stock_kg: '0',
      is_active: true
    });
    setEditingMaterial(null);
  };

  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Materias Primas</h1>
          <p className="text-gray-600 mt-1">Gestión de insumos y materiales</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Materia Prima</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock (kg)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MOQ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio/kg</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                {canEdit && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMaterials.map((material) => (
                <tr key={material.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{material.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{material.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {material.suppliers?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        material.current_stock_kg < material.safety_stock_kg
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {material.current_stock_kg}
                      </span>
                      {material.current_stock_kg < material.safety_stock_kg && (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{material.moq_kg} kg</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    ${material.price_per_unit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      material.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {material.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(material)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingMaterial ? 'Editar Materia Prima' : 'Nueva Materia Prima'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código Proveedor</label>
                  <input
                    type="text"
                    value={formData.supplier_code}
                    onChange={(e) => setFormData({...formData, supplier_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio por kg</label>
                  <input
                    type="number"
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData({...formData, price_per_unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MOQ (kg)</label>
                  <input
                    type="number"
                    value={formData.moq_kg}
                    onChange={(e) => setFormData({...formData, moq_kg: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (días)</label>
                  <input
                    type="number"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({...formData, lead_time_days: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vida útil (días)</label>
                  <input
                    type="number"
                    value={formData.shelf_life_days}
                    onChange={(e) => setFormData({...formData, shelf_life_days: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock de seguridad (kg)</label>
                  <input
                    type="number"
                    value={formData.safety_stock_kg}
                    onChange={(e) => setFormData({...formData, safety_stock_kg: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual (kg)</label>
                  <input
                    type="number"
                    value={formData.current_stock_kg}
                    onChange={(e) => setFormData({...formData, current_stock_kg: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  {editingMaterial ? 'Guardar Cambios' : 'Crear Materia Prima'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}