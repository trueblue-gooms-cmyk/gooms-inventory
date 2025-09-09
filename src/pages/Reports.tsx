// src/pages/Reports.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileBarChart,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Printer,
  FileText,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import * as XLSX from 'xlsx';

interface ReportData {
  inventory: any[];
  sales: any[];
  production: any[];
  purchases: any[];
  movements: any[];
}

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('inventory');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<ReportData>({
    inventory: [],
    sales: [],
    production: [],
    purchases: [],
    movements: []
  });

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Cargar datos de inventario
      const { data: inventoryData } = await supabase
        .from('inventory_current')
        .select(`
          *,
          products (sku, name, min_stock_units),
          locations (name, type)
        `);

      // Cargar ventas
      const { data: salesData } = await supabase
        .from('sales_data')
        .select('*')
        .gte('sale_date', dateRange.from)
        .lte('sale_date', dateRange.to);

      // Cargar producción
      const { data: productionData } = await supabase
        .from('production_batches')
        .select(`
          *,
          products (sku, name),
          locations (name)
        `)
        .gte('production_date', dateRange.from)
        .lte('production_date', dateRange.to);

      // Cargar compras
      const { data: purchasesData } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (name),
          purchase_order_items (*)
        `)
        .gte('order_date', dateRange.from)
        .lte('order_date', dateRange.to);

      // Cargar movimientos
      const { data: movementsData } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          products (sku, name)
        `)
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to);

      setReportData({
        inventory: inventoryData || [],
        sales: salesData || [],
        production: productionData || [],
        purchases: purchasesData || [],
        movements: movementsData || []
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws_data = [];
    
    switch (reportType) {
      case 'inventory':
        ws_data.push(['SKU', 'Producto', 'Ubicación', 'Disponible', 'Reservado', 'En Tránsito', 'Total']);
        reportData.inventory.forEach(item => {
          ws_data.push([
            item.products?.sku || '',
            item.products?.name || '',
            item.locations?.name || '',
            item.quantity_available || 0,
            item.quantity_reserved || 0,
            item.quantity_in_transit || 0,
            (item.quantity_available + item.quantity_reserved + item.quantity_in_transit) || 0
          ]);
        });
        break;
        
      case 'sales':
        ws_data.push(['Fecha', 'Cliente', 'Producto', 'Cantidad', 'Total', 'Canal']);
        reportData.sales.forEach(sale => {
          ws_data.push([
            new Date(sale.sale_date).toLocaleDateString(),
            sale.customer_name || '',
            sale.product_id || '',
            sale.quantity || 0,
            sale.total || 0,
            sale.channel || ''
          ]);
        });
        break;
        
      case 'production':
        ws_data.push(['Lote', 'Producto', 'Cantidad', 'Fecha Producción', 'Fecha Vencimiento', 'Estado']);
        reportData.production.forEach(batch => {
          ws_data.push([
            batch.batch_number || '',
            batch.products?.name || '',
            batch.actual_quantity || batch.planned_quantity || 0,
            new Date(batch.production_date).toLocaleDateString(),
            new Date(batch.expiry_date).toLocaleDateString(),
            batch.status || ''
          ]);
        });
        break;
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    window.print();
  };

  const getReportMetrics = () => {
    switch (reportType) {
      case 'inventory':
        const totalItems = reportData.inventory.reduce((sum, item) => 
          sum + item.quantity_available + item.quantity_reserved + item.quantity_in_transit, 0
        );
        const lowStock = reportData.inventory.filter(item => 
          item.quantity_available < (item.products?.min_stock_units || 0)
        ).length;
        return [
          { label: 'Total Items', value: totalItems, icon: Package, color: 'text-blue-600' },
          { label: 'Productos', value: new Set(reportData.inventory.map(i => i.product_id)).size, icon: BarChart3, color: 'text-green-600' },
          { label: 'Stock Bajo', value: lowStock, icon: TrendingUp, color: 'text-red-600' },
          { label: 'Ubicaciones', value: new Set(reportData.inventory.map(i => i.location_id)).size, icon: Activity, color: 'text-purple-600' }
        ];
        
      case 'sales':
        const totalSales = reportData.sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalUnits = reportData.sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
        return [
          { label: 'Ventas Totales', value: `$${(totalSales / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-green-600' },
          { label: 'Unidades', value: totalUnits, icon: Package, color: 'text-blue-600' },
          { label: 'Órdenes', value: reportData.sales.length, icon: FileText, color: 'text-purple-600' },
          { label: 'Ticket Promedio', value: `$${Math.round(totalSales / reportData.sales.length)}`, icon: TrendingUp, color: 'text-orange-600' }
        ];
        
      case 'production':
        const totalProduced = reportData.production.reduce((sum, batch) => 
          sum + (batch.actual_quantity || batch.planned_quantity || 0), 0
        );
        const completed = reportData.production.filter(b => b.status === 'completed').length;
        return [
          { label: 'Lotes', value: reportData.production.length, icon: Package, color: 'text-blue-600' },
          { label: 'Unidades Producidas', value: totalProduced, icon: BarChart3, color: 'text-green-600' },
          { label: 'Completados', value: completed, icon: TrendingUp, color: 'text-purple-600' },
          { label: 'Eficiencia', value: `${Math.round((completed / reportData.production.length) * 100)}%`, icon: Activity, color: 'text-orange-600' }
        ];
        
      default:
        return [];
    }
  };

  const getChartData = () => {
    switch (reportType) {
      case 'inventory':
        const locationData = reportData.inventory.reduce((acc, item) => {
          const location = item.locations?.name || 'Sin ubicación';
          if (!acc[location]) acc[location] = 0;
          acc[location] += item.quantity_available + item.quantity_reserved + item.quantity_in_transit;
          return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(locationData).map(([name, value]) => ({ name, value }));
        
      case 'sales':
        const salesByDate = reportData.sales.reduce((acc, sale) => {
          const date = new Date(sale.sale_date).toLocaleDateString();
          if (!acc[date]) acc[date] = { date, cantidad: 0, total: 0 };
          acc[date].cantidad += sale.quantity || 0;
          acc[date].total += sale.total || 0;
          return acc;
        }, {} as Record<string, any>);
        
        return Object.values(salesByDate);
        
      case 'production':
        const productionByStatus = reportData.production.reduce((acc, batch) => {
          if (!acc[batch.status]) acc[batch.status] = 0;
          acc[batch.status] += batch.actual_quantity || batch.planned_quantity || 0;
          return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(productionByStatus).map(([name, value]) => ({ name, value }));
        
      default:
        return [];
    }
  };

  const reportTypes = [
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'sales', label: 'Ventas', icon: DollarSign },
    { id: 'production', label: 'Producción', icon: BarChart3 },
    { id: 'purchases', label: 'Compras', icon: FileText },
    { id: 'movements', label: 'Movimientos', icon: Activity }
  ];

  const metrics = getReportMetrics();
  const chartData = getChartData();
  const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

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
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1">Análisis y exportación de datos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Printer className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            {reportTypes.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    reportType === type.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </button>
              );
            })}
          </div>
          
          <div className="flex gap-2 ml-auto">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{metric.label}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                </div>
                <Icon className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line/Bar Chart */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {reportType === 'sales' ? 'Tendencia de Ventas' : 'Distribución'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            {reportType === 'sales' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cantidad" stroke="#f97316" strokeWidth={2} name="Cantidad" />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Total" />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Composición</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Detalle del Reporte</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {reportType === 'inventory' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponible</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </>
                )}
                {reportType === 'sales' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                  </>
                )}
                {reportType === 'production' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportType === 'inventory' && reportData.inventory.slice(0, 10).map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{item.products?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.products?.sku}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.locations?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.quantity_available}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {item.quantity_available + item.quantity_reserved + item.quantity_in_transit}
                  </td>
                </tr>
              ))}
              {reportType === 'sales' && reportData.sales.slice(0, 10).map((sale, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.customer_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{sale.quantity}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${sale.total?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.channel}</td>
                </tr>
              ))}
              {reportType === 'production' && reportData.production.slice(0, 10).map((batch, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{batch.batch_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{batch.products?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {batch.actual_quantity || batch.planned_quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(batch.production_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      batch.status === 'completed' ? 'bg-green-100 text-green-700' :
                      batch.status === 'in_production' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}