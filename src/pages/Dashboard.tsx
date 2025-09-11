import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  MapPin,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  ArrowUp,
  ArrowDown,
  Box,
  Truck,
  Factory,
  Users
} from 'lucide-react';

// Tipos para el dashboard
interface InventoryByLocation {
  location: string;
  products: number;
  value: number;
  percentage: number;
  items: {
    materia_prima: number;
    empaques: number;
    gomas_granel: number;
    producto_final: number;
  };
}

interface InventoryByType {
  type: string;
  label: string;
  value: number;
  quantity: number;
  color: string;
  icon: React.ReactNode;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
}

interface TrendData {
  date: string;
  ventas: number;
  produccion: number;
}

const LOCATIONS = [
  { id: 'bodega-central', name: 'Bodega Central', color: 'bg-blue-500' },
  { id: 'pos-colina', name: 'POS-Colina', color: 'bg-green-500' },
  { id: 'pos-fontanar', name: 'POS-Fontanar', color: 'bg-purple-500' },
  { id: 'pos-eventos', name: 'POS-Eventos', color: 'bg-orange-500' }
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [inventoryByLocation, setInventoryByLocation] = useState<InventoryByLocation[]>([]);
  const [inventoryByType, setInventoryByType] = useState<InventoryByType[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  
  // Métricas principales
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    lowStockItems: 0,
    expiringItems: 0,
    pendingOrders: 0,
    totalInventoryValue: 0,
    monthlyGrowth: 0,
    totalLocations: 4,
    activeUsers: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simulación de carga de datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos de inventario por ubicación
      setInventoryByLocation([
        {
          location: 'Bodega Central',
          products: 450,
          value: 2500000,
          percentage: 45,
          items: {
            materia_prima: 200,
            empaques: 100,
            gomas_granel: 50,
            producto_final: 100
          }
        },
        {
          location: 'POS-Colina',
          products: 280,
          value: 1200000,
          percentage: 25,
          items: {
            materia_prima: 0,
            empaques: 30,
            gomas_granel: 50,
            producto_final: 200
          }
        },
        {
          location: 'POS-Fontanar',
          products: 220,
          value: 980000,
          percentage: 20,
          items: {
            materia_prima: 0,
            empaques: 20,
            gomas_granel: 40,
            producto_final: 160
          }
        },
        {
          location: 'POS-Eventos',
          products: 120,
          value: 520000,
          percentage: 10,
          items: {
            materia_prima: 0,
            empaques: 20,
            gomas_granel: 20,
            producto_final: 80
          }
        }
      ]);

      // Datos de inventario por tipo
      setInventoryByType([
        {
          type: 'materia_prima',
          label: 'Materia Prima',
          value: 850000,
          quantity: 200,
          color: 'bg-blue-500',
          icon: <Factory className="w-5 h-5" />
        },
        {
          type: 'empaques',
          label: 'Empaques',
          value: 320000,
          quantity: 170,
          color: 'bg-green-500',
          icon: <Package className="w-5 h-5" />
        },
        {
          type: 'gomas_granel',
          label: 'Gomas al Granel',
          value: 450000,
          quantity: 160,
          color: 'bg-purple-500',
          icon: <Box className="w-5 h-5" />
        },
        {
          type: 'producto_final',
          label: 'Producto Final',
          value: 3580000,
          quantity: 540,
          color: 'bg-orange-500',
          icon: <ShoppingCart className="w-5 h-5" />
        }
      ]);

      // Alertas críticas
      setAlerts([
        {
          id: '1',
          type: 'critical',
          title: '2 lotes próximos a vencer',
          description: 'Lotes #2024-045 y #2024-046 vencen en 5 días',
          action: 'Ver detalles'
        },
        {
          id: '2',
          type: 'warning',
          title: '5 productos bajo stock mínimo',
          description: 'Requieren reabastecimiento urgente',
          action: 'Generar orden'
        },
        {
          id: '3',
          type: 'warning',
          title: 'Empaques con lead time alto',
          description: 'Considerar orden anticipada (90 días)',
          action: 'Revisar'
        },
        {
          id: '4',
          type: 'info',
          title: '3 órdenes pendientes de recepción',
          description: 'Llegada estimada esta semana',
          action: 'Ver órdenes'
        }
      ]);

      // Datos de tendencia
      const trend = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        trend.push({
          date: date.toISOString().split('T')[0],
          ventas: Math.floor(Math.random() * 50) + 100,
          produccion: Math.floor(Math.random() * 40) + 80
        });
      }
      setTrendData(trend);

      // Métricas
      setMetrics({
        totalProducts: 1070,
        lowStockItems: 5,
        expiringItems: 2,
        pendingOrders: 3,
        totalInventoryValue: 5200000,
        monthlyGrowth: 12.5,
        totalLocations: 4,
        activeUsers: 8
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Activity className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Vista general del inventario multi-ubicación</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Productos Activos</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">SKUs disponibles</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-red-600">{metrics.lowStockItems}</p>
              <p className="text-xs text-gray-500 mt-1">Requieren atención</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Próximos a Vencer</p>
              <p className="text-2xl font-bold text-yellow-600">{metrics.expiringItems}</p>
              <p className="text-xs text-gray-500 mt-1">En los próximos 30 días</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Órdenes Pendientes</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.pendingOrders}</p>
              <p className="text-xs text-gray-500 mt-1">Por recibir</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Valor del inventario */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Valor Total del Inventario</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics.totalInventoryValue)}
            </span>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              metrics.monthlyGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {metrics.monthlyGrowth > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(metrics.monthlyGrowth)}%
            </div>
          </div>
        </div>
        
        {/* Desglose por tipo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {inventoryByType.map((type) => (
            <div key={type.type} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${type.color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                  {type.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{type.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(type.value)}</p>
              <p className="text-xs text-gray-500">{type.quantity} unidades</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de ubicaciones y alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventario por ubicación */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventario por Ubicación</h2>
          <div className="space-y-4">
            {inventoryByLocation.map((location, index) => (
              <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{location.location}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {formatCurrency(location.value)}
                  </span>
                </div>
                
                {/* Barra de progreso */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${LOCATIONS[index].color}`}
                    style={{ width: `${location.percentage}%` }}
                  ></div>
                </div>
                
                {/* Desglose por tipo */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-gray-600">
                    <span className="block font-medium">Mat. Prima</span>
                    <span>{location.items.materia_prima}</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="block font-medium">Empaques</span>
                    <span>{location.items.empaques}</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="block font-medium">Gomas</span>
                    <span>{location.items.gomas_granel}</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="block font-medium">P. Final</span>
                    <span>{location.items.producto_final}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Resumen */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total productos en todas las ubicaciones:</span>
              <span className="font-bold text-gray-900">
                {inventoryByLocation.reduce((sum, loc) => sum + loc.products, 0)} items
              </span>
            </div>
          </div>
        </div>

        {/* Alertas críticas */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas Críticas</h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-3 rounded-lg border ${getAlertBgColor(alert.type)}`}
              >
                <div className="flex items-start gap-2">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                    {alert.action && (
                      <button className="text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium">
                        {alert.action} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tendencia de ventas vs producción */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia Mensual</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Gráfico de tendencias</p>
            <p className="text-xs mt-1">Ventas vs Producción</p>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-center gap-2">
          <Package className="w-5 h-5" />
          <span>Nuevo Producto</span>
        </button>
        <button className="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          <span>Crear Orden</span>
        </button>
        <button className="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
          <Truck className="w-5 h-5" />
          <span>Recibir Mercancía</span>
        </button>
        <button className="p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-2">
          <BarChart3 className="w-5 h-5" />
          <span>Ver Reportes</span>
        </button>
      </div>
    </div>
  );
}