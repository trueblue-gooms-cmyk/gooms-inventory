import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ErrorHandler, useErrorHandler } from '@/utils/errorHandling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  sku: string;
  shelf_life_days: number;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface ProductionBatchFormProps {
  onSuccess?: (batch: unknown) => void;
  onCancel?: () => void;
}

export function ProductionBatchForm({ onSuccess, onCancel }: ProductionBatchFormProps) {
  const [formData, setFormData] = useState({
    batch_number: '',
    product_id: '',
    location_id: '',
    planned_quantity: '',
    production_date: '',
    expiry_date: '',
    notes: ''
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { errors, isLoading, validateField, clearErrors, handleAsyncOperation } = useErrorHandler();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsResult, locationsResult] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('locations').select('*').eq('type', 'maquila').eq('is_active', true)
      ]);

      if (productsResult.data) setProducts(productsResult.data);
      if (locationsResult.data) setLocations(locationsResult.data);
    } catch (error) {
      ErrorHandler.showError('Error al cargar datos');
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

  const calculateExpiryDate = (productionDate: string, shelfLifeDays: number) => {
    if (!productionDate) return '';
    const prodDate = new Date(productionDate);
    prodDate.setDate(prodDate.getDate() + shelfLifeDays);
    return prodDate.toISOString().split('T')[0];
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setFormData(prev => ({ 
      ...prev, 
      product_id: productId,
      batch_number: prev.batch_number || generateBatchNumber()
    }));

    if (product && formData.production_date) {
      const expiryDate = calculateExpiryDate(formData.production_date, product.shelf_life_days);
      setFormData(prev => ({ ...prev, expiry_date: expiryDate }));
    }
  };

  const handleProductionDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, production_date: date }));
    
    if (selectedProduct && date) {
      const expiryDate = calculateExpiryDate(date, selectedProduct.shelf_life_days);
      setFormData(prev => ({ ...prev, expiry_date: expiryDate }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // Validar campos requeridos
    const validations = [
      { 
        field: 'batch_number', 
        value: formData.batch_number, 
        validators: [(v: unknown) => ErrorHandler.validateRequired(v, 'Número de lote')] 
      },
      { 
        field: 'product_id', 
        value: formData.product_id, 
        validators: [(v: unknown) => ErrorHandler.validateRequired(v, 'Producto')] 
      },
      { 
        field: 'location_id', 
        value: formData.location_id, 
        validators: [(v: unknown) => ErrorHandler.validateRequired(v, 'Ubicación')] 
      },
      { 
        field: 'planned_quantity', 
        value: formData.planned_quantity, 
        validators: [
          (v: unknown) => ErrorHandler.validateRequired(v, 'Cantidad planificada'),
          (v: unknown) => ErrorHandler.validateNumber(v, 'Cantidad planificada', 1)
        ]
      },
      { 
        field: 'production_date', 
        value: formData.production_date, 
        validators: [
          (v: unknown) => ErrorHandler.validateRequired(v, 'Fecha de producción'),
          (v: unknown) => ErrorHandler.validateDate(v, 'Fecha de producción')
        ]
      }
    ];

    let hasErrors = false;
    validations.forEach(({ field, value, validators }) => {
      if (!validateField(field, value, validators)) {
        hasErrors = true;
      }
    });

    if (hasErrors) {
      ErrorHandler.showError('Por favor corrige los errores en el formulario');
      return;
    }

    // Guardar lote
    const result = await handleAsyncOperation(
      async () => {
        const { data, error } = await supabase
          .from('production_batches')
          .insert({
            batch_number: formData.batch_number,
            product_id: formData.product_id,
            location_id: formData.location_id,
            planned_quantity: Number(formData.planned_quantity),
            production_date: formData.production_date,
            expiry_date: formData.expiry_date,
            notes: formData.notes,
            status: 'planned' as 'planned' | 'in_progress' | 'completed' | 'cancelled',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      'batches',
      'Lote de producción creado exitosamente'
    );

    if (result) {
      onSuccess?.(result);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="batch_number">Número de Lote *</Label>
          <Input
            id="batch_number"
            type="text"
            value={formData.batch_number}
            onChange={(e) => setFormData({ ...formData, batch_number: e.target.value.toUpperCase() })}
            className={errors.batch_number ? 'border-destructive' : ''}
            placeholder="BATCH-2025-001"
          />
          {errors.batch_number && (
            <p className="text-destructive text-sm mt-1">{errors.batch_number}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setFormData({ ...formData, batch_number: generateBatchNumber() })}
          >
            Generar Automático
          </Button>
        </div>

        <div>
          <Label htmlFor="product_id">Producto *</Label>
          <Select value={formData.product_id} onValueChange={handleProductChange}>
            <SelectTrigger className={errors.product_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Seleccionar producto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.product_id && (
            <p className="text-destructive text-sm mt-1">{errors.product_id}</p>
          )}
        </div>

        <div>
          <Label htmlFor="location_id">Ubicación *</Label>
          <Select value={formData.location_id} onValueChange={(value) => setFormData({ ...formData, location_id: value })}>
            <SelectTrigger className={errors.location_id ? 'border-destructive' : ''}>
              <SelectValue placeholder="Seleccionar ubicación" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.location_id && (
            <p className="text-destructive text-sm mt-1">{errors.location_id}</p>
          )}
        </div>

        <div>
          <Label htmlFor="planned_quantity">Cantidad Planificada *</Label>
          <Input
            id="planned_quantity"
            type="number"
            min="1"
            value={formData.planned_quantity}
            onChange={(e) => setFormData({ ...formData, planned_quantity: e.target.value })}
            className={errors.planned_quantity ? 'border-destructive' : ''}
            placeholder="100"
          />
          {errors.planned_quantity && (
            <p className="text-destructive text-sm mt-1">{errors.planned_quantity}</p>
          )}
        </div>

        <div>
          <Label htmlFor="production_date">Fecha de Producción *</Label>
          <Input
            id="production_date"
            type="date"
            value={formData.production_date}
            onChange={(e) => handleProductionDateChange(e.target.value)}
            className={errors.production_date ? 'border-destructive' : ''}
          />
          {errors.production_date && (
            <p className="text-destructive text-sm mt-1">{errors.production_date}</p>
          )}
        </div>

        <div>
          <Label htmlFor="expiry_date">Fecha de Vencimiento</Label>
          <Input
            id="expiry_date"
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            placeholder="Se calcula automáticamente"
          />
          {selectedProduct && (
            <p className="text-muted-foreground text-sm mt-1">
              Vida útil: {selectedProduct.shelf_life_days} días
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notas adicionales sobre el lote..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Guardando...' : 'Crear Lote'}
        </Button>
      </div>
    </form>
  );
}