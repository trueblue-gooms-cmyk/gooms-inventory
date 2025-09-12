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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [analysisData, setAnalysisData] = useState<any>(null);
  
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
    loadPurchaseData();
    generateSmartSuggestions();
  }, []);

  const loadPurchaseData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Productos con información completa
      const sampleProducts: Product[] = [
        {
          id: '1',
          sku: 'EMP-001',
          name: 'Bolsas 100g',
          category: 'empaques',
          current_stock: 50,
          min_stock: 200,
          max_stock: 1000,
          unit_cost: 150,
          moq: 500,
          lead_time: 90, // 90 días para empaques
          supplier_id: '1',
          supplier_name: 'Empaques Colombia S.A.',
          consumption_rate: 5, // 5 por día
          last_purchase_date: '2025-06-01',
          last_purchase_price: 145
        },
        {
          id: '2',
          sku: 'MP-001',
          name: 'Azúcar refinada',
          category: 'materia_prima',
          current_stock: 500,
          min_stock: 100,
          max_stock: 2000,
          unit_cost: 2500,
          moq: 500,
          lead_time: 15,
          supplier_id: '2',
          supplier_name: 'Materias Primas del Valle',
          consumption_rate: 20,
          last_purchase_date: '2025-08-15',
          last_purchase_price: 2400
        },
        {
          id: '3',
          sku: 'MP-002',
          name: 'Gelatina sin sabor',
          category: 'materia_prima',
          current_stock: 15,
          min_stock: 50,
          max_stock: 200,
          unit_cost: 18000,
          moq: 50,
          lead_time: 30,
          supplier_id: '3',
          supplier_name: 'Insumos Industriales',
          consumption_rate: 2,
          last_purchase_date: '2025-07-20',
          last_purchase_price: 17500
        },
        {
          id: '4',
          sku: 'EMP-002',
          name: 'Bolsas 250g',
          category: 'empaques',
          current_stock: 300,
          min_stock: 150,
          max_stock: 800,
          unit_cost: 250,
          moq: 300,
          lead_time: 90,
          supplier_id: '1',
          supplier_name: 'Empaques Colombia S.A.',
          consumption_rate: 3,
          last_purchase_date: '2025-06-01',
          last_purchase_price: 240
        }
      ];

      setProducts(sampleProducts);

      // Órdenes existentes
      const sampleOrders: PurchaseOrder[] = [
        {
          id: '1',
          order_number: 'OC-2025-001',
          supplier: {
            id: '1',
            name: 'Empaques Colombia S.A.',
            email: 'ventas@empaquescol.com',
            phone: '(601) 234-5678',
            lead_time_days: 90,
            payment_terms: '30 días',
            reliability_score: 95,
            discount_volume: 15
          },
          status: 'pending',
          items: [
            {
              id: '1',
              product_id: '1',
              product_name: 'Bolsas 100g',
              sku: 'EMP-001',
              quantity: 500,
              unit_price: 150,
              total: 75000,
              moq: 500,
              current_stock: 50
            }
          ],
          subtotal: 75000,
          discount: 0,
          tax: 14250,
          total: 89250,
          created_date: '2025-09-01',
          expected_date: '2025-11-30',
          auto_generated: true,
          notes: 'Orden automática - Stock crítico detectado'
        }
      ];

      setOrders(sampleOrders);

      // Calcular métricas
      setMetrics({
        criticalItems: sampleProducts.filter(p => p.current_stock < p.min_stock * 0.5).length,
        totalSavings: 125000,
        pendingOrders: sampleOrders.filter(o => o.status === 'pending').length,
        averageLeadTime: Math.round(sampleProducts.reduce((sum, p) => sum + p.lead_time, 0) / sampleProducts.length),
        nextDelivery: '2025-09-15',
        optimizationScore: 78
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const generateSmartSuggestions = () => {
    const suggestions: SmartSuggestion[] = [];
    
    // Analizar cada producto
    products.forEach(product => {
      const daysOfStock = product.current_stock / product.consumption_rate;
      const daysToMinStock = (product.current_stock - product.min_stock) / product.consumption_rate;
      
      // CRÍTICO: Stock muy bajo considerando lead time
      if (daysOfStock < product.lead_time && product.current_stock < product.min_stock) {
        suggestions.push({
          id: `${product.id}-critical`,
          priority: 'critical',
          type: 'stock_critical',
          product: product,
          reason: `⚠️ CRÍTICO: Solo ${Math.floor(daysOfStock)} días de stock. Lead time: ${product.lead_time} días. Ordenar URGENTE o habrá quiebre de stock.`,
          suggested_quantity: product.moq * Math.ceil((product.min_stock * 2 - product.current_stock) / product.moq),
          optimal_quantity: product.moq * 2, // Pedir el doble del MOQ para cubrir el lead time largo
          estimated_cost: product.moq * 2 * product.unit_cost,
          days_until_stockout: Math.floor(daysOfStock),
          action_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          confidence_score: 95
        });
      }
      
      // LEAD TIME ALERT: Empaques con 90 días de lead time
      else if (product.category === 'empaques' && daysToMinStock < product.lead_time + 30) {
        suggestions.push({
          id: `${product.id}-leadtime`,
          priority: 'high',
          type: 'lead_time_alert',
          product: product,
          reason: `📦 EMPAQUES: Lead time de ${product.lead_time} días. Stock llegará a mínimo antes de recibir orden. Ordenar preventivamente.`,
          suggested_quantity: product.moq * 2,
          optimal_quantity: product.moq * 3, // Para empaques, pedir más por el lead time largo
          estimated_cost: product.moq * 3 * product.unit_cost,
          savings: product.moq * 3 * product.unit_cost * 0.15, // 15% descuento por volumen
          days_until_stockout: Math.floor(daysOfStock),
          action_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          confidence_score: 88
        });
      }
      
      // OPTIMIZACIÓN: Oportunidad de ahorro por volumen
      else if (product.current_stock > product.min_stock && product.last_purchase_price && product.unit_cost < product.last_purchase_price) {
        suggestions.push({
          id: `${product.id}-optimization`,
          priority: 'medium',
          type: 'optimization',
          product: product,
          reason: `💰 OPORTUNIDAD: Precio actual ${((product.last_purchase_price - product.unit_cost) / product.last_purchase_price * 100).toFixed(1)}% menor. Aprovechar para reabastecer.`,
          suggested_quantity: product.moq * 2,
          optimal_quantity: product.max_stock - product.current_stock,
          estimated_cost: (product.max_stock - product.current_stock) * product.unit_cost,
          savings: (product.max_stock - product.current_stock) * (product.last_purchase_price - product.unit_cost),
          confidence_score: 72
        });
      }
      
      // FORECAST: Proyección de demanda
      else if (daysToMinStock > 0 && daysToMinStock < 60) {
        suggestions.push({
          id: `${product.id}-forecast`,
          priority: 'low',
          type: 'forecast',
          product: product,
          reason: `📊 PROYECCIÓN: Stock llegará al mínimo en ${Math.floor(daysToMinStock)} días. Planificar orden considerando lead time de ${product.lead_time} días.`,
          suggested_quantity: product.moq,
          optimal_quantity: product.moq * Math.ceil((product.max_stock - product.current_stock) / product.moq),
          estimated_cost: product.moq * product.unit_cost,
          days_until_stockout: Math.floor(daysOfStock),
          confidence_score: 65
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
            onClick={() => generateSmartSuggestions()}
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