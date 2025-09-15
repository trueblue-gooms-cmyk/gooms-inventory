// Página de Recepción de Mercancía - Compatible con Lovable + Supabase
// Sigue patrones existentes del proyecto para máxima compatibilidad
import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Eye,
  Camera,
  FileText,
  Truck,
  MapPin,
  Calendar,
  BarChart3,
  RefreshCw,
  User,
  ClipboardCheck
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Interfaces siguiendo patrones existentes del proyecto
interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  status: 'sent' | 'received' | 'partial';
  order_date: string;
  expected_date: string;
  total_items: number;
  total_cost: number;
  created_by: string;
  notes?: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  ordered_quantity: number;
  received_quantity: number;
  pending_quantity: number;
  unit_cost: number;
  notes?: string;
  quality_status?: 'approved' | 'rejected' | 'pending';
}

interface ReceptionData {
  order_id: string;
  received_items: {
    item_id: string;
    received_quantity: number;
    quality_notes?: string;
    quality_status: 'approved' | 'rejected';
    location_id: string;
  }[];
  reception_notes: string;
  received_by: string;
}

export function Reception() {
  // Estados siguiendo patrón del proyecto
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showReceptionModal, setShowReceptionModal] = useState(false);

  // Estados del workflow de recepción
  const [receptionData, setReceptionData] = useState<ReceptionData>({
    order_id: '',
    received_items: [],
    reception_notes: '',
    received_by: ''
  });

  // Hooks del proyecto
  const { user } = useAppStore();
  const { toast } = useToast();

  // Cargar órdenes pendientes de recepción
  const loadPendingOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          order_number,
          status,
          order_date,
          expected_date,
          total_cost,
          notes,
          suppliers (
            id,
            name
          ),
          profiles!purchase_orders_created_by_fkey (
            full_name
          )
        `)
        .in('status', ['sent', 'partial'])
        .order('expected_date', { ascending: true });

      if (error) throw error;

      const transformedOrders: PurchaseOrder[] = (data || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        supplier_id: order.suppliers?.id || '',
        supplier_name: order.suppliers?.name || 'N/A',
        status: order.status as 'sent' | 'received' | 'partial',
        order_date: order.order_date,
        expected_date: order.expected_date,
        total_items: 0, // Se calculará con los items
        total_cost: order.total_cost,
        created_by: order.profiles?.full_name || 'N/A',
        notes: order.notes
      }));

      setPendingOrders(transformedOrders);
    } catch (err: unknown) {
      console.error('Error loading pending orders:', err);
      toast({
        title: "Error cargando órdenes",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar items de la orden seleccionada
  const loadOrderItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          id,
          quantity as ordered_quantity,
          unit_price,
          notes,
          products (
            id,
            name
          )
        `)
        .eq('purchase_order_id', orderId);

      if (error) throw error;

      const items: OrderItem[] = (data || []).map(item => ({
        id: item.id,
        product_id: item.products?.id || '',
        product_name: item.products?.name || 'N/A',
        ordered_quantity: item.quantity,
        received_quantity: 0, // Se llenará con datos de recepción
        pending_quantity: item.quantity,
        unit_cost: item.unit_price,
        notes: item.notes,
        quality_status: 'pending'
      }));

      setOrderItems(items);
    } catch (err: unknown) {
      console.error('Error loading order items:', err);
      toast({
        title: "Error cargando items",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Procesar recepción de mercancía
  const processReception = async (reception: ReceptionData) => {
    try {
      setIsLoading(true);

      // 1. Crear movimientos de inventario para cada item recibido
      for (const item of reception.received_items) {
        if (item.received_quantity > 0 && item.quality_status === 'approved') {
          const { error: movementError } = await supabase
            .rpc('create_inventory_movement', {
              p_product_id: item.item_id,
              p_movement_type: 'entrada',
              p_quantity: item.received_quantity,
              p_to_location_id: item.location_id,
              p_reference_type: 'purchase_order',
              p_reference_id: reception.order_id,
              p_notes: `Recepción: ${item.quality_notes || 'Sin observaciones'}`
            });

          if (movementError) throw movementError;
        }
      }

      // 2. Actualizar estado de la orden
      const totalReceived = reception.received_items
        .filter(item => item.quality_status === 'approved')
        .reduce((sum, item) => sum + item.received_quantity, 0);
      
      const totalOrdered = orderItems.reduce((sum, item) => sum + item.ordered_quantity, 0);
      
      const newStatus = totalReceived >= totalOrdered ? 'received' : 'partial';

      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', reception.order_id);

      if (orderError) throw orderError;

      // 3. Crear registro de recepción (opcional - si tienes tabla reception_logs)
      // const { error: receptionError } = await supabase
      //   .from('reception_logs')
      //   .insert({
      //     purchase_order_id: reception.order_id,
      //     received_by: user?.id,
      //     reception_notes: reception.reception_notes,
      //     total_items_received: totalReceived
      //   });

      toast({
        title: "Recepción procesada exitosamente",
        description: `Se procesaron ${totalReceived} items correctamente`,
      });

      // Actualizar datos
      await loadPendingOrders();
      setShowReceptionModal(false);
      setSelectedOrder(null);

    } catch (err: unknown) {
      console.error('Error processing reception:', err);
      toast({
        title: "Error procesando recepción",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Inicializar datos al cargar
  useEffect(() => {
    if (user) {
      loadPendingOrders();
    }
  }, [user]);

  // Filtrar órdenes
  const filteredOrders = pendingOrders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Obtener color de estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'partial': return 'bg-yellow-100 text-yellow-700';
      case 'received': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent': return 'Enviado';
      case 'partial': return 'Parcial';
      case 'received': return 'Recibido';
      default: return status;
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recepción de Mercancía</h1>
            <p className="text-gray-600 mt-1">Gestión de órdenes pendientes y proceso de recepción</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={loadPendingOrders}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Órdenes Pendientes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredOrders.filter(o => o.status === 'sent').length}
                </p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recepciones Parciales</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredOrders.filter(o => o.status === 'partial').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completadas Hoy</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredOrders.filter(o => 
                    o.status === 'received' && 
                    new Date(o.expected_date).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Pendiente</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${filteredOrders
                    .filter(o => o.status === 'sent')
                    .reduce((sum, o) => sum + o.total_cost, 0)
                    .toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Controles de filtrado */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por # orden o proveedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="sent">Enviado</option>
                <option value="partial">Recepción parcial</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de órdenes pendientes */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Órdenes Pendientes de Recepción ({filteredOrders.length})
            </h2>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">Cargando órdenes...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">No hay órdenes pendientes de recepción</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">
                          Orden #{order.order_number}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
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
                          <BarChart3 className="w-4 h-4" />
                          ${order.total_cost.toLocaleString()}
                        </div>
                      </div>

                      {order.notes && (
                        <p className="text-sm text-gray-500">
                          <FileText className="w-4 h-4 inline mr-1" />
                          {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setSelectedOrder(order);
                          await loadOrderItems(order.id);
                          setReceptionData({
                            order_id: order.id,
                            received_items: [],
                            reception_notes: '',
                            received_by: user?.id || ''
                          });
                          setShowReceptionModal(true);
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        <ClipboardCheck className="w-4 h-4 inline mr-1" />
                        Procesar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de recepción (simplificado para compatibilidad) */}
        {showReceptionModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Procesar Recepción - Orden #{selectedOrder.order_number}
                  </h2>
                  <button
                    onClick={() => {
                      setShowReceptionModal(false);
                      setSelectedOrder(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{item.product_name}</h4>
                          <p className="text-sm text-gray-600">
                            Ordenado: {item.ordered_quantity} unidades
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Cant. recibida"
                            className="w-24 px-2 py-1 border rounded text-sm"
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 0;
                              setReceptionData(prev => ({
                                ...prev,
                                received_items: [
                                  ...prev.received_items.filter(ri => ri.item_id !== item.product_id),
                                  {
                                    item_id: item.product_id,
                                    received_quantity: quantity,
                                    quality_status: 'approved' as const,
                                    location_id: 'default-location' // Deberías obtener esto del usuario
                                  }
                                ]
                              }));
                            }}
                          />
                          <select className="px-2 py-1 border rounded text-sm">
                            <option value="approved">✓ Aprobado</option>
                            <option value="rejected">✗ Rechazado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas de recepción
                  </label>
                  <textarea
                    value={receptionData.reception_notes}
                    onChange={(e) => setReceptionData(prev => ({ ...prev, reception_notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Observaciones sobre la recepción..."
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowReceptionModal(false);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => processReception(receptionData)}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Procesar Recepción'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}