// src/pages/Dashboard.tsx - Versión corregida con datos reales
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// Removed non-existent imports
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  ShoppingCart,
  BarChart3,
  Activity,
  RefreshCw,
  Users,
  FileText,
  MapPin
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface DashboardMetrics {
  totalProducts: number;
  lowStockItems: number;
  expiringItems: number;
  pendingOrders: number;
  totalSalesAmount: number;
  totalSalesUnits: number;
  inventoryValue: number;
  productionBatches: number;
  activeLocations: number;
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProducts: 0,
    lowStockItems: 0,
    expiringItems: 0,
    pendingOrders: 0,
    totalSalesAmount: 0,
    totalSalesUnits: 0,
    inventoryValue: 0,
    productionBatches: 0,
    activeLocations: 0
  });

  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [inventoryByLocation, setInventoryByLocation] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const [dateRange] = useState({ label: 'Últimos 30 días' });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadSalesTrend(),
        loadInventoryByLocation(),
        loadTopProducts()
      ]);
      setLastUpdate(new Date().toLocaleTimeString());
      toast.success('Dashboard actualizado');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      // Total de productos únicos
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('is_active', true);

      // Inventario actual con alertas de stock bajo
      const { data: inventory } = await supabase
        .from('inventory_current')
        .select(`
          *,
          products (id, name, sku)
        `);

      const lowStockItems = inventory?.filter(item => 
        item.quantity_available < 10 // Simplified threshold
      ).length || 0;

      const inventoryValue = inventory?.reduce((sum, item) => 
        sum + (item.quantity_available * 10), 0 // Simplified calculation
      ) || 0;

      // Lotes próximos a vencer (30 días)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const { data: expiringBatches } = await supabase
        .from('production_batches')
        .select('id')
        .lt('expiry_date', expiryDate.toISOString())
        .eq('status', 'completed');

      // Órdenes pendientes
      const { data: pendingOrders } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('status', 'pending_approval');

      // Ventas en el período
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: sales } = await supabase
        .from('sales_data')
        .select('total, quantity')
        .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('sale_date', new Date().toISOString().split('T')[0]);

      const totalSalesAmount = sales?.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;
      const totalSalesUnits = sales?.reduce((sum, sale) => sum + (sale.quantity || 0), 0) || 0;

      // Lotes en producción
      const { data: productionBatches } = await supabase
        .from('production_batches')
        .select('id')
        .in('status', ['planned', 'in_production']);

      // Ubicaciones activas
      const { data: locations } = await supabase
        .from('locations')
        .select('id')
        .eq('is_active', true);

      setMetrics({
        totalProducts: products?.length || 0,
        lowStockItems,
        expiringItems: expiringBatches?.length || 0,
        pendingOrders: pendingOrders?.length || 0,
        totalSalesAmount,
        totalSalesUnits,
        inventoryValue,
        productionBatches: productionBatches?.length || 0,
        activeLocations: locations?.length || 0
      });

    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadSalesTrend = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: sales } = await supabase
        .from('sales_data')
        .select('sale_date, total, quantity')
        .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('sale_date', new Date().toISOString().split('T')[0])
        .order('sale_date');

      const salesByDate = sales?.reduce((acc, sale) => {
        const date = new Date(sale.sale_date).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, ventas: 0, cantidad: 0 };
        }
        acc[date].ventas += sale.total || 0;
        acc[date].cantidad += sale.quantity || 0;
        return acc;
      }, {} as Record<string, any>);

      setSalesTrend(Object.values(salesByDate || {}));
    } catch (error) {
      console.error('Error loading sales trend:', error);
      setSalesTrend([]);
    }
  };

  const loadInventoryByLocation = async () => {
    try {
      const { data: inventory } = await supabase
        .from('inventory_current')
        .select(`
          quantity_available,
          quantity_reserved,
          locations (name)
        `);

      const locationData = inventory?.reduce((acc, item) => {
        const location = item.locations?.name || 'Sin ubicación';
        if (!acc[location]) {
          acc[location] = { name: location, disponible: 0, reservado: 0 };
        }
        acc[location].disponible += item.quantity_available || 0;
        acc[location].reservado += item.quantity_reserved || 0;
        return acc;
      }, {} as Record<string, any>);

      setInventoryByLocation(Object.values(locationData || {}));
    } catch (error) {
      console.error('Error loading inventory by location:', error);
      setInventoryByLocation([]);
    }
  };

  const loadTopProducts = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: sales } = await supabase
        .from('sales_data')
        .select(`
          quantity,
          total,
          products (name, sku)
        `)
        .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('sale_date', new Date().toISOString().split('T')[0]);

      const productSales = sales?.reduce((acc, sale) => {
        const productName = sale.products?.name || 'Producto desconocido';
        if (!acc[productName]) {
          acc[productName] = { name: productName, cantidad: 0, ventas: 0 };
        }
        acc[productName].cantidad += sale.quantity || 0;
        acc[productName].ventas += sale.total || 0;
        return acc;
      }, {} as Record<string, any>);

      const sortedProducts = Object.values(productSales || {})
        .sort((a: any, b: any) => b.cantidad - a.cantidad)
        .slice(0, 5);

      setTopProducts(sortedProducts);
    } catch (error) {
      console.error('Error loading top products:', error);
      setTopProducts([]);
    }
  };

  const metricCards = [
    {
      title: 'Productos Activos',
      value: metrics.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Stock Bajo',
      value: metrics.lowStockItems,
      icon: AlertTriangle,
      color: metrics.lowStockItems > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: metrics.lowStockItems > 0 ? 'bg-red-50' : 'bg-green-50'
    },
    {
      title: 'Próximos a Vencer',
      value: metrics.expiringItems,
      icon: Clock,
      color: metrics.expiringItems > 0 ? 'text-orange-600' : 'text-green-600',
      bgColor: metrics.expiringItems > 0 ? 'bg-orange-50' : 'bg-green-50'
    },
    {
      title: 'Órdenes Pendientes',
      value: metrics.pendingOrders,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Ventas Período',
      value: `$${(metrics.totalSalesAmount / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Unidades Vendidas',
      value: metrics.totalSalesUnits,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Valor Inventario',
      value: `$${(metrics.inventoryValue / 1000000).toFixed(1)}M`,
      icon: BarChart3,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
    {
      title: 'Ubicaciones',
      value: metrics.activeLocations,
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

  if (loading && metrics.totalProducts === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Vista general del inventario</p>
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-1">
              Última actualización: {lastUpdate}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className={`${metric.bgColor} rounded-lg p-6 border border-gray-200 transition-all hover:shadow-md`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className={`text-3xl font-bold ${metric.color} mt-1`}>
                    {metric.value}
                  </p>
                </div>
                <Icon className={`w-8 h-8 ${metric.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Alertas críticas */}
      {(metrics.lowStockItems > 0 || metrics.expiringItems > 0 || metrics.pendingOrders > 0) && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800">Alertas Críticas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {metrics.lowStockItems > 0 && (
              <div className="flex items-center gap-2 text-red-700">
                <Package className="w-4 h-4" />
                <strong>{metrics.lowStockItems}</strong> productos con stock bajo
              </div>
            )}
            {metrics.expiringItems > 0 && (
              <div className="flex items-center gap-2 text-orange-700">
                <Clock className="w-4 h-4" />
                <strong>{metrics.expiringItems}</strong> lotes próximos a vencer
              </div>
            )}
            {metrics.pendingOrders > 0 && (
              <div className="flex items-center gap-2 text-purple-700">
                <ShoppingCart className="w-4 h-4" />
                <strong>{metrics.pendingOrders}</strong> órdenes esperando aprobación
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de ventas */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Ventas ({dateRange.label})</h3>
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'ventas' ? `$${value.toLocaleString()}` : value,
                    name === 'ventas' ? 'Ventas' : 'Cantidad'
                  ]}
                />
                <Line type="monotone" dataKey="ventas" stroke="#f97316" strokeWidth={2} name="ventas" />
                <Line type="monotone" dataKey="cantidad" stroke="#10b981" strokeWidth={2} name="cantidad" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay datos de ventas en este período</p>
              </div>
            </div>
          )}
        </div>

        {/* Inventario por ubicación */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Inventario por Ubicación</h3>
          {inventoryByLocation.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventoryByLocation}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="disponible" stackId="a" fill="#f97316" name="Disponible" />
                <Bar dataKey="reservado" stackId="a" fill="#10b981" name="Reservado" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay datos de inventario</p>
              </div>
            </div>
          )}
        </div>

        {/* Top productos */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Top Productos ({dateRange.label})</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{fontSize: 12}} />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3b82f6" name="Unidades Vendidas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hay datos de productos en este período</p>
              </div>
            </div>
          )}
        </div>

        {/* Estado general */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Estado del Sistema</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Productos activos</span>
              <span className="font-medium">{metrics.totalProducts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Ubicaciones</span>
              <span className="font-medium">{metrics.activeLocations}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Lotes en producción</span>
              <span className="font-medium">{metrics.productionBatches}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Estado del inventario</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                metrics.lowStockItems === 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {metrics.lowStockItems === 0 ? 'Óptimo' : 'Requiere atención'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center justify-center gap-2 p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
            <Package className="w-5 h-5" />
            <span>Ver Inventario</span>
          </button>
          
          <button className="flex items-center justify-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            <ShoppingCart className="w-5 h-5" />
            <span>Nueva Orden</span>
          </button>
          
          <button className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            <BarChart3 className="w-5 h-5" />
            <span>Producción</span>
          </button>
          
          <button className="flex items-center justify-center gap-2 p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
            <FileText className="w-5 h-5" />
            <span>Reportes</span>
          </button>
        </div>
      </div>
    </div>
  );
}