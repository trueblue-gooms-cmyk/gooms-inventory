import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProduct?: any | null;
}

const PRODUCT_TYPES = [
  {
    value: 'materia_prima',
    label: 'Materia Prima',
    description: 'Ingredientes base para producción',
    fields: ['code', 'name', 'description', 'unit_measure', 'shelf_life_days', 'supplier_id', 'price_per_unit']
  },
  {
    value: 'empaques',
    label: 'Empaques',
    description: 'Material de empaque y etiquetado',
    fields: ['code', 'name', 'type', 'unit_measure', 'supplier_id', 'price_per_unit', 'moq_units']
  },
  {
    value: 'gomas_granel',
    label: 'Gomas al Granel',
    description: 'Producto semi-terminado a granel',
    fields: ['sku', 'name', 'weight_grams', 'shelf_life_days', 'min_stock_units']
  },
  {
    value: 'producto_final',
    label: 'Producto Final',
    description: 'SKUs listos para venta',
    fields: ['sku', 'name', 'type', 'weight_grams', 'units_per_box', 'shelf_life_days', 'min_stock_units', 'unit_cost']
  }
];

export function ProductFormModal({ isOpen, onClose, onSuccess, editingProduct }: ProductFormModalProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      if (editingProduct) {
        setSelectedType(editingProduct.product_type || 'producto_final');
        setFormData(editingProduct);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingProduct]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const resetForm = () => {
    setSelectedType('');
    setFormData({});
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: any = {};
    const typeConfig = PRODUCT_TYPES.find(t => t.value === selectedType);
    
    if (!selectedType) {
      newErrors.product_type = 'Tipo de producto es obligatorio';
    }

    if (!typeConfig) return newErrors;

    // Validar campos obligatorios según el tipo
    if (typeConfig.fields.includes('sku') && !formData.sku?.trim()) {
      newErrors.sku = 'SKU es obligatorio';
    }
    if (typeConfig.fields.includes('code') && !formData.code?.trim()) {
      newErrors.code = 'Código es obligatorio';
    }
    if (typeConfig.fields.includes('name') && !formData.name?.trim()) {
      newErrors.name = 'Nombre es obligatorio';
    }
    if (typeConfig.fields.includes('unit_measure') && !formData.unit_measure?.trim()) {
      newErrors.unit_measure = 'Unidad de medida es obligatoria';
    }

    // Validaciones numéricas
    const numericFields = ['weight_grams', 'units_per_box', 'shelf_life_days', 'min_stock_units', 'price_per_unit', 'moq_units', 'unit_cost'];
    numericFields.forEach(field => {
      if (typeConfig.fields.includes(field) && formData[field] && isNaN(Number(formData[field]))) {
        newErrors[field] = 'Debe ser un número válido';
      }
    });

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Errores de validación",
        description: "Por favor corrige los errores marcados",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const typeConfig = PRODUCT_TYPES.find(t => t.value === selectedType);
      if (!typeConfig) throw new Error('Tipo de producto no válido');

      // Preparar datos según el tipo de producto
      let productData: any = {
        product_type: selectedType,
        is_active: true
      };

      // Agregar campos específicos del tipo
      typeConfig.fields.forEach(field => {
        if (formData[field] !== undefined && formData[field] !== '') {
          if (['weight_grams', 'units_per_box', 'shelf_life_days', 'min_stock_units', 'price_per_unit', 'moq_units', 'unit_cost'].includes(field)) {
            productData[field] = Number(formData[field]) || null;
          } else {
            productData[field] = formData[field];
          }
        }
      });

      // Por ahora usar solo la tabla products hasta que se configure completamente
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        
        toast({
          title: "Producto actualizado",
          description: "El producto se ha actualizado correctamente",
          variant: "default"
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        
        if (error) throw error;
        
        toast({
          title: "Producto creado",
          description: "El producto se ha creado correctamente",
          variant: "default"
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar el producto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: string) => {
    const isRequired = ['sku', 'code', 'name', 'unit_measure'].includes(field);
    const hasError = errors[field];

    const getFieldLabel = (field: string) => {
      const labels: { [key: string]: string } = {
        sku: 'SKU',
        code: 'Código',
        name: 'Nombre',
        description: 'Descripción',
        type: 'Tipo',
        unit_measure: 'Unidad de Medida',
        weight_grams: 'Peso (gramos)',
        units_per_box: 'Unidades por Caja',
        shelf_life_days: 'Vida Útil (días)',
        min_stock_units: 'Stock Mínimo',
        price_per_unit: 'Precio por Unidad',
        moq_units: 'Cantidad Mínima de Orden',
        unit_cost: 'Costo Unitario',
        supplier_id: 'Proveedor'
      };
      return labels[field] || field;
    };

    if (field === 'supplier_id') {
      return (
        <div key={field} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {getFieldLabel(field)}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={formData[field] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar proveedor</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} ({supplier.code})
              </option>
            ))}
          </select>
          {hasError && (
            <div className="flex items-center space-x-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{hasError}</span>
            </div>
          )}
        </div>
      );
    }

    if (field === 'description') {
      return (
        <div key={field} className="space-y-2 col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            {getFieldLabel(field)}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={formData[field] || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder={`Descripción del ${selectedType.replace('_', ' ')}`}
          />
          {hasError && (
            <div className="flex items-center space-x-1 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{hasError}</span>
            </div>
          )}
        </div>
      );
    }

    const isNumeric = ['weight_grams', 'units_per_box', 'shelf_life_days', 'min_stock_units', 'price_per_unit', 'moq_units', 'unit_cost'].includes(field);

    return (
      <div key={field} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {getFieldLabel(field)}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={isNumeric ? 'number' : 'text'}
          value={formData[field] || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
            hasError ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          placeholder={getFieldLabel(field)}
          min={isNumeric ? "0" : undefined}
          step={field === 'price_per_unit' || field === 'unit_cost' ? "0.01" : "1"}
        />
        {hasError && (
          <div className="flex items-center space-x-1 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{hasError}</span>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const selectedTypeConfig = PRODUCT_TYPES.find(t => t.value === selectedType);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-thin text-gray-900">
              {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100/50 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selector de tipo de producto */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Producto <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRODUCT_TYPES.map(type => (
                  <div
                    key={type.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedType === type.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                    onClick={() => {
                      setSelectedType(type.value);
                      setFormData({});
                      setErrors({});
                    }}
                  >
                    <h3 className="font-medium text-gray-900">{type.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </div>
                ))}
              </div>
              {errors.product_type && (
                <div className="flex items-center space-x-1 text-red-600 text-sm mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.product_type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Campos dinámicos según el tipo */}
          {selectedTypeConfig && (
            <div className="space-y-6">
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Información del {selectedTypeConfig.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTypeConfig.fields.map(field => renderField(field))}
                </div>
              </div>
            </div>
          )}

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
              disabled={loading || !selectedType}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}