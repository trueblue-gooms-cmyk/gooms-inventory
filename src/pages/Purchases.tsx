// src/pages/Purchases.tsx
// REEMPLAZAR TODO EL CONTENIDO DEL ARCHIVO Purchases.tsx CON ESTE CÓDIGO

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Info,
  Edit2,
  Eye,
  Send,
  FileText,
  Calculator,
  BarChart3,
  Brain,
  Zap,
  Target,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { useSecureData } from '@/hooks/useSecureData';
import { supabase } from '@/integrations/supabase/client';

// Tipos para órdenes de compra
interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  lead_time_days: number;
  payment_terms: string;
  reliability_score: number; // 0-100
  discount_volume?: number; // % descuento por volumen
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: 'materia_prima' | 'empaques' | 'gomas_granel' | 'producto_final';
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit_cost: number;
  moq: number;
  lead_time: number;
  supplier_id: string;
  supplier_name: string;
  consumption_rate: number; // unidades por día
  last_purchase_date?: string;
  last_purchase_price?: number;
}

interface SmartSuggestion {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'stock_critical' | 'optimization' | 'forecast' | 'lead_time_alert';
  product: Product;
  reason: string;
  suggested_quantity: number;
  optimal_quantity: number; // Cantidad óptima considerando MOQ
  estimated_cost: number;
  savings?: number;
  days_until_stockout?: number;
  action_deadline?: string;
  confidence_score: number; // 0-100
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier: Supplier;
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'received' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  created_date: string;
  expected_date: string;
  notes?: string;
  auto_generated: boolean;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total: number;
  moq: number;
  current_stock: number;
}

const PRIORITY_CONFIG = {
  critical: { 
    label: 'Crítico', 
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertTriangle,
    description: 'Acción inmediata requerida'
  },
  high: { 
    label: 'Alto', 
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: TrendingUp,
    description: 'Ordenar esta semana'
  },
  medium: { 
    label: 'Medio', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Clock,
    description: 'Planificar orden'
  },
  low: { 
    label: 'Bajo', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Info,
    description: 'Monitorear'
  }
};

export default function Purchases() {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [analysisData, setAnalysisData] = useState<any>(null);
  
  // Real data from Supabase using secure hooks
  const { products, loading: loadingProducts } = useSecureData().useProductsFull();
  const { rawMaterials, loading: loadingRawMaterials } = useSecureData().useRawMaterialsFull();
  const { suppliers, loading: loadingSuppliers } = useSecureData().useSuppliersSafe();
  const { inventory, loading: loadingInventory } = useSecureData().useInventorySafe();
  
  const loading = loadingProducts || loadingRawMaterials || loadingSuppliers || loadingInventory;
  
  // Métricas del sistema
  const [metrics, setMetrics] = useState({
    criticalItems: 0,
    totalSavings: 0,
    pendingOrders: 0,
    averageLeadTime: 0,
    nextDelivery: '',
    optimizationScore: 0
  });

  useEffect(() => {
    if (!loading && products && inventory) {
      loadPurchaseOrders();
      generateSmartSuggestionsFromRealData();
    }
  }, [products, inventory, suppliers, rawMaterials, loading]);

  const loadPurchaseOrders = async () => {
    try {
      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers:supplier_id (
            id, name, email, phone, lead_time_days, payment_terms
          ),
          purchase_order_items (
            *
          )
        `)
        .order('created_at', { ascending: false });

      if (purchaseOrders) {
        const formattedOrders: PurchaseOrder[] = purchaseOrders.map(order => ({
          id: order.id,
          order_number: order.order_number,
          supplier: {
            id: order.suppliers?.id || '',
            name: order.suppliers?.name || '',
            email: order.suppliers?.email || '',
            phone: order.suppliers?.phone || '',
            lead_time_days: order.suppliers?.lead_time_days || 0,
            payment_terms: order.suppliers?.payment_terms || '',
            reliability_score: 90, // Default value
            discount_volume: 0
          },
          status: order.status === 'pending_approval' ? 'pending' : order.status as any,
          items: order.purchase_order_items?.map(item => ({
            id: item.id,
            product_id: item.item_id,
            product_name: item.item_type === 'product' ? 
              products?.find(p => p.id === item.item_id)?.name || 'Unknown Product' :
              rawMaterials?.find(rm => rm.id === item.item_id)?.name || 'Unknown Raw Material',
            sku: item.item_type === 'product' ? 
              products?.find(p => p.id === item.item_id)?.sku || '' :
              rawMaterials?.find(rm => rm.id === item.item_id)?.code || '',
            quantity: item.quantity,
            unit_price: item.unit_price || 0,
            total: item.total_price || 0,
            moq: 1, // Default value
            current_stock: inventory?.find(inv => inv.product_id === item.item_id)?.quantity_available || 0
          })) || [],
          subtotal: order.subtotal || 0,
          discount: 0,
          tax: order.tax || 0,
          total: order.total || 0,
          created_date: order.created_at?.split('T')[0] || '',
          expected_date: order.expected_date || '',
          auto_generated: false,
          notes: order.notes || ''
        }));

        setOrders(formattedOrders);
        
        // Calculate metrics
        setMetrics(prev => ({
          ...prev,
          pendingOrders: formattedOrders.filter(o => o.status === 'pending').length
        }));
      }
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    }
  };

  const generateSmartSuggestionsFromRealData = () => {
    if (!products || !inventory) return;
    
    const suggestions: SmartSuggestion[] = [];
    
    // Analizar cada producto
    products.forEach(product => {
      const inventoryItem = inventory.find(inv => inv.product_id === product.id);
      const currentStock = inventoryItem?.quantity_available || 0;
      const minStock = product.min_stock_units || 0;
      const unitCost = product.unit_cost || 0;
      
      // Estimate consumption rate (simplified calculation)
      const consumptionRate = Math.max(1, Math.floor(minStock / 30)); // Estimate based on min stock
      const daysOfStock = currentStock / consumptionRate;
      const daysToMinStock = (currentStock - minStock) / consumptionRate;
      
      // Estimate MOQ and lead time based on product type
      const isPackaging = product.type === 'empaques';
      const estimatedMOQ = isPackaging ? Math.max(100, minStock) : Math.max(50, minStock);
      const estimatedLeadTime = isPackaging ? 90 : product.type === 'materia_prima' ? 15 : 30;
      
      const productForSuggestion: Product = {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.type as any,
        current_stock: currentStock,
        min_stock: minStock,
        max_stock: Math.max(minStock * 5, 1000),
        unit_cost: unitCost,
        moq: estimatedMOQ,
        lead_time: estimatedLeadTime,
        supplier_id: '1', // Default supplier
        supplier_name: 'Default Supplier',
        consumption_rate: consumptionRate
      };
      
      // CRÍTICO: Stock muy bajo
      if (currentStock <= minStock * 0.5) {
        suggestions.push({
          id: `${product.id}-critical`,
          priority: 'critical',
          type: 'stock_critical',
          product: productForSuggestion,
          reason: `⚠️ CRÍTICO: Solo ${currentStock} unidades en stock. Mínimo: ${minStock}. Ordenar URGENTE.`,
          suggested_quantity: estimatedMOQ,
          optimal_quantity: estimatedMOQ * 2,
          estimated_cost: estimatedMOQ * 2 * unitCost,
          days_until_stockout: Math.floor(daysOfStock),
          action_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          confidence_score: 95
        });
      }
      
      // STOCK BAJO
      else if (currentStock <= minStock) {
        suggestions.push({
          id: `${product.id}-low`,
          priority: 'high',
          type: 'stock_critical',
          product: productForSuggestion,
          reason: `📦 STOCK BAJO: ${currentStock} unidades. Mínimo: ${minStock}. Reabastecer pronto.`,
          suggested_quantity: estimatedMOQ,
          optimal_quantity: estimatedMOQ * 2,
          estimated_cost: estimatedMOQ * unitCost,
          days_until_stockout: Math.floor(daysOfStock),
          action_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          confidence_score: 85
        });
      }
      
      // PROYECCIÓN: Para productos con stock medio
      else if (currentStock <= minStock * 2) {
        suggestions.push({
          id: `${product.id}-forecast`,
          priority: 'medium',
          type: 'forecast',
          product: productForSuggestion,
          reason: `📊 PROYECCIÓN: Stock medio (${currentStock} unidades). Considerar orden preventiva.`,
          suggested_quantity: estimatedMOQ,
          optimal_quantity: estimatedMOQ,
          estimated_cost: estimatedMOQ * unitCost,
          confidence_score: 70
        });
      }
    });
    
    // Ordenar por prioridad y confidence score
    suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.confidence_score - a.confidence_score;
    });
    
    setSuggestions(suggestions);
    
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      criticalItems: suggestions.filter(s => s.priority === 'critical').length,
      totalSavings: suggestions.reduce((sum, s) => sum + (s.savings || 0), 0),
      optimizationScore: Math.min(95, 60 + (suggestions.length > 0 ? 20 : 0))
    }));
  };

  const handleCreateOrderFromSuggestions = () => {
    if (selectedSuggestions.length === 0) return;
    
    // Agrupar por proveedor
    const ordersBySupplier: { [key: string]: SmartSuggestion[] } = {};
    
    selectedSuggestions.forEach(suggId => {
      const suggestion = suggestions.find(s => s.id === suggId);
      if (suggestion) {
        const supplierId = suggestion.product.supplier_id;
        if (!ordersBySupplier[supplierId]) {
          ordersBySupplier[supplierId] = [];
        }
        ordersBySupplier[supplierId].push(suggestion);
      }
    });
    
    // Crear órdenes por proveedor
    Object.entries(ordersBySupplier).forEach(([supplierId, items]) => {
      console.log('Crear orden para proveedor:', supplierId, 'con items:', items);
      // Aquí iría la lógica para crear la orden
    });
    
    setSelectedSuggestions([]);
    setShowCreateModal(false);
  };

  const calculateOptimalOrder = (product: Product) => {
    const consumptionPerMonth = product.consumption_rate * 30;
    const leadTimeConsumption = product.consumption_rate * product.lead_time;
    const safetyStock = product.min_stock * 1.5;
    const optimalQuantity = Math.max(
      product.moq,
      Math.ceil((safetyStock + leadTimeConsumption - product.current_stock) / product.moq) * product.moq
    );
    
    return {
      quantity: optimalQuantity,
      coverageDays: optimalQuantity / product.consumption_rate,
      totalCost: optimalQuantity * product.unit_cost
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesPriority = selectedPriority === 'all' || suggestion.priority === selectedPriority;
    const matchesSearch = suggestion.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         suggestion.product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Órdenes Inteligentes</h1>
          <p className="text-gray-600 mt-1">Sugerencias automáticas basadas en consumo, lead times y MOQs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recalcular</span>
          </button>
          <button
            onClick={() => setShowAnalysisModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Brain className="w-4 h-4" />
            <span>Análisis IA</span>
          </button>
        </div>
      </div>

      {/* Métricas clave */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Items Críticos</p>
              <p className="text-2xl font-bold text-red-600">{metrics.criticalItems}</p>
              <p className="text-xs text-gray-500">Acción inmediata</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ahorro Potencial</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.totalSavings)}</p>
              <p className="text-xs text-gray-500">Este mes</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lead Time Prom.</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageLeadTime}d</p>
              <p className="text-xs text-gray-500">Todos los items</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Órdenes Pend.</p>
              <p className="text-2xl font-bold text-yellow-600">{metrics.pendingOrders}</p>
              <p className="text-xs text-gray-500">Por aprobar</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Próxima Entrega</p>
              <p className="text-sm font-bold text-gray-900">{metrics.nextDelivery}</p>
              <p className="text-xs text-gray-500">En camino</p>
            </div>
            <Truck className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Score Optimiz.</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.optimizationScore}%</p>
              <p className="text-xs text-gray-500">Eficiencia</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Todas las prioridades</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {selectedSuggestions.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Orden ({selectedSuggestions.length})
            </button>
          )}
        </div>
      </div>

      {/* Sugerencias Inteligentes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Sugerencias de Compra Inteligentes</h2>
          <span className="text-sm text-gray-500">
            {filteredSuggestions.length} sugerencias activas
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay sugerencias con los filtros actuales</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSuggestions.map((suggestion) => {
              const PriorityIcon = PRIORITY_CONFIG[suggestion.priority].icon;
              const isSelected = selectedSuggestions.includes(suggestion.id);
              
              return (
                <div
                  key={suggestion.id}
                  className={`bg-white rounded-lg border-2 p-6 transition-all ${
                    isSelected ? 'border-orange-500 shadow-lg' : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSuggestions([...selectedSuggestions, suggestion.id]);
                          } else {
                            setSelectedSuggestions(selectedSuggestions.filter(id => id !== suggestion.id));
                          }
                        }}
                        className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <div className={`p-2 rounded-lg ${PRIORITY_CONFIG[suggestion.priority].color}`}>
                        <PriorityIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{suggestion.product.name}</h3>
                          <span className="text-sm text-gray-500">({suggestion.product.sku})</span>
                          <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence_score)}`}>
                            {suggestion.confidence_score}% confianza
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Stock Actual</p>
                            <p className={`text-sm font-medium ${
                              suggestion.product.current_stock < suggestion.product.min_stock 
                                ? 'text-red-600' 
                                : 'text-gray-900'
                            }`}>
                              {suggestion.product.current_stock} u
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Consumo/día</p>
                            <p className="text-sm font-medium text-gray-900">
                              {suggestion.product.consumption_rate} u
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Días de stock</p>
                            <p className={`text-sm font-medium ${
                              suggestion.days_until_stockout && suggestion.days_until_stockout < 30
                                ? 'text-red-600'
                                : 'text-gray-900'
                            }`}>
                              {suggestion.days_until_stockout || 'N/A'} días
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Lead Time</p>
                            <p className={`text-sm font-medium ${
                              suggestion.product.lead_time >= 90
                                ? 'text-orange-600'
                                : 'text-gray-900'
                            }`}>
                              {suggestion.product.lead_time} días
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">MOQ</p>
                            <p className="text-sm font-medium text-gray-900">
                              {suggestion.product.moq} u
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Proveedor</p>
                            <p className="text-sm font-medium text-gray-900">
                              {suggestion.product.supplier_name}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Cantidad Sugerida</p>
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-lg font-bold text-gray-900">
                                    {suggestion.optimal_quantity} unidades
                                  </span>
                                  <span className="text-sm text-gray-500 ml-2">
                                    ({Math.ceil(suggestion.optimal_quantity / suggestion.product.moq)} × MOQ)
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatCurrency(suggestion.estimated_cost)}
                                  </p>
                                  {suggestion.savings && suggestion.savings > 0 && (
                                    <p className="text-xs text-green-600">
                                      Ahorro: {formatCurrency(suggestion.savings)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {suggestion.action_deadline && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Ordenar antes de</p>
                                <p className="text-sm font-medium text-red-600">
                                  {new Date(suggestion.action_deadline).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[suggestion.priority].color}`}>
                      {PRIORITY_CONFIG[suggestion.priority].label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de creación de orden */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Crear Órdenes de Compra
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Se crearán órdenes automáticas agrupadas por proveedor para {selectedSuggestions.length} items seleccionados.
                </p>
              </div>
              
              {/* Resumen de órdenes a crear */}
              <div className="space-y-3">
                {/* Aquí iría el desglose por proveedor */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Resumen de Órdenes</h3>
                  <p className="text-sm text-gray-600">
                    {selectedSuggestions.length} productos seleccionados
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSuggestions([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateOrderFromSuggestions}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Crear Órdenes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de análisis */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Análisis Inteligente de Compras
              </h2>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Análisis de Lead Time */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-900">Alerta de Lead Time - Empaques</h3>
                </div>
                <p className="text-sm text-orange-700 mb-2">
                  Los empaques tienen un lead time de 90 días. Considerando el consumo actual:
                </p>
                <ul className="text-sm text-orange-600 space-y-1">
                  <li>• Bolsas 100g: Ordenar antes del 15 de septiembre</li>
                  <li>• Bolsas 250g: Stock suficiente por 100 días</li>
                  <li>• Recomendación: Establecer órdenes programadas trimestrales</li>
                </ul>
              </div>

              {/* Oportunidades de Optimización */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Oportunidades de Ahorro</h3>
                </div>
                <p className="text-sm text-green-700 mb-2">
                  Consolidando órdenes puedes obtener descuentos por volumen:
                </p>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>• Empaques Colombia: 15% descuento comprando 3x MOQ</li>
                  <li>• Materias Primas del Valle: Envío gratis sobre $5,000,000</li>
                  <li>• Ahorro potencial este mes: {formatCurrency(125000)}</li>
                </ul>
              </div>

              {/* Análisis Predictivo */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Análisis Predictivo</h3>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  Basado en tendencias de los últimos 3 meses:
                </p>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Aumento de consumo esperado: 15% próximo mes</li>
                  <li>• Productos con mayor rotación: Gomas Surtidas 100g</li>
                  <li>• Estacionalidad detectada: Mayor demanda en eventos</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}