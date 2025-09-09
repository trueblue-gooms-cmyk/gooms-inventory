// src/pages/Projections.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  Calendar,
  Package,
  AlertTriangle,
  Calculator,
  ShoppingCart,
  BarChart3,
  Info
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SalesHistory {
  product_id: string;
  month: string;
  units_sold: number;
  revenue: number;
}

interface ProductProjection {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  min_stock: number;
  safety_stock: number;
  avg_monthly_sales: number;
  growth_rate: number;
  projected_sales: number;
  months_of_stock: number;
  units_to_produce: number;
  units_to_purchase_materials: number;
  status: 'critical' | 'low' | 'optimal' | 'overstock';
}

export function Projections() {
  const [projections, setProjections] = useState<ProductProjection[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historicalMonths, setHistoricalMonths] = useState(3);
  const [growthPercentage, setGrowthPercentage] = useState(10);
  const [projectionMonths, setProjectionMonths] = useState(1);
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);

  useEffect(() => {
    loadData();
  }, [historicalMonths, growthPercentage, projectionMonths]);

  const loadData = async () => {
    try {
      // Cargar ventas históricas
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - historicalMonths);
      
      const { data: salesData, error: salesError } = await supabase
        .from('sales_data')
        .select('product_id, quantity, total, sale_date')
        .gte('sale_date', startDate.toISOString())
        .order('sale_date');

      if (salesError) throw salesError;

      // Cargar productos e inventario actual
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          sku,
          name,
          min_stock_units,
          safety_stock_units
        `)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Cargar inventario actual
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_current')
        .select('product_id, quantity_available, quantity_reserved')
        .order('product_id');

      if (inventoryError) throw inventoryError;

      // Procesar datos para proyecciones
      const projectionsData = calculateProjections(
        salesData || [],
        productsData || [],
        inventoryData || []
      );

      setProjections(projectionsData);
      
      // Preparar datos históricos para gráficos
      const historyData = processHistoricalData(salesData || []);
      setSalesHistory(historyData);
      
    } catch (error) {
      console.error('Error loading projections:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjections = (sales: any[], products: any[], inventory: any[]) => {
    return products.map(product => {
      // Calcular ventas promedio
      const productSales = sales.filter(s => s.product_id === product.id);
      const totalUnits = productSales.reduce((sum, s) => sum + s.quantity, 0);
      const avgMonthlySales = totalUnits / historicalMonths || 0;
      
      // Calcular stock actual
      const productInventory = inventory.filter(i => i.product_id === product.id);
      const currentStock = productInventory.reduce(
        (sum, i) => sum + i.quantity_available + i.quantity_reserved, 
        0
      );
      
      // Proyectar ventas con crecimiento
      const projectedSales = Math.ceil(
        avgMonthlySales * projectionMonths * (1 + growthPercentage / 100)
      );
      
      // Calcular meses de inventario
      const monthsOfStock = avgMonthlySales > 0 
        ? (currentStock / avgMonthlySales).toFixed(1) 
        : '∞';
      
      // Calcular necesidades de producción
      const targetStock = projectedSales + product.safety_stock_units;
      const unitsToProduce = Math.max(0, targetStock - currentStock);
      
      // Determinar estado
      let status: ProductProjection['status'] = 'optimal';
      if (currentStock < product.min_stock_units) {
        status = 'critical';
      } else if (currentStock < product.safety_stock_units) {
        status = 'low';
      } else if (currentStock > projectedSales * 3) {
        status = 'overstock';
      }
      
      return {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        current_stock: currentStock,
        min_stock: product.min_stock_units,
        safety_stock: product.safety_stock_units,
        avg_monthly_sales: Math.round(avgMonthlySales),
        growth_rate: growthPercentage,
        projected_sales: projectedSales,
        months_of_stock: parseFloat(monthsOfStock) || 0,
        units_to_produce: unitsToProduce,
        units_to_purchase_materials: Math.ceil(unitsToProduce * 1.1), // 10% adicional
        status
      };
    });
  };

  const processHistoricalData = (sales: any[]) => {
    const monthlyData: Record<string, number> = {};
    
    sales.forEach(sale => {
      const month = new Date(sale.sale_date).toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short' 
      });
      monthlyData[month] = (monthlyData[month] || 0) + sale.quantity;
    });
    
    return Object.entries(monthlyData).map(([month, units]) => ({
      product_id: '',
      month,
      units_sold: units,
      revenue: 0
    }));
  };

  const generatePurchaseOrders = async () => {
    const criticalItems = projections.filter(p => 
      p.status === 'critical' || p.status === 'low'
    );
    
    if (criticalItems.length === 0) {
      alert('No hay productos que requieran órdenes de compra');
      return;
    }
    
    // Aquí se generarían las órdenes de compra
    alert(`Se generarán órdenes de compra para ${criticalItems.length} productos`);
  };

  const getStatusBadge = (status: ProductProjection['status']) => {
    const styles = {
      critical: 'bg-red-100 text-red-700',
      low: 'bg-yellow-100 text-yellow-700',
      optimal: 'bg-green-100 text-green-700',
      overstock: 'bg-blue-100 text-blue-700'
    };
    
    const labels = {
      critical: 'Crítico',
      low: 'Bajo',
      optimal: 'Óptimo',
      overstock: 'Sobrestock'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredProjections = showOnlyCritical 
    ? projections.filter(p => p.status === 'critical' || p.status === 'low')
    : projections;

  const metrics = {
    totalProducts: projections.length,
    criticalProducts: projections.filter(p => p.status === 'critical').length,
    lowStockProducts: projections.filter(p => p.status === 'low').length,
    totalToProduce: projections.reduce((sum, p) => sum + p.units_to_produce, 0)
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Proyecciones</h1>
          <p className="text-gray-600 mt-1">Análisis predictivo y planificación de inventario</p>
        </div>
        <button
          onClick={generatePurchaseOrders}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Generar Órdenes de Compra</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Productos Analizados</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Crítico</p>
              <p className="text-2xl font-bold text-red-600">{metrics.criticalProducts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-600">{metrics.lowStockProducts}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unidades a Producir</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalToProduce}</p>
            </div>
            <Calculator className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Parámetros de Proyección
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Histórico (meses)
            </label>
            <select
              value={historicalMonths}
              onChange={(e) => setHistoricalMonths(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={1}>Último mes</option>
              <option value={2}>Últimos 2 meses</option>
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Último año</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crecimiento esperado (%)
            </label>
            <input
              type="number"
              value={growthPercentage}
              onChange={(e) => setGrowthPercentage(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              min="0"
              max="100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyectar (meses)
            </label>
            <select
              value={projectionMonths}
              onChange={(e) => setProjectionMonths(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={1}>1 mes</option>
              <option value={2}>2 meses</option>
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Historical Chart */}
      {salesHistory.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold mb-4">Tendencia Histórica de Ventas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="units_sold" 
                stroke="#f97316" 
                strokeWidth={2}
                name="Unidades Vendidas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowOnlyCritical(!showOnlyCritical)}
          className={`px-4 py-2 rounded-lg border ${
            showOnlyCritical 
              ? 'bg-red-50 border-red-300 text-red-700' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Solo Críticos
        </button>
      </div>

      {/* Projections Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venta Promedio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proyección</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meses Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">A Producir</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjections.map((projection) => (
                <tr key={projection.product_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{projection.product_name}</p>
                      <p className="text-xs text-gray-500">{projection.sku}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      projection.current_stock < projection.min_stock 
                        ? 'text-red-600' 
                        : 'text-gray-900'
                    }`}>
                      {projection.current_stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {projection.avg_monthly_sales}/mes
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">
                    {projection.projected_sales}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {projection.months_of_stock === 0 
                      ? '0' 
                      : projection.months_of_stock.toFixed(1)}
                  </td>
                  <td className="px-6 py-4">
                    {projection.units_to_produce > 0 && (
                      <span className="text-sm font-bold text-orange-600">
                        {projection.units_to_produce}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(projection.status)}
                  </td>
                  <td className="px-6 py-4">
                    {projection.units_to_produce > 0 && (
                      <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                        Crear Orden
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Cómo funcionan las proyecciones:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Analizamos las ventas históricas de los últimos {historicalMonths} meses</li>
              <li>• Aplicamos un crecimiento del {growthPercentage}% sobre el promedio</li>
              <li>• Calculamos las necesidades para los próximos {projectionMonths} mes(es)</li>
              <li>• Sugerimos producción considerando el stock de seguridad</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}