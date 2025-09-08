import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, 
  TrendingUp, 
  AlertCircle, 
  ShoppingCart,
  Calendar,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  totalProducts: number;
  lowStockAlerts: number;
  pendingOrders: number;
  monthlyProduction: number;
  inventoryValue: number;
  topProducts: Array<{ name: string; quantity: number }>;
  monthlyTrend: Array<{ month: string; sales: number; production: number }>;
  inventoryByLocation: Array<{ location: string; value: number; percentage: number }>;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    totalProducts: 0,
    lowStockAlerts: 0,
    pendingOrders: 0,
    monthlyProduction: 0,
    inventoryValue: 0,
    topProducts: [],
    monthlyTrend: [],
    inventoryByLocation: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Cargar productos y alertas de stock
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      const { data: inventory } = await supabase
        .from('inventory_current')
        .select('*, products(name, min_stock_units)');

      // Calcular alertas de stock bajo
      const lowStock = inventory?.filter(item => 
        item.quantity_available < (item.products?.min_stock_units || 0)
      ).length || 0;

      // Órdenes pendientes
      const { data: orders } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('status', ['pending_approval', 'approved', 'sent']);

      // Datos de ejemplo para gráficos (en producción vendrían de la BD)
      const mockData: DashboardData = {
        totalProducts: products?.length || 0,
        lowStockAlerts: lowStock,
        pendingOrders: orders?.length || 0,
        monthlyProduction: 1250,
        inventoryValue: 45780000,
        topProducts: [
          { name: 'Lights Out: Dormir', quantity: 523 },
          { name: 'How Pretty: Belleza', quantity: 412 },
          { name: 'Dynamic Boost: Energía', quantity: 389 },
          { name: 'Gut Health: Digestión', quantity: 267 },
          { name: 'Mental Ease: Calma', quantity: 198 }
        ],
        monthlyTrend: [
          { month: 'Sep', sales: 850, production: 920 },
          { month: 'Oct', sales: 920, production: 1050 },
          { month: 'Nov', sales: 1100, production: 1200 },
          { month: 'Dic', sales: 1350, production: 1400 },
          { month: 'Ene', sales: 980, production: 1100 },
          { month: 'Feb', sales: 1150, production: 1250 }
        ],
        inventoryByLocation: [
          { location: 'Maquila', value: 45, percentage: 45 },
          { location: 'Farmatodo', value: 30, percentage: 30 },
          { location: 'Oficina', value: 15, percentage: 15 },
          { location: 'Tránsito', value: 10, percentage: 10 }
        ]
      };

      setData(mockData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6'];

  const StatCard = ({ title, value, icon: Icon, trend, alert }: any) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          alert ? 'bg-red-100' : 'bg-orange-100'
        }`}>
          <Icon className={`w-6 h-6 ${alert ? 'text-red-600' : 'text-orange-600'}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-gray-600 text-sm mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          <Calendar className="w-4 h-4" />
          <span>Últimos 30 días</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Productos Activos" 
          value={data.totalProducts}
          icon={Package}
          trend={12}
        />
        <StatCard 
          title="Alertas de Stock" 
          value={data.lowStockAlerts}
          icon={AlertCircle}
          alert={true}
        />
        <StatCard 
          title="Órdenes Pendientes" 
          value={data.pendingOrders}
          icon={ShoppingCart}
        />
        <StatCard 
          title="Producción Mensual" 
          value={`${data.monthlyProduction} unidades`}
          icon={Activity}
          trend={8}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia Mensual */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia Mensual</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#f97316" 
                strokeWidth={2}
                name="Ventas"
              />
              <Line 
                type="monotone" 
                dataKey="production" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Producción"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Productos */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Productos</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.topProducts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="quantity" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventario por Ubicación */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventario por Ubicación</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.inventoryByLocation}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {data.inventoryByLocation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {data.inventoryByLocation.map((item, index) => (
              <div key={item.location} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-gray-600">{item.location}</span>
                </div>
                <span className="font-medium">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Valor del Inventario */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Valor Total Inventario</h3>
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">
                ${(data.inventoryValue / 1000000).toFixed(1)}M
              </p>
              <p className="text-gray-600 mt-2">COP</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Variación mensual</span>
              <span className="text-green-600 font-medium">+5.2%</span>
            </div>
          </div>
        </div>

        {/* Alertas Recientes */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Recientes</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Stock Bajo</p>
                <p className="text-xs text-gray-600">Lights Out: 15 unidades</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Vencimiento Próximo</p>
                <p className="text-xs text-gray-600">Lote #2024-11: 30 días</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Orden Pendiente</p>
                <p className="text-xs text-gray-600">PO-2024-089 esperando aprobación</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}