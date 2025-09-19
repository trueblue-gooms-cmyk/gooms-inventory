// src/pages/RawMaterials.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Edit2, Trash2, Package2, AlertTriangle, Upload, FileSpreadsheet } from 'lucide-react';
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
  current_stock_kg: number;
  min_stock_units: number;
  is_active: boolean;
  suppliers?: Supplier;
}

export function RawMaterials() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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

      setMaterials((materialsRes.data || []).map(material => ({
        ...material,
        suppliers: material.suppliers && typeof material.suppliers === 'object' && material.suppliers !== null && 'id' in (material.suppliers as object) 
          ? material.suppliers as Supplier
          : undefined
      })));
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Materia Prima</span>
            </button>
          </div>
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
                      <span className="font-medium text-gray-900">
                        {material.current_stock_kg}
                      </span>
                      {material.current_stock_kg < material.min_stock_units && (
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

      {/* Modal de Importación */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Importar Materias Primas</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Instrucciones */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-900 mb-2">Instrucciones de importación</h3>
                      <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                        <li>Descarga la plantilla Excel con las columnas requeridas</li>
                        <li>Completa la información de las materias primas</li>
                        <li>Guarda el archivo y súbelo usando el botón de abajo</li>
                        <li>Revisa los datos antes de confirmar la importación</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Formato requerido */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Columnas requeridas en el archivo Excel:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Código:</strong> Código único de la materia prima</p>
                      <p><strong>Nombre:</strong> Nombre del producto</p>
                      <p><strong>Descripción:</strong> Descripción detallada</p>
                      <p><strong>Proveedor:</strong> Nombre o código del proveedor</p>
                      <p><strong>Código Proveedor:</strong> Referencia del proveedor</p>
                      <p><strong>Unidad de Medida:</strong> kg, L, unidades, etc.</p>
                    </div>
                    <div>
                      <p><strong>Precio por Unidad:</strong> Precio unitario</p>
                      <p><strong>MOQ (kg):</strong> Cantidad mínima de orden</p>
                      <p><strong>Vida Útil (días):</strong> Días de conservación</p>
                      <p><strong>Tiempo Entrega (días):</strong> Días de lead time</p>
                      <p><strong>Stock Seguridad (kg):</strong> Stock de seguridad</p>
                      <p><strong>Stock Actual (kg):</strong> Stock inicial</p>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-4">
                  {/* Descargar plantilla */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Paso 1: Descargar Plantilla
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Descarga la plantilla Excel con el formato correcto
                    </p>
                    <button
                      onClick={() => {
                        // Aquí irían las familias de productos especificadas
                        const templateData = [
                          {
                            'Código': 'MP-001',
                            'Nombre': 'Ácido Cítrico',
                            'Descripción': 'Ácido cítrico anhidro grado alimentario',
                            'Familia': 'Materia Prima',
                            'Proveedor': 'PROV-001',
                            'Código Proveedor': 'AC-25KG',
                            'Unidad de Medida': 'kg',
                            'Precio por Unidad': '3500',
                            'MOQ (kg)': '25',
                            'Vida Útil (días)': '365',
                            'Tiempo Entrega (días)': '7',
                            'Stock Seguridad (kg)': '50',
                            'Stock Actual (kg)': '0'
                          },
                          {
                            'Código': 'EMP-001',
                            'Nombre': 'Bolsa Transparente 100g',
                            'Descripción': 'Bolsa de polipropileno transparente',
                            'Familia': 'Empaques',
                            'Proveedor': 'PROV-002',
                            'Código Proveedor': 'BT-100',
                            'Unidad de Medida': 'unidades',
                            'Precio por Unidad': '85',
                            'MOQ (kg)': '1000',
                            'Vida Útil (días)': '1800',
                            'Tiempo Entrega (días)': '3',
                            'Stock Seguridad (kg)': '500',
                            'Stock Actual (kg)': '0'
                          }
                        ];

                        // Simular descarga de archivo
                        console.log('Descargando plantilla con datos:', templateData);
                        alert('Se descargará la plantilla Excel con las familias:\n• Materia Prima\n• Empaques\n• Gomas al Granel\n• Producto Final');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Descargar Plantilla Excel
                    </button>
                  </div>

                  {/* Subir archivo */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Paso 2: Subir Archivo Completado
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Selecciona el archivo Excel con los datos completados
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      id="import-file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log('Archivo seleccionado:', file.name);
                          alert(`Archivo "${file.name}" cargado correctamente.\n\nEn una implementación real, aquí se procesaría el archivo y se mostrarían los datos para revisión antes de importar.`);
                        }
                      }}
                    />
                    <label
                      htmlFor="import-file"
                      className="cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-block"
                    >
                      Seleccionar Archivo
                    </label>
                  </div>
                </div>

                {/* Notas importantes */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium mb-1">Notas importantes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Los códigos de materia prima deben ser únicos</li>
                        <li>Las familias deben ser: Materia Prima, Empaques, Gomas al Granel, o Producto Final</li>
                        <li>Los proveedores deben existir previamente en el sistema</li>
                        <li>Se validarán todos los datos antes de importar</li>
                        <li>Los productos duplicados serán omitidos</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones del modal */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}