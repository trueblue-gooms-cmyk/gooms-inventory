/**
 * Página unificada de Productos y Materias Primas
 * Simplifica el flujo eliminando duplicación entre Products.tsx y RawMaterials.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Package2,
  Factory,
  Box,
  ShoppingCart,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Eye,
  Package,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormModal, useImportModal } from '@/hooks/useModal';
import { useErrorHandler } from '@/utils/errorHandler';
import { formatCurrency, formatNumber, getStatusColor, getStatusLabel } from '@/utils/formatters';
import { useSecurity } from '@/utils/security';
import { useValidation, validationRules } from '@/utils/validators';
import { useCanEdit } from '@/hooks/useSecureAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Tipos unificados para todos los productos
export type ProductType = 'materia_prima' | 'empaques' | 'gomas_granel' | 'producto_final';

export interface UnifiedProduct {
  id: string;
  code: string; // SKU para productos finales, código para materias primas
  name: string;
  description?: string;
  type: ProductType;

  // Campos comunes
  unit_measure: string;
  unit_cost: number;
  min_stock_units: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Campos específicos de materias primas
  supplier_id?: string;
  supplier_code?: string;
  moq_kg?: number;
  shelf_life_days?: number;
  lead_time_days?: number;
  safety_stock_kg?: number;

  // Campos específicos de productos finales
  selling_price?: number;
  margin_percentage?: number;
  barcode?: string;
  weight_grams?: number;

  // Relaciones
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Supplier {
  id: string;
  name: string;
  code: string;
}

const PRODUCT_TYPES = [
  {
    value: 'materia_prima',
    label: 'Materia Prima',
    icon: <Factory className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Ingredientes base para producción'
  },
  {
    value: 'empaques',
    label: 'Empaques',
    icon: <Package className="w-4 h-4" />,
    color: 'bg-green-500',
    description: 'Material de empaque y etiquetado'
  },
  {
    value: 'gomas_granel',
    label: 'Gomas al Granel',
    icon: <Box className="w-4 h-4" />,
    color: 'bg-purple-500',
    description: 'Producto semi-terminado a granel'
  },
  {
    value: 'producto_final',
    label: 'Producto Final',
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'bg-orange-500',
    description: 'SKUs listos para venta'
  }
] as const;

export function UnifiedProducts() {
  const [products, setProducts] = useState<UnifiedProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ProductType | 'all'>('all');

  const { toast } = useToast();
  const { handleAsyncError } = useErrorHandler();
  const { canPerform } = useSecurity();
  const canEdit = useCanEdit();
  const modal = useFormModal<UnifiedProduct>();
  const importModal = useImportModal();

  // Estados para importación
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Formulario unificado con campos dinámicos
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'materia_prima' as ProductType,
    unit_measure: 'kg',
    unit_cost: '',
    min_stock_units: '',
    current_stock: '0',
    is_active: true,

    // Campos específicos de materias primas
    supplier_id: '',
    supplier_code: '',
    moq_kg: '',
    shelf_life_days: '',
    lead_time_days: '',
    safety_stock_kg: '',

    // Campos específicos de productos finales
    selling_price: '',
    margin_percentage: '',
    barcode: '',
    weight_grams: ''
  });

  // Cargar datos
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { error } = await handleAsyncError(async () => {
      setLoading(true);

      // Cargar productos unificados
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          suppliers(id, name, code)
        `)
        .order('name');

      if (productsError) throw productsError;

      // Cargar proveedores
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (suppliersError) throw suppliersError;

      setProducts(productsData || []);
      setSuppliers(suppliersData || []);
    });

    if (error) {
      // Usar datos de demostración
      setProducts(getDemoProducts());
      setSuppliers(getDemoSuppliers());
      toast({
        title: "Usando datos de demostración",
        description: "No se pudieron cargar los datos reales",
        variant: "default"
      });
    }

    setLoading(false);
  };

  // Datos de demostración
  const getDemoProducts = (): UnifiedProduct[] => [
    {
      id: 'demo-mp-1',
      code: 'MP-001',
      name: 'Ácido Cítrico 25kg',
      description: 'Ácido cítrico anhidro grado alimentario',
      type: 'materia_prima',
      unit_measure: 'kg',
      unit_cost: 3500,
      min_stock_units: 50,
      current_stock: 150,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      supplier_id: 'demo-sup-1',
      supplier_code: 'AC-25KG',
      moq_kg: 25,
      shelf_life_days: 365,
      lead_time_days: 7,
      safety_stock_kg: 50,
      supplier: { id: 'demo-sup-1', name: 'Proveedores ABC', code: 'PROV-001' }
    },
    {
      id: 'demo-emp-1',
      code: 'EMP-001',
      name: 'Bolsa Transparente 100g',
      description: 'Bolsa de polipropileno transparente',
      type: 'empaques',
      unit_measure: 'unidades',
      unit_cost: 85,
      min_stock_units: 500,
      current_stock: 2000,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      supplier_id: 'demo-sup-2',
      supplier: { id: 'demo-sup-2', name: 'Empaques del Valle', code: 'PROV-002' }
    },
    {
      id: 'demo-gg-1',
      code: 'GG-001',
      name: 'Gomas Surtidas Mix 5kg',
      description: 'Mezcla de gomas surtidas para empaque',
      type: 'gomas_granel',
      unit_measure: 'kg',
      unit_cost: 28000,
      min_stock_units: 10,
      current_stock: 45,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo-pf-1',
      code: 'PF-001',
      name: 'Gomas Ácidas Premium 100g',
      description: 'Gomas ácidas premium empacadas para venta',
      type: 'producto_final',
      unit_measure: 'unidades',
      unit_cost: 1200,
      min_stock_units: 100,
      current_stock: 350,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      selling_price: 2500,
      margin_percentage: 108,
      barcode: '7702001234567',
      weight_grams: 100
    }
  ];

  const getDemoSuppliers = (): Supplier[] => [
    { id: 'demo-sup-1', name: 'Proveedores ABC', code: 'PROV-001' },
    { id: 'demo-sup-2', name: 'Empaques del Valle', code: 'PROV-002' },
    { id: 'demo-sup-3', name: 'Distribuidora XYZ', code: 'PROV-003' }
  ];

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || product.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Abrir modal para crear
  const handleCreate = () => {
    resetForm();
    modal.openCreateModal();
  };

  // Abrir modal para editar
  const handleEdit = (product: UnifiedProduct) => {
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || '',
      type: product.type,
      unit_measure: product.unit_measure,
      unit_cost: product.unit_cost.toString(),
      min_stock_units: product.min_stock_units.toString(),
      current_stock: product.current_stock.toString(),
      is_active: product.is_active,

      // Campos específicos de materias primas
      supplier_id: product.supplier_id || '',
      supplier_code: product.supplier_code || '',
      moq_kg: product.moq_kg?.toString() || '',
      shelf_life_days: product.shelf_life_days?.toString() || '',
      lead_time_days: product.lead_time_days?.toString() || '',
      safety_stock_kg: product.safety_stock_kg?.toString() || '',

      // Campos específicos de productos finales
      selling_price: product.selling_price?.toString() || '',
      margin_percentage: product.margin_percentage?.toString() || '',
      barcode: product.barcode || '',
      weight_grams: product.weight_grams?.toString() || ''
    });
    modal.openEditModal(product);
  };

  // Enviar formulario
  const handleSubmit = async () => {
    console.log('🔄 Iniciando creación/edición de producto...', formData);

    // Validaciones básicas
    if (!formData.code || !formData.name || !formData.unit_measure) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa código, nombre y unidad de medida",
        variant: "destructive"
      });
      return;
    }

    if (!formData.unit_cost || parseFloat(formData.unit_cost) <= 0) {
      toast({
        title: "Costo inválido",
        description: "El costo unitario debe ser mayor a 0",
        variant: "destructive"
      });
      return;
    }

    try {
      // Crear objeto base del producto
      const productData: any = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        unit_measure: formData.unit_measure,
        unit_cost: parseFloat(formData.unit_cost) || 0,
        min_stock_units: parseInt(formData.min_stock_units) || 0,
        current_stock: parseInt(formData.current_stock) || 0,
        is_active: formData.is_active ?? true
      };

      // Agregar campos específicos según tipo solo si tienen valor
      if (formData.type === 'materia_prima') {
        if (formData.supplier_code) productData.supplier_code = formData.supplier_code;
        if (formData.moq_kg) productData.moq_kg = parseFloat(formData.moq_kg);
        if (formData.shelf_life_days) productData.shelf_life_days = parseInt(formData.shelf_life_days);
        if (formData.lead_time_days) productData.lead_time_days = parseInt(formData.lead_time_days);
        if (formData.safety_stock_kg) productData.safety_stock_kg = parseFloat(formData.safety_stock_kg);
      }

      if (formData.type === 'producto_final') {
        if (formData.selling_price) productData.selling_price = parseFloat(formData.selling_price);
        if (formData.margin_percentage) productData.margin_percentage = parseFloat(formData.margin_percentage);
        if (formData.barcode) productData.barcode = formData.barcode;
        if (formData.weight_grams) productData.weight_grams = parseInt(formData.weight_grams);
      }

      console.log('📦 Datos del producto a enviar:', productData);

      if (modal.isEditing && modal.data) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', modal.data.id);

        if (error) throw error;

        toast({
          title: "Producto actualizado",
          description: `${productData.name} ha sido actualizado correctamente`
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;

        toast({
          title: "Producto creado",
          description: `${productData.name} ha sido creado correctamente`
        });
      }

      modal.closeModal();
      loadData();
    } catch (error: any) {
      console.error('❌ Error al crear/editar producto:', error);
      toast({
        title: "Error",
        description: error.message || 'Error desconocido al procesar el producto',
        variant: "destructive"
      });
    }
  };

  // Eliminar producto
  const handleDelete = async (product: UnifiedProduct) => {
    if (!confirm(`¿Estás seguro de eliminar ${product.name}?`)) return;

    const { error } = await handleAsyncError(async () => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Producto eliminado",
        description: `${product.name} ha sido eliminado`
      });

      loadData();
    });

    if (error) {
      toast({
        title: "Error",
        description: error.userMessage,
        variant: "destructive"
      });
    }
  };

  // Manejar archivo de importación
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Por favor selecciona un archivo CSV o Excel (.xls, .xlsx)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo no puede superar los 5MB",
        variant: "destructive"
      });
      return;
    }

    setImportFile(file);

    // Simular preview de datos
    const sampleData = [
      { codigo: 'MP001', nombre: 'Ácido Cítrico 25kg', tipo: 'materia_prima', costo: 85000 },
      { codigo: 'EMP001', nombre: 'Bolsas Transparentes', tipo: 'empaques', costo: 850 },
      { codigo: 'PF001', nombre: 'Gomas Surtidas 5kg', tipo: 'producto_final', costo: 28000 }
    ];
    setImportPreview(sampleData);

    toast({
      title: "Archivo cargado",
      description: `Se detectaron ${sampleData.length} productos para importar`,
      variant: "default"
    });
  };

  // Procesar importación
  const processImport = async () => {
    if (!importFile || importPreview.length === 0) return;

    setImportLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const item of importPreview) {
        try {
          const productData = {
            code: item.codigo?.toUpperCase() || '',
            name: item.nombre || '',
            type: item.tipo || 'producto_final',
            unit_measure: 'unidades',
            unit_cost: parseFloat(item.costo) || 0,
            min_stock_units: 0,
            current_stock: 0,
            is_active: true,
            description: item.descripcion || ''
          };

          const { error } = await supabase
            .from('products')
            .insert([productData]);

          if (error) {
            console.error('Error importing product:', productData.name, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error('Error processing item:', item, err);
          errorCount++;
        }
      }

      toast({
        title: "Importación completada",
        description: `${successCount} productos importados exitosamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      if (successCount > 0) {
        loadData();
        importModal.closeImportModal();
        setImportFile(null);
        setImportPreview([]);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error en importación",
        description: "Ocurrió un error durante la importación",
        variant: "destructive"
      });
    } finally {
      setImportLoading(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'materia_prima',
      unit_measure: 'kg',
      unit_cost: '',
      min_stock_units: '',
      current_stock: '0',
      is_active: true,
      supplier_id: '',
      supplier_code: '',
      moq_kg: '',
      shelf_life_days: '',
      lead_time_days: '',
      safety_stock_kg: '',
      selling_price: '',
      margin_percentage: '',
      barcode: '',
      weight_grams: ''
    });
  };

  // Obtener configuración del tipo seleccionado
  const getTypeConfig = (type: ProductType) => {
    return PRODUCT_TYPES.find(t => t.value === type) || PRODUCT_TYPES[0];
  };

  // Campos que se muestran según el tipo
  const getFieldsForType = (type: ProductType) => {
    const baseFields = ['code', 'name', 'description', 'unit_measure', 'unit_cost', 'min_stock_units'];

    switch (type) {
      case 'materia_prima':
        return [
          ...baseFields,
          'supplier_id',
          'supplier_code',
          'moq_kg',
          'shelf_life_days',
          'lead_time_days',
          'safety_stock_kg'
        ];

      case 'producto_final':
        return [
          ...baseFields,
          'selling_price',
          'margin_percentage',
          'barcode',
          'weight_grams'
        ];

      default:
        return baseFields;
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
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Catálogo de Productos</h1>
            <p className="text-gray-600 mt-1">
              Gestión unificada de materias primas, empaques, gomas al granel y productos finales
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => importModal.openImportModal()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Upload className="w-4 h-4" />
                <span>Importar</span>
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ProductType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Todos los tipos</option>
                {PRODUCT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Métricas rápidas por tipo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {PRODUCT_TYPES.map(type => {
            const count = products.filter(p => p.type === type.value).length;
            const lowStock = products.filter(p =>
              p.type === type.value && p.current_stock <= p.min_stock_units
            ).length;

            return (
              <div key={type.value} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 ${type.color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                    {type.icon}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">productos</p>
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{type.label}</h3>
                <p className="text-xs text-gray-600">{type.description}</p>
                {lowStock > 0 && (
                  <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {lowStock} con stock bajo
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tabla de productos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  {canEdit && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Archive className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No se encontraron productos</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const typeConfig = getTypeConfig(product.type);
                    const stockStatus = product.current_stock <= product.min_stock_units ? 'low' : 'optimal';

                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 ${typeConfig.color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                              {typeConfig.icon}
                            </div>
                            <span className="text-sm text-gray-700">{typeConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-gray-900">{product.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-gray-500">{product.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatNumber(product.current_stock)} {product.unit_measure}
                            </p>
                            <p className="text-xs text-gray-500">Mín: {product.min_stock_units}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(product.unit_cost)}
                            </p>
                            <p className="text-xs text-gray-500">por {product.unit_measure}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(stockStatus)}`}>
                            {getStatusLabel(stockStatus)}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => handleDelete(product)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de formulario */}
        {modal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {modal.isCreating ? 'Crear Nuevo Producto' : 'Editar Producto'}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Selector de tipo (solo al crear) */}
                {modal.isCreating && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Tipo de Producto
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PRODUCT_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                          className={`p-4 border-2 rounded-lg text-left transition-colors ${
                            formData.type === type.value
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 ${type.color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                              {type.icon}
                            </div>
                            <span className="font-medium text-gray-900">{type.label}</span>
                          </div>
                          <p className="text-xs text-gray-600">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campos del formulario dinámicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Código/SKU */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.type === 'producto_final' ? 'SKU' : 'Código'}
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={formData.type === 'producto_final' ? 'PF-001' : 'MP-001'}
                    />
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Descripción */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={2}
                    />
                  </div>

                  {/* Unidad de medida */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                    <select
                      value={formData.unit_measure}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_measure: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="l">Litros (l)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="unidades">Unidades</option>
                      <option value="cajas">Cajas</option>
                      <option value="paquetes">Paquetes</option>
                    </select>
                  </div>

                  {/* Costo unitario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario</label>
                    <input
                      type="number"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Stock mínimo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      value={formData.min_stock_units}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_stock_units: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="0"
                    />
                  </div>

                  {/* Campos específicos de materias primas */}
                  {formData.type === 'materia_prima' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                        <select
                          value={formData.supplier_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Seleccionar proveedor</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name} ({supplier.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código del Proveedor</label>
                        <input
                          type="text"
                          value={formData.supplier_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplier_code: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">MOQ (kg)</label>
                        <input
                          type="number"
                          value={formData.moq_kg}
                          onChange={(e) => setFormData(prev => ({ ...prev, moq_kg: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vida Útil (días)</label>
                        <input
                          type="number"
                          value={formData.shelf_life_days}
                          onChange={(e) => setFormData(prev => ({ ...prev, shelf_life_days: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de Entrega (días)</label>
                        <input
                          type="number"
                          value={formData.lead_time_days}
                          onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock de Seguridad (kg)</label>
                        <input
                          type="number"
                          value={formData.safety_stock_kg}
                          onChange={(e) => setFormData(prev => ({ ...prev, safety_stock_kg: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                        />
                      </div>
                    </>
                  )}

                  {/* Campos específicos de productos finales */}
                  {formData.type === 'producto_final' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta</label>
                        <input
                          type="number"
                          value={formData.selling_price}
                          onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Margen (%)</label>
                        <input
                          type="number"
                          value={formData.margin_percentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, margin_percentage: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                        <input
                          type="text"
                          value={formData.barcode}
                          onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso (gramos)</label>
                        <input
                          type="number"
                          value={formData.weight_grams}
                          onChange={(e) => setFormData(prev => ({ ...prev, weight_grams: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={modal.closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  {modal.isCreating ? 'Crear Producto' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de importación funcional */}
        {importModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Importar Productos</h2>
                  <button
                    onClick={() => {
                      importModal.closeImportModal();
                      setImportFile(null);
                      setImportPreview([]);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {!importFile ? (
                  /* Paso 1: Seleccionar archivo */
                  <div className="text-center">
                    <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Seleccionar Archivo
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Selecciona un archivo CSV o Excel con los productos a importar
                    </p>

                    <div className="mb-6">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Haz clic para cargar</span> o arrastra el archivo aquí
                          </p>
                          <p className="text-xs text-gray-500">CSV, XLS, XLSX (máx. 5MB)</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".csv,.xls,.xlsx"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>

                    <div className="text-left bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Formato esperado:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>codigo:</strong> Código único del producto</li>
                        <li>• <strong>nombre:</strong> Nombre del producto</li>
                        <li>• <strong>tipo:</strong> materia_prima, empaques, gomas_granel, producto_final</li>
                        <li>• <strong>costo:</strong> Costo unitario (número)</li>
                        <li>• <strong>descripcion:</strong> Descripción (opcional)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  /* Paso 2: Preview y confirmación */
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Vista Previa - {importFile.name}
                      </h3>
                      <p className="text-gray-600">
                        Se encontraron {importPreview.length} productos para importar
                      </p>
                    </div>

                    {importPreview.length > 0 && (
                      <div className="mb-6 overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Costo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {importPreview.slice(0, 5).map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.codigo}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.nombre}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">{item.tipo}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">${item.costo?.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importPreview.length > 5 && (
                          <p className="text-sm text-gray-500 mt-2">
                            ... y {importPreview.length - 5} productos más
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setImportFile(null);
                          setImportPreview([]);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cambiar Archivo
                      </button>
                      <button
                        onClick={processImport}
                        disabled={importLoading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {importLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                            Importando...
                          </>
                        ) : (
                          `Importar ${importPreview.length} Productos`
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}