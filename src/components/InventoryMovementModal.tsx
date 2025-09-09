import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type MovementType = Database['public']['Enums']['movement_type'];
type Product = Database['public']['Tables']['products']['Row'];
type Location = Database['public']['Tables']['locations']['Row'];

interface InventoryMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InventoryMovementModal: React.FC<InventoryMovementModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: '' as MovementType,
    quantity: '',
    unit_cost: '',
    from_location_id: '',
    to_location_id: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchLocations();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      toast.error('Error cargando productos');
      return;
    }

    setProducts(data || []);
  };

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      toast.error('Error cargando ubicaciones');
      return;
    }

    setLocations(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const quantity = parseInt(formData.quantity);
      const unitCost = formData.unit_cost ? parseFloat(formData.unit_cost) : null;
      
      if (isNaN(quantity) || quantity <= 0) {
        toast.error('La cantidad debe ser un número positivo');
        return;
      }

      const movementData = {
        product_id: formData.product_id,
        movement_type: formData.movement_type,
        quantity,
        unit_cost: unitCost,
        total_cost: unitCost ? unitCost * quantity : null,
        from_location_id: formData.from_location_id || null,
        to_location_id: formData.to_location_id || null,
        notes: formData.notes || null
      };

      const { error } = await supabase
        .from('inventory_movements')
        .insert([movementData]);

      if (error) {
        console.error('Error creating movement:', error);
        toast.error('Error creando movimiento de inventario');
        return;
      }

      toast.success('Movimiento de inventario creado exitosamente');
      onSuccess?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      movement_type: '' as MovementType,
      quantity: '',
      unit_cost: '',
      from_location_id: '',
      to_location_id: '',
      notes: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Producto *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement_type">Tipo de Movimiento *</Label>
            <Select
              value={formData.movement_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, movement_type: value as MovementType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="salida">Salida</SelectItem>
                <SelectItem value="produccion">Producción</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
                <SelectItem value="devolucion">Devolución</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="Cantidad"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit_cost">Costo Unitario</Label>
            <Input
              id="unit_cost"
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          {formData.movement_type === 'produccion' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="from_location">Ubicación Origen</Label>
                <Select
                  value={formData.from_location_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, from_location_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="to_location">Ubicación Destino</Label>
                <Select
                  value={formData.to_location_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, to_location_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Select
                value={formData.to_location_id || formData.from_location_id}
                onValueChange={(value) => {
                  if (formData.movement_type === 'entrada') {
                    setFormData(prev => ({ ...prev, to_location_id: value, from_location_id: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, from_location_id: value, to_location_id: '' }));
                  }
                }}
              >
                <SelectTrigger>
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
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.product_id || !formData.movement_type || !formData.quantity}
            >
              {loading ? 'Creando...' : 'Crear Movimiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};