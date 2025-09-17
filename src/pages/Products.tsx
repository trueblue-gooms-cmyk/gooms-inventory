// src/pages/Products.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit2, Trash2, Upload } from 'lucide-react';
import { useCanEdit } from '@/stores/useAppStore';
import { CsvImporter } from '@/components/CsvImporter';
import { ProductFormModal } from '@/components/ProductFormModal';

interface Product {
  id: string;
  sku: string;
  name: string;
  type: string;
  weight_grams: number | null;
  units_per_box: number | null;
  shelf_life_days: number | null;
  min_stock_units: number | null;
  safety_stock_units: number | null;
  is_active: boolean;
  created_at: string;
}


export function Products() {
  const [showImporter, setShowImporter] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const canEdit = useCanEdit();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    type: 'frasco',
    weight_grams: '',
    units_per_box: '',
    shelf_life_days: '365',
    min_stock_units: '',
    safety_stock_units: '',
    is_active: true,
  });

  // Estado para validación de SKU
  const [skuError, setSkuError] = useState('');
  const skuValidationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // helper para convertir números de forma segura
  const toNumOrNull = (v: string) => {
    if (v === '' || v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // === NUEVO: validación de SKU en tiempo real ===
  const validateSKU = async (sku: string) => {
    setSkuError('');
    const normalized = sku?.trim();
    if (!normalized || normalized.length < 2) return;

    const { data, error } = await supabase
      .from('products')
      .select('sku')
      .eq('sku', normalized)
      .maybeSingle(); // evita lanzar error si no hay fila

    if (error) {
      console.warn('SKU check error:', error);
      return;
    }
    // Si estamos editando y el SKU coincide con el del registro actual, no marcar error
    if (editingProduct && editingProduct.sku === normalized) return;

    if (data) setSkuError('Este SKU ya existe');
    else setSkuError('');
  };

  // === NUEVO: crear producto con verificación de unicidad y manejo de 23505 ===
  const createProduct = async (productData: unknown) => {
    try {
      // Verificar si el SKU ya existe antes de crear
      const { data: existingProduct } = await supabase
        .from('products')
        .select('sku')
        .eq('sku', (productData as any).sku)
        .maybeSingle();

      if (existingProduct) {
        toast({
          title: "Error",
          description: `Ya existe un producto con el SKU "${(productData as any).sku}"`,
          variant: "destructive"
        });
        return;
      }

      // Crear el producto si el SKU es único
      const { error } = await supabase.from('products').insert([productData as any]).select().single();

      if (error) {
        // Manejar diferentes tipos de errores (por ejemplo, violación de clave única)
        if ((error as any).code === '23505') {
          toast({
            title: "Error",
            description: `El SKU "${(productData as any).sku}" ya está en uso. Por favor usa un SKU diferente.`,
            variant: "destructive"
          });
        } else {
          console.error('Error creating product:', error);
          toast({
            title: "Error",
            description: 'Error creando producto: ' + (error as any).message,
            variant: "destructive"
          });
        }
        return;
      }

      toast({
        title: "Éxito",
        description: "Producto creado exitosamente"
      });
      setShowModal(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al crear producto",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validaciones mínimas
      if (!formData.sku.trim() || !formData.name.trim() || !formData.type.trim()) {
        alert('SKU, Nombre y Tipo son obligatorios');
        return;
      }
      if (skuError) {
        alert('Corrige el SKU antes de continuar');
        return;
      }

      const productData = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        type: formData.type.trim(),
        weight_grams: toNumOrNull(formData.weight_grams),
        units_per_box: toNumOrNull(formData.units_per_box),
        shelf_life_days: toNumOrNull(formData.shelf_life_days),
        min_stock_units: toNumOrNull(formData.min_stock_units),
        safety_stock_units: toNumOrNull(formData.safety_stock_units),
        is_active: formData.is_active,
      };

      if (editingProduct) {
        // Si cambia el SKU en edición, validarlo contra otros registros
        if (editingProduct.sku !== productData.sku) {
          const { data: skuTaken } = await supabase
            .from('products')
            .select('id')
            .eq('sku', productData.sku)
            .maybeSingle();
          if (skuTaken) {
            toast({
              title: "Error",
              description: `El SKU "${productData.sku}" ya está en uso.`,
              variant: "destructive"
            });
            return;
          }
        }

        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) {
          if ((error as any).code === '23505') {
            toast({
              title: "Error",
              description: `El SKU "${productData.sku}" ya está en uso.`,
              variant: "destructive"
            });
          } else {
            console.error('Error updating product:', error);
            toast({
              title: "Error",
              description: "Error actualizando producto",
              variant: "destructive"
            });
          }
          return;
        }

        toast({
          title: "Éxito",
          description: "Cambios guardados"
        });
        setShowModal(false);
        resetForm();
        loadProducts();
      } else {
        // Crear
        await createProduct(productData);
      }
    } catch (e: unknown) {
      console.error('Error saving product:', e);
      alert((e as any)?.message || 'Error al guardar el producto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku ?? '',
      name: product.name ?? '',
      type: product.type ?? 'frasco',
      weight_grams: product.weight_grams?.toString() ?? '',
      units_per_box: product.units_per_box?.toString() ?? '',
      shelf_life_days: product.shelf_life_days?.toString() ?? '365',
      min_stock_units: product.min_stock_units?.toString() ?? '',
      safety_stock_units: product.safety_stock_units?.toString() ?? '',
      is_active: product.is_active ?? true,
    });
    setSkuError('');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      type: 'frasco',
      weight_grams: '',
      units_per_box: '',
      shelf_life_days: '365',
      min_stock_units: '',
      safety_stock_units: '',
      is_active: true,
    });
    setSkuError('');
    setEditingProduct(null);
    if (skuValidationTimeout.current) {
      clearTimeout(skuValidationTimeout.current);
      skuValidationTimeout.current = null;
    }
  };

  const filteredProducts = products.filter((product) =>
    (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-1">Gestión de SKUs y referencias</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowImporter(true)}
              className="flex items-center gap-2 px-4 py-2 border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50"
            >
              <Upload className="w-4 h-4" />
              <span>Importar CSV</span>
            </button>
            <button
              onClick={() => setShowProductModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peso (g)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Seguridad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                {canEdit && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      {product.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.weight_grams ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.min_stock_units ?? '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingProduct(product);
                            setShowProductModal(true);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)} 
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
            <h2 className="text-xl font-bold mb-4">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => {
                      const next = e.target.value;
                      setFormData({ ...formData, sku: next });
                      if (skuValidationTimeout.current) clearTimeout(skuValidationTimeout.current);
                      skuValidationTimeout.current = setTimeout(() => validateSKU(next), 500);
                    }}
                    onBlur={() => validateSKU(formData.sku)}
                    className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      skuError ? 'border border-red-300 bg-red-50' : 'border border-gray-300'
                    }`}
                    placeholder="Ej: GOOM-PROD-001"
                  />
                  {skuError && <p className="text-red-600 text-sm mt-1">{skuError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="frasco">Frasco</option>
                    <option value="sachet">Sachet</option>
                    <option value="refill">Refill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (gramos)</label>
                  <input
                    type="number"
                    value={formData.weight_grams}
                    onChange={(e) => setFormData({ ...formData, weight_grams: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidades por caja</label>
                  <input
                    type="number"
                    value={formData.units_per_box}
                    onChange={(e) => setFormData({ ...formData, units_per_box: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vida útil (días)</label>
                  <input
                    type="number"
                    value={formData.shelf_life_days}
                    onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock de Seguridad</label>
                  <input
                    type="number"
                    value={formData.min_stock_units}
                    onChange={(e) => setFormData({ ...formData, min_stock_units: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock de seguridad</label>
                  <input
                    type="number"
                    value={formData.safety_stock_units}
                    onChange={(e) => setFormData({ ...formData, safety_stock_units: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Producto activo</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Importer */}
      {showImporter && (
        <CsvImporter
          tableName="products"
          columns={[
            { field: 'sku', label: 'SKU', required: true },
            { field: 'name', label: 'Nombre', required: true },
            { field: 'type', label: 'Tipo', required: true },
            { field: 'weight_grams', label: 'Peso (g)', type: 'number' },
            { field: 'units_per_box', label: 'Unidades por caja', type: 'number' },
            { field: 'shelf_life_days', label: 'Vida útil (días)', type: 'number' },
            { field: 'min_stock_units', label: 'Stock de Seguridad', type: 'number' },
            { field: 'safety_stock_units', label: 'Stock seguridad', type: 'number' },
          ]}
          onSuccess={loadProducts}
          onClose={() => setShowImporter(false)}
        />
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {
          loadProducts();
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        editingProduct={editingProduct}
      />
    </div>
  );
}
