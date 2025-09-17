/**
 * Sistema completo de movimientos de inventario
 * Incluye recepción de mercancía, transferencias entre ubicaciones y despachos
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Package,
  Truck,
  MapPin,
  Calendar,
  User,
  FileText,
  Check,
  X,
  Search,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  PackageCheck,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFormModal } from '@/hooks/useModal';
import { useErrorHandler } from '@/utils/errorHandler';
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';
import { DESIGN_SYSTEM, cn, getStatusStyle } from '@/styles/design-system';
import { useSecurity } from '@/utils/security';
import { useAppStore } from '@/stores/useAppStore';
import { useCanEdit } from '@/hooks/useSecureAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { MovementType } from '@/types/movements';
export type MovementStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled';

export interface InventoryMovement {
  id: string;
  movement_type: MovementType;
  status: MovementStatus;
  product_id: string;
  quantity: number;
  from_location_id?: string;
  to_location_id?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  completed_at?: string;

  // Relaciones
  product?: {
    id: string;
    sku: string;
    name: string;
    type: string;
  };
  from_location?: {
    id: string;
    name: string;
    code: string;
  };
  to_location?: {
    id: string;
    name: string;
    code: string;
  };
  created_by_profile?: {
    id: string;
    full_name: string;
  };
}

const MOVEMENT_TYPES = [
  {
    value: 'entrada',
    label: 'Entrada',
    icon: <ArrowDownLeft className="w-4 h-4" />,
    color: 'bg-green-500',
    description: 'Recepción de mercancía'
  },
  {
    value: 'salida',
    label: 'Salida',
    icon: <ArrowUpRight className="w-4 h-4" />,
    color: 'bg-red-500',
    description: 'Despacho o venta'
  },
  {
    value: 'ajuste',
    label: 'Ajuste/Transferencia',
    icon: <ArrowRight className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Ajustes y transferencias'
  },
  {
    value: 'ajuste',
    label: 'Ajuste',
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'bg-purple-500',
    description: 'Corrección de inventario'
  }
] as const;

// Reemplazar datos hardcodeados por carga real de ubicaciones
const [realLocations, setRealLocations] = useState<any[]>([]);
const [locationsLoaded, setLocationsLoaded] = useState(false);


export function InventoryMovements() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MovementType | 'all'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'movements'>('movements');
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showReceptionModal, setShowReceptionModal] = useState(false);

  const { toast } = useToast();
  const { handleAsyncError } = useErrorHandler();
  const { canPerform, logOperation } = useSecurity();
  const { user } = useAppStore();
  const canEdit = useCanEdit();
  const modal = useFormModal();

  // Estados del formulario
  const [formData, setFormData] = useState({
    movement_type: 'entrada' as MovementType,
    product_id: '',
    quantity: '',
    from_location_id: '',
    to_location_id: '',
    notes: '',
    reference_type: '',
    reference_id: ''
  });

  useEffect(() => {
    loadData();
    loadPendingOrders();
    loadRealLocations();
  }, []);

  // Cargar datos
  // Cargar órdenes pendientes de recepción
  const loadPendingOrders = async () => {
    try {
      // Usar datos de prueba mientras configuramos la base de datos
      const demoOrders = [
        {
          id: 'order-1',
          order_number: 'OC-2025-001',
          supplier_name: 'Proveedor ABC Químicos',
          status: 'sent',
          order_date: new Date().toISOString(),
          expected_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          total_items: 5,
          total_cost: 2500000,
          items: [
            { id: 'item-1', product_name: 'Ácido Cítrico 25kg', ordered_quantity: 10, unit_cost: 85000 },
            { id: 'item-2', product_name: 'Colorante Rojo 5kg', ordered_quantity: 5, unit_cost: 120000 }
          ]
        },
        {
          id: 'order-2',
          order_number: 'OC-2025-002',
          supplier_name: 'Empaques del Valle',
          status: 'partial',
          order_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          expected_date: new Date().toISOString(),
          total_items: 3,
          total_cost: 850000,
          items: [
            { id: 'item-3', product_name: 'Bolsas Transparentes 100g', ordered_quantity: 1000, unit_cost: 850 }
          ]
        }
      ];

      setPendingOrders(demoOrders);
    } catch (error) {
      console.error('Error loading pending orders:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las órdenes pendientes",
        variant: "destructive"
      });
    }
  };

  // Cargar ubicaciones reales
  const loadRealLocations = async () => {
    try {
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (locationError) {
        console.error('Error loading locations:', locationError);
        // Usar datos hardcodeados como fallback
        setRealLocations([
          { id: 'bodega-central', name: 'Bodega Central', code: 'BC' },
          { id: 'pos-colina', name: 'POS-Colina', code: 'PC' },
          { id: 'pos-fontanar', name: 'POS-Fontanar', code: 'PF' },
          { id: 'pos-eventos', name: 'POS-Eventos', code: 'PE' }
        ]);
      } else {
        setRealLocations(locationData || []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      setRealLocations([]);
    } finally {
      setLocationsLoaded(true);
    }
  };

  const loadData = async () => {
    const { error } = await handleAsyncError(async () => {
      setLoading(true);

      console.log('🔍 DEBUGGING - Loading movements from database...');

      // Cargar movimientos con query simplificada para debugging
      const { data: movementsData, error: movementsError } = await supabase
        .from('inventory_movements')
        .select(`
          id, 
          movement_type, 
          quantity, 
          created_at, 
          notes,
          unit_cost,
          total_cost,
          product_id,
          from_location_id,
          to_location_id,
          products!product_id(id, sku, name),
          from_location:locations!from_location_id(id, name),
          to_location:locations!to_location_id(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('📊 DEBUGGING - Movements query result:', { 
        data: movementsData, 
        error: movementsError,
        count: movementsData?.length || 0
      });

      if (movementsError) {
        console.error('❌ MOVEMENTS ERROR:', movementsError);
        throw movementsError;
      }

      // Cargar productos - CAMPOS CORREGIDOS
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, sku, name, product_type, unit_cost')
        .eq('is_active', true)
        .order('name');

      console.log('📊 DEBUGGING - Products query result:', { 
        data: productsData, 
        error: productsError,
        count: productsData?.length || 0
      });

      if (productsError) {
        console.error('❌ PRODUCTS ERROR:', productsError);
        throw productsError;
      }

      console.log('✅ Setting movements and products:', {
        movementsCount: movementsData?.length || 0,
        productsCount: productsData?.length || 0
      });

      setMovements((movementsData || []) as any);
      setProducts(productsData || []);
    });

    if (error) {
      console.log('⚠️ Using demo data due to error:', error);
      // Usar datos de demostración
      setMovements(getDemoMovements());
      setProducts(getDemoProducts());
      toast({
        title: "Usando datos de demostración",
        description: "No se pudieron cargar los datos reales: " + error.message,
        variant: "default"
      });
    }

    setLoading(false);
  };

  // Datos de demostración
  const getDemoMovements = (): InventoryMovement[] => [
    {
      id: 'demo-mov-1',
      movement_type: 'entrada',
      status: 'completed',
      product_id: 'demo-prod-1',
      quantity: 50,
      to_location_id: 'bodega-central',
      reference_type: 'purchase_order',
      reference_id: 'PO-001',
      notes: 'Recepción de orden de compra PO-001',
      created_by: 'demo-user-1',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      product: {
        id: 'demo-prod-1',
        sku: 'MP-001',
        name: 'Ácido Cítrico 25kg',
        type: 'materia_prima'
      },
      to_location: {
        id: 'bodega-central',
        name: 'Bodega Central',
        code: 'BC'
      },
      created_by_profile: {
        id: 'demo-user-1',
        full_name: 'Usuario Demo'
      }
    },
    {
      id: 'demo-mov-2',
      movement_type: 'ajuste',
      status: 'completed',
      product_id: 'demo-prod-2',
      quantity: 20,
      from_location_id: 'bodega-central',
      to_location_id: 'pos-fontanar',
      notes: 'Transferencia para restock de POS',
      created_by: 'demo-user-1',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      product: {
        id: 'demo-prod-2',
        sku: 'PF-001',
        name: 'Gomas Ácidas Premium 100g',
        type: 'producto_final',
      },
      from_location: {
        id: 'bodega-central',
        name: 'Bodega Central',
        code: 'BC'
      },
      to_location: {
        id: 'pos-fontanar',
        name: 'POS-Fontanar',
        code: 'PF'
      },
      created_by_profile: {
        id: 'demo-user-1',
        full_name: 'Usuario Demo'
      }
    },
    {
      id: 'demo-mov-3',
      movement_type: 'salida',
      status: 'completed',
      product_id: 'demo-prod-2',
      quantity: 5,
      from_location_id: 'pos-fontanar',
      reference_type: 'sale',
      reference_id: 'SALE-001',
      notes: 'Venta directa en POS',
      created_by: 'demo-user-2',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      product: {
        id: 'demo-prod-2',
        sku: 'PF-001',
        name: 'Gomas Ácidas Premium 100g',
        type: 'producto_final',
      },
      from_location: {
        id: 'pos-fontanar',
        name: 'POS-Fontanar',
        code: 'PF'
      },
      created_by_profile: {
        id: 'demo-user-2',
        full_name: 'Operador POS'
      }
    }
  ];

  const getDemoProducts = () => [
    {
      id: 'demo-prod-1',
      sku: 'MP-001',
      name: 'Ácido Cítrico 25kg',
      type: 'materia_prima',
      unit_measure: 'kg',
      current_stock: 150
    },
    {
      id: 'demo-prod-2',
      sku: 'PF-001',
      name: 'Gomas Ácidas Premium 100g',
      type: 'producto_final',
      unit_measure: 'unidades',
      current_stock: 350
    }
  ];

  // Filtrar movimientos
  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.product?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || movement.movement_type === selectedType;

    const matchesLocation = selectedLocation === 'all' ||
                           movement.from_location_id === selectedLocation ||
                           movement.to_location_id === selectedLocation;

    return matchesSearch && matchesType && matchesLocation;
  });

  // Crear nuevo movimiento
  const handleCreate = () => {
    console.log('🔵 handleCreate called in InventoryMovements');
    resetForm();
    console.log('🔵 resetForm completed');
    modal.openCreateModal();
    console.log('🔵 openCreateModal called, modal state:', modal.isOpen);
  };

  // Enviar formulario
  const handleSubmit = async () => {
    console.log('🔄 Creando nuevo movimiento...', formData);

    const { error } = await handleAsyncError(async () => {
      // Validaciones básicas
      if (!formData.product_id || !formData.quantity) {
        throw new Error('Producto y cantidad son requeridos');
      }

      if (parseInt(formData.quantity) <= 0) {
        throw new Error('La cantidad debe ser mayor a 0');
      }

      if (formData.movement_type === 'ajuste') {
        if (!formData.from_location_id || !formData.to_location_id) {
          throw new Error('Para transferencias se requieren ubicación origen y destino');
        }
        if (formData.from_location_id === formData.to_location_id) {
          throw new Error('Las ubicaciones origen y destino deben ser diferentes');
        }
      }

      if (formData.movement_type === 'entrada' && !formData.to_location_id) {
        throw new Error('Para entradas se requiere ubicación de destino');
      }

      if (formData.movement_type === 'salida' && !formData.from_location_id) {
        throw new Error('Para salidas se requiere ubicación de origen');
      }

      // Preparar datos del movimiento - VERSIÓN CORREGIDA v2
      const movementData = {
        movement_type: formData.movement_type,
        product_id: formData.product_id,
        quantity: parseInt(formData.quantity),
        from_location_id: formData.from_location_id || null,
        to_location_id: formData.to_location_id || null,
        reference_type: formData.reference_type || null,
        reference_id: formData.reference_id || null,
        notes: formData.notes || null,
        unit_cost: 0,
        total_cost: 0
      };

      console.log('🟢 NUEVO movementData (sin status/completed_at):', movementData);

      // Crear movimiento
      const { data: newMovement, error: movementError } = await supabase
        .from('inventory_movements')
        .insert([movementData]);

      if (movementError) throw movementError;

      console.log('✅ Movimiento creado exitosamente:', newMovement);

      // Registrar operación sensible
      await logOperation('bulk_operations', {
        operation: 'inventory_movement',
        movement_type: formData.movement_type,
        product_id: formData.product_id,
        quantity: formData.quantity
      });

      toast({
        title: "Movimiento registrado",
        description: `Movimiento de ${formData.movement_type} por ${formData.quantity} unidades registrado correctamente`,
        variant: "default"
      });

      modal.closeModal();
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

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      movement_type: 'entrada',
      product_id: '',
      quantity: '',
      from_location_id: '',
      to_location_id: '',
      notes: '',
      reference_type: '',
      reference_id: ''
    });
  };

  // Obtener configuración del tipo de movimiento
  const getMovementTypeConfig = (type: MovementType) => {
    return MOVEMENT_TYPES.find(t => t.value === type) || MOVEMENT_TYPES[0];
  };

  // Obtener ubicación por ID usando datos reales
  const getLocationById = (id: string) => {
    return realLocations.find(loc => loc.id === id) || realLocations.find(loc => loc.code === id);
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
      <div className={DESIGN_SYSTEM.containers.page}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={DESIGN_SYSTEM.typography.pageTitle}>Movimientos de Inventario</h1>
            <p className={DESIGN_SYSTEM.typography.pageSubtitle}>
              Recepción, transferencias y despachos de productos
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleCreate}
              className={DESIGN_SYSTEM.buttons.primary}
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Movimiento</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('movements')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'movements'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Movimientos
              </div>
            </button>
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'movements' && (
          <>
            {/* Métricas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {MOVEMENT_TYPES.map(type => {
            const count = movements.filter(m => m.movement_type === type.value).length;
            const today = new Date().toDateString();
            const todayCount = movements.filter(m =>
              m.movement_type === type.value &&
              new Date(m.created_at).toDateString() === today
            ).length;

            return (
              <div key={type.value} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 ${type.color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                    {type.icon}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">total</p>
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{type.label}</h3>
                <p className="text-xs text-gray-600 mb-2">{type.description}</p>
                <p className="text-xs text-green-600 font-medium">
                  {todayCount} hoy
                </p>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por producto, código o notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as MovementType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Todos los tipos</option>
                {MOVEMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Todas las ubicaciones</option>
                {realLocations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de movimientos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flujo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No se encontraron movimientos</p>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((movement) => {
                    const typeConfig = getMovementTypeConfig(movement.movement_type);

                    return (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 ${typeConfig.color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                              {typeConfig.icon}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{typeConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{movement.product?.name}</p>
                            <p className="text-xs text-gray-500">{movement.product?.sku}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">
                              {formatNumber(movement.quantity)}
                            </span>
                             <span className="text-gray-500 ml-1">
                               {movement.product?.type === 'materia_prima' ? 'kg' : 'unidad'}
                             </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm">
                            {movement.from_location && (
                              <span className="text-gray-600">{movement.from_location.code}</span>
                            )}
                            {movement.movement_type === 'ajuste' && (
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            )}
                            {movement.movement_type === 'entrada' && (
                              <ArrowDownLeft className="w-4 h-4 text-green-500" />
                            )}
                            {movement.movement_type === 'salida' && (
                              <ArrowUpRight className="w-4 h-4 text-red-500" />
                            )}
                            {movement.to_location && (
                              <span className="text-gray-600">{movement.to_location.code}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{formatDate(movement.created_at)}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(movement.created_at).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">
                            {movement.created_by_profile?.full_name || 'Usuario'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 max-w-xs truncate">
                            {movement.notes || '-'}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}

        {/* Receptions Tab Content Removed */}
        {false && (
          <div className="space-y-6">
            {/* Header de recepciones */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Órdenes Pendientes de Recepción</h2>
                <p className="text-gray-600 mt-1">
                  Procesa las órdenes de compra y recibe mercancía directamente desde aquí
                </p>
              </div>
              <button
                onClick={loadPendingOrders}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>

            {/* Lista de órdenes pendientes */}
            <div className="bg-white rounded-lg border border-gray-200">
              {pendingOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <PackageCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No hay órdenes pendientes de recepción</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">
                              Orden #{order.order_number}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.status === 'sent' ? 'Enviado' : 'Parcial'}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {order.supplier_name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Esperado: {new Date(order.expected_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              ${order.total_cost.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowReceptionModal(true);
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                          >
                            <PackageCheck className="w-4 h-4 inline mr-1" />
                            Procesar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de nuevo movimiento */}
        {modal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Nuevo Movimiento de Inventario</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Selector de tipo de movimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Movimiento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {MOVEMENT_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          movement_type: type.value,
                          // Limpiar ubicaciones al cambiar tipo
                          from_location_id: '',
                          to_location_id: ''
                        }))}
                        className={`p-4 border-2 rounded-lg text-left transition-colors ${
                          formData.movement_type === type.value
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

                {/* Campos del formulario */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Producto */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                    <select
                      value={formData.product_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Seleccionar producto</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.code} - {product.name} (Stock: {product.current_stock} {product.unit_measure})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      min="1"
                      required
                    />
                  </div>

                  {/* Ubicación origen (para salidas y transferencias) */}
                  {(formData.movement_type === 'salida' || formData.movement_type === 'ajuste') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación Origen</label>
                      <select
                        value={formData.from_location_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, from_location_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      >
                        <option value="">Seleccionar origen</option>
                        {realLocations.map(location => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Ubicación destino (para entradas y transferencias) */}
                  {(formData.movement_type === 'entrada' || formData.movement_type === 'ajuste') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación Destino</label>
                      <select
                        value={formData.to_location_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, to_location_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      >
                        <option value="">Seleccionar destino</option>
                        {realLocations.filter(loc => loc.id !== formData.from_location_id).map(location => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Tipo de referencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Referencia</label>
                    <select
                      value={formData.reference_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Sin referencia</option>
                      <option value="purchase_order">Orden de Compra</option>
                      <option value="sale">Venta</option>
                      <option value="production_batch">Lote de Producción</option>
                      <option value="transfer_request">Solicitud de Ajuste</option>
                      <option value="adjustment">Ajuste de Inventario</option>
                    </select>
                  </div>

                  {/* ID de referencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID de Referencia</label>
                    <input
                      type="text"
                      value={formData.reference_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Ej: PO-001, SALE-123"
                    />
                  </div>

                  {/* Notas */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      rows={3}
                      placeholder="Descripción del movimiento..."
                    />
                  </div>
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
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Registrar Movimiento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}