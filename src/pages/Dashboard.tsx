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
import { useSecureData } from '@/hooks/useSecureData';
import { supabase } from '@/integrations/supabase/client';

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

// Familias de productos actualizadas según especificaciones
const PRODUCT_FAMILIES = {
  materia_prima: {
    label: 'Materia Prima',
    color: 'bg-blue-500',
    icon: <Factory className="w-5 h-5" />,
    description: 'Ingredientes base para producción'
  },
  empaques: {
    label: 'Empaques',
    color: 'bg-green-500',
    icon: <Package className="w-5 h-5" />,
    description: 'Material de empaque y etiquetado'
  },
  gomas_granel: {
    label: 'Gomas al Granel',
    color: 'bg-purple-500',
    icon: <Box className="w-5 h-5" />,
    description: 'Producto semi-terminado a granel'
  },
  producto_final: {
    label: 'Producto Final',
    color: 'bg-orange-500',
    icon: <ShoppingCart className="w-5 h-5" />,
    description: 'SKUs listos para venta'
  }
};

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [inventoryByLocation, setInventoryByLocation] = useState<InventoryByLocation[]>([]);
  const [inventoryByType, setInventoryByType] = useState<InventoryByType[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  
  // Real data from Supabase using secure hooks
  const { products, loading: loadingProducts } = useSecureData().useProductsSafe();
  const { inventory, loading: loadingInventory } = useSecureData().useInventorySafe();
  const { locations, loading: loadingLocations } = useSecureData().useLocationsSafe();
  const { rawMaterials, loading: loadingRawMaterials } = useSecureData().useRawMaterialsSafe();
  
  const loading = loadingProducts || loadingInventory || loadingLocations || loadingRawMaterials;
  
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
    if (!loading && products && inventory && locations) {
      calculateRealMetrics();
    }
  }, [products, inventory, locations, selectedPeriod, loading]);

  useEffect(() => {
    loadAdditionalData();
  }, [selectedPeriod]);

  // Función para generar datos de demostración
  const generateDemoData = () => {
    console.log('Generando datos de demostración para dashboard');

    // Datos de inventario por ubicación (demo)
    const demoLocationData: InventoryByLocation[] = [
      {
        location: 'Bodega Central',
        products: 1250,
        value: 45000000,
        percentage: 65,
        items: {
          materia_prima: 450,
          empaques: 300,
          gomas_granel: 250,
          producto_final: 250
        }
      },
      {
        location: 'POS-Colina',
        products: 380,
        value: 8500000,
        percentage: 12,
        items: {
          materia_prima: 50,
          empaques: 80,
          gomas_granel: 100,
          producto_final: 150
        }
      },
      {
        location: 'POS-Fontanar',
        products: 290,
        value: 7200000,
        percentage: 10,
        items: {
          materia_prima: 30,
          empaques: 60,
          gomas_granel: 80,
          producto_final: 120
        }
      },
      {
        location: 'POS-Eventos',
        products: 420,
        value: 9300000,
        percentage: 13,
        items: {
          materia_prima: 80,
          empaques: 100,
          gomas_granel: 120,
          producto_final: 120
        }
      }
    ];

    setInventoryByLocation(demoLocationData);

    // Datos por tipo de producto (demo)
    const demoTypeData = Object.entries(PRODUCT_FAMILIES).map(([key, family]) => ({
      label: family.label,
      type: key,
      value: key === 'materia_prima' ? 15000000 :
             key === 'empaques' ? 8000000 :
             key === 'gomas_granel' ? 22000000 : 25000000,
      quantity: key === 'materia_prima' ? 610 :
                key === 'empaques' ? 540 :
                key === 'gomas_granel' ? 550 : 640,
      color: family.color,
      icon: family.icon,
      description: family.description
    }));

    setInventoryByType(demoTypeData);

    // Métricas principales (demo)
    setMetrics({
      totalProducts: 85,
      lowStockItems: 12,
      expiringItems: 3,
      pendingOrders: 8,
      totalInventoryValue: 70000000,
      monthlyGrowth: 8.5,
      totalLocations: 4,
      activeUsers: 6
    });

    // Alertas demo
    const demoAlerts: Alert[] = [
      {
        id: 'demo-alert-1',
        type: 'warning',
        title: '12 productos bajo stock mínimo',
        description: 'Materia prima crítica requiere reabastecimiento',
        action: 'Ver productos'
      },
      {
        id: 'demo-alert-2',
        type: 'critical',
        title: '3 lotes próximos a vencer',
        description: 'Vencen en los próximos 5 días',
        action: 'Ver detalles'
      },
      {
        id: 'demo-alert-3',
        type: 'info',
        title: 'Nueva recepción programada',
        description: 'Orden OC-2025-004 llega mañana',
        action: 'Preparar recepción'
      }
    ];

    setAlerts(demoAlerts);
  };

  const calculateRealMetrics = () => {
    if (!products || !inventory || !locations) {
      // Si no hay datos reales, usar datos de demostración
      generateDemoData();
      return;
    }

    // Calculate inventory by location
    const locationStats: { [key: string]: InventoryByLocation } = {};
    
    inventory.forEach(item => {
      const location = locations.find(l => l.id === item.location_id);
      const locationName = location?.name || 'Unknown';
      
      if (!locationStats[locationName]) {
        locationStats[locationName] = {
          location: locationName,
          products: 0,
          value: 0,
          percentage: 0,
          items: {
            materia_prima: 0,
            empaques: 0,
            gomas_granel: 0,
            producto_final: 0
          }
        };
      }
      
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        locationStats[locationName].products += item.quantity_available;
        locationStats[locationName].value += item.quantity_available * (product.unit_cost || 0);
        
        // Categorize by product type
        if (product.type) {
          const validTypes = ['materia_prima', 'empaques', 'gomas_granel', 'producto_final'];
          if (validTypes.includes(product.type)) {
            const typeKey = product.type as keyof typeof locationStats[typeof locationName]['items'];
            locationStats[locationName].items[typeKey] += item.quantity_available;
          }
        }
      }
    });

    // Calculate percentages
    const totalValue = Object.values(locationStats).reduce((sum, loc) => sum + loc.value, 0);
    Object.values(locationStats).forEach(loc => {
      loc.percentage = totalValue > 0 ? Math.round((loc.value / totalValue) * 100) : 0;
    });
    
    setInventoryByLocation(Object.values(locationStats));

    // Calculate inventory by type usando las familias definidas
    const typeStats = Object.entries(PRODUCT_FAMILIES).reduce((acc, [key, family]) => {
      acc[key] = {
        label: family.label,
        value: 0,
        quantity: 0,
        color: family.color,
        icon: family.icon,
        type: key,
        description: family.description
      };
      return acc;
    }, {} as Record<string, any>);

    inventory.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product && product.type && typeStats[product.type as keyof typeof typeStats]) {
        const typeKey = product.type as keyof typeof typeStats;
        typeStats[typeKey].quantity += item.quantity_available;
        typeStats[typeKey].value += item.quantity_available * (product.unit_cost || 0);
      }
    });

    setInventoryByType(Object.values(typeStats));

    // Calculate main metrics
    const totalProducts = products?.length || 0;
    const lowStockItems = inventory?.filter(item => {
      const product = products.find(p => p.id === item.product_id);
      return product && item.quantity_available <= (product.min_stock_units || 0);
    }).length || 0;
    
    const totalInventoryValue = inventory?.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      return sum + (item.quantity_available * (product?.unit_cost || 0));
    }, 0) || 0;

    setMetrics({
      totalProducts,
      lowStockItems,
      expiringItems: 0, // Will be calculated with expiry data
      pendingOrders: 0, // Will be calculated with purchase orders
      totalInventoryValue,
      monthlyGrowth: 12.5, // Placeholder - needs historical data
      totalLocations: locations?.length || 0,
      activeUsers: 8 // Placeholder - needs user data
    });
  };

  const loadAdditionalData = async () => {
    try {
      // Load sales data for trends
      const { data: salesData } = await supabase
        .from('sales_data')
        .select('*')
        .gte('sale_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('sale_date', { ascending: true });

      if (salesData) {
        // Process sales data for trends
        const trendMap: { [key: string]: { ventas: number; produccion: number } } = {};
        
        salesData.forEach(sale => {
          const date = sale.sale_date;
          if (!trendMap[date]) {
            trendMap[date] = { ventas: 0, produccion: 0 };
          }
          trendMap[date].ventas += sale.quantity || 0;
        });

        const trend = Object.entries(trendMap).map(([date, data]) => ({
          date,
          ventas: data.ventas,
          produccion: data.produccion || Math.floor(Math.random() * 40) + 80 // Placeholder for production
        }));

        setTrendData(trend);
      }

      // Generate real alerts based on data
      const realAlerts: Alert[] = [];
      
      // Low stock alerts
      if (inventory && products) {
        const lowStockProducts = inventory.filter(item => {
          const product = products.find(p => p.id === item.product_id);
          return product && item.quantity_available <= (product.min_stock_units || 0);
        });

        if (lowStockProducts.length > 0) {
          realAlerts.push({
            id: 'low-stock',
            type: 'warning',
            title: `${lowStockProducts.length} productos bajo stock mínimo`,
            description: 'Requieren reabastecimiento urgente',
            action: 'Ver productos'
          });
        }
      }

      // Expiring items alerts
      if (inventory) {
        const expiringItems = inventory.filter(item => {
          if (!item.expiry_date) return false;
          const expiryDate = new Date(item.expiry_date);
          const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
          return expiryDate <= fiveDaysFromNow;
        });

        if (expiringItems.length > 0) {
          realAlerts.push({
            id: 'expiring',
            type: 'critical',
            title: `${expiringItems.length} lotes próximos a vencer`,
            description: 'Vencen en los próximos 5 días',
            action: 'Ver detalles'
          });
        }
      }

      setAlerts(realAlerts);

    } catch (error) {
      console.error('Error loading additional data:', error);
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-thin text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-2 font-light">Vista general del inventario multi-ubicación</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-5 py-3 bg-white border-0 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400/20 font-light text-gray-700"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-light text-gray-500">Productos Activos</p>
              <p className="text-3xl font-thin text-gray-900 mt-2">{metrics.totalProducts}</p>
              <p className="text-xs font-light text-gray-400 mt-2">SKUs disponibles</p>
            </div>
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Package className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-light text-gray-500">Stock Bajo</p>
              <p className="text-3xl font-thin text-red-600 mt-2">{metrics.lowStockItems}</p>
              <p className="text-xs font-light text-gray-400 mt-2">Requieren atención</p>
            </div>
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-light text-gray-500">Próximos a Vencer</p>
              <p className="text-3xl font-thin text-yellow-600 mt-2">{metrics.expiringItems}</p>
              <p className="text-xs font-light text-gray-400 mt-2">En los próximos 30 días</p>
            </div>
            <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-light text-gray-500">Órdenes Pendientes</p>
              <p className="text-3xl font-thin text-purple-600 mt-2">{metrics.pendingOrders}</p>
              <p className="text-xs font-light text-gray-400 mt-2">Por recibir</p>
            </div>
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center">
              <Truck className="w-7 h-7 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Valor del inventario */}
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-0 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-light text-gray-900">Valor Total del Inventario</h2>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-thin text-gray-900">
              {formatCurrency(metrics.totalInventoryValue)}
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-light ${
              metrics.monthlyGrowth > 0 ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'
            }`}>
              {metrics.monthlyGrowth > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(metrics.monthlyGrowth)}%
            </div>
          </div>
        </div>
        
        {/* Desglose por tipo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {inventoryByType.map((type) => (
            <div key={type.type} className="p-6 bg-gray-50/50 rounded-2xl hover:bg-gray-50/80 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${type.color} bg-opacity-10 rounded-2xl flex items-center justify-center`}>
                  {type.icon}
                </div>
                <span className="text-sm font-light text-gray-700">{type.label}</span>
              </div>
              <p className="text-xl font-thin text-gray-900">{formatCurrency(type.value)}</p>
              <p className="text-xs font-light text-gray-400 mt-1">{type.quantity} unidades</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de ubicaciones y alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventario por ubicación */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-0 shadow-sm">
          <h2 className="text-xl font-light text-gray-900 mb-6">Inventario por Ubicación</h2>
          <div className="space-y-6">
            {inventoryByLocation.map((location, index) => (
              <div key={index} className="border-b border-gray-100/50 last:border-0 pb-6 last:pb-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-light text-gray-900 text-lg">{location.location}</span>
                  </div>
                  <span className="text-lg font-thin text-gray-600">
                    {formatCurrency(location.value)}
                  </span>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full ${LOCATIONS[index].color} transition-all duration-300`}
                    style={{ width: `${location.percentage}%` }}
                  ></div>
                </div>

                {/* Desglose por tipo */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-gray-500">
                    <span className="block font-light text-xs text-gray-400">Mat. Prima</span>
                    <span className="font-light">{location.items.materia_prima}</span>
                  </div>
                  <div className="text-gray-500">
                    <span className="block font-light text-xs text-gray-400">Empaques</span>
                    <span className="font-light">{location.items.empaques}</span>
                  </div>
                  <div className="text-gray-500">
                    <span className="block font-light text-xs text-gray-400">Gomas</span>
                    <span className="font-light">{location.items.gomas_granel}</span>
                  </div>
                  <div className="text-gray-500">
                    <span className="block font-light text-xs text-gray-400">P. Final</span>
                    <span className="font-light">{location.items.producto_final}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Resumen */}
          <div className="mt-6 pt-6 border-t border-gray-100/50">
            <div className="flex justify-between items-center">
              <span className="text-sm font-light text-gray-500">Total productos en todas las ubicaciones:</span>
              <span className="font-light text-lg text-gray-900">
                {inventoryByLocation.reduce((sum, loc) => sum + loc.products, 0)} items
              </span>
            </div>
          </div>
        </div>

        {/* Alertas críticas */}
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-0 shadow-sm">
          <h2 className="text-xl font-light text-gray-900 mb-6">Alertas Críticas</h2>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border-0 ${getAlertBgColor(alert.type)} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm font-light text-gray-900">{alert.title}</p>
                    <p className="text-xs font-light text-gray-500 mt-1">{alert.description}</p>
                    {alert.action && (
                      <button className="text-xs text-orange-600 hover:text-orange-700 mt-3 font-light">
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
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl border-0 shadow-sm">
        <h2 className="text-xl font-light text-gray-900 mb-6">Tendencia Mensual</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-light text-lg">Gráfico de tendencias</p>
            <p className="text-sm font-light mt-2">Ventas vs Producción</p>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <button className="p-6 bg-orange-500/10 text-orange-600 rounded-3xl hover:bg-orange-500/20 hover:shadow-sm transition-all duration-200 flex items-center justify-center gap-3">
          <Package className="w-5 h-5" />
          <span className="font-light">Nuevo Producto</span>
        </button>
        <button className="p-6 bg-blue-500/10 text-blue-600 rounded-3xl hover:bg-blue-500/20 hover:shadow-sm transition-all duration-200 flex items-center justify-center gap-3">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-light">Crear Orden</span>
        </button>
        <button className="p-6 bg-green-500/10 text-green-600 rounded-3xl hover:bg-green-500/20 hover:shadow-sm transition-all duration-200 flex items-center justify-center gap-3">
          <Truck className="w-5 h-5" />
          <span className="font-light">Recibir Mercancía</span>
        </button>
        <button className="p-6 bg-purple-500/10 text-purple-600 rounded-3xl hover:bg-purple-500/20 hover:shadow-sm transition-all duration-200 flex items-center justify-center gap-3">
          <BarChart3 className="w-5 h-5" />
          <span className="font-light">Ver Reportes</span>
        </button>
      </div>
    </div>
  );
}