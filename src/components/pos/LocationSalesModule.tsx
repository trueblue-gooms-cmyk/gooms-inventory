import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  Calendar, 
  Filter,
  Download,
  Plus,
  Eye,
  RefreshCw,
  CreditCard,
  Clock,
  BarChart3
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { salesService, LocationSalesMetrics, SalesComparison } from '@/services/salesService';
import { MobileOptimizedTable } from '@/components/MobileOptimizedTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface LocationSalesModuleProps {
  className?: string;
}

export function LocationSalesModule({ className = '' }: LocationSalesModuleProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('*').eq('is_active', true);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: sales, isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['sales', selectedLocation, dateRange],
    queryFn: () => {
      const days = parseInt(dateRange);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      return salesService.getSales(
        selectedLocation === 'all' ? undefined : selectedLocation,
        startDate
      );
    }
  });

  const { data: salesMetrics } = useQuery({
    queryKey: ['sales-metrics', selectedLocation, dateRange],
    queryFn: () => {
      if (selectedLocation === 'all') return null;
      return salesService.getLocationSalesMetrics(selectedLocation, parseInt(dateRange));
    },
    enabled: selectedLocation !== 'all'
  });

  const { data: salesComparison } = useQuery({
    queryKey: ['sales-comparison', selectedLocation, dateRange],
    queryFn: () => {
      if (selectedLocation === 'all') return null;
      return salesService.getSalesComparison(selectedLocation, parseInt(dateRange));
    },
    enabled: selectedLocation !== 'all'
  });

  const { data: salesByLocation } = useQuery({
    queryKey: ['sales-by-location', dateRange],
    queryFn: () => {
      const days = parseInt(dateRange);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      return salesService.getSalesByLocation(startDate);
    },
    enabled: selectedLocation === 'all'
  });

  const { data: salesSummary } = useQuery({
    queryKey: ['sales-summary', selectedLocation, dateRange],
    queryFn: () => salesService.getSalesSummary(
      selectedLocation === 'all' ? undefined : selectedLocation,
      parseInt(dateRange)
    )
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="w-4 h-4" />;
    if (growth < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  const salesColumns = [
    {
      key: 'sale_number',
      label: 'Número',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{value as string}</span>
      )
    },
    {
      key: 'customer_name',
      label: 'Cliente',
      render: (value: unknown) => value || 'Cliente general'
    },
    {
      key: 'total_amount',
      label: 'Total',
      render: (value: unknown) => formatCurrency(value as number)
    },
    {
      key: 'payment_method',
      label: 'Método',
      render: (value: unknown) => {
        const method = value as string;
        const colors = {
          cash: 'green',
          card: 'blue',
          transfer: 'purple',
          mixed: 'orange'
        };
        return <Badge variant={
          (colors as any)[method as keyof typeof colors] === 'green' ? 'secondary' :
          (colors as any)[method as keyof typeof colors] === 'blue' ? 'default' :
          (colors as any)[method as keyof typeof colors] === 'purple' ? 'outline' :
          'secondary'
        }>{method}</Badge>;
      },
      mobileHidden: true
    },
    {
      key: 'sale_status',
      label: 'Estado',
      render: (value: unknown) => {
        const status = value as string;
        const colors = {
          completed: 'green',
          pending: 'yellow',
          cancelled: 'red',
          refunded: 'gray'
        };
        return <Badge variant={
          (colors as any)[status as keyof typeof colors] === 'green' ? 'secondary' :
          (colors as any)[status as keyof typeof colors] === 'red' ? 'destructive' :
          'secondary'
        }>{status}</Badge>;
      }
    },
    {
      key: 'sale_date',
      label: 'Fecha',
      render: (value: unknown) => new Date(value as string).toLocaleDateString('es-ES'),
      mobileHidden: true
    }
  ];

  const salesActions = [
    {
      key: 'view',
      label: 'Ver',
      icon: <Eye className="w-4 h-4" />,
      onClick: (row: Record<string, unknown>) => {
        console.log('Ver venta:', row.id);
      },
      variant: 'outline' as const
    }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulo de Ventas</h1>
          <p className="text-gray-600">Gestión y análisis de ventas por ubicación</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar ubicación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ubicaciones</SelectItem>
              {locations?.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
              <SelectItem value="365">1 año</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowNewSaleModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Venta
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(salesSummary?.totalSales || 0)}
            </div>
            <div className={`flex items-center gap-1 text-xs ${getGrowthColor(salesSummary?.growthRate || 0)}`}>
              {getGrowthIcon(salesSummary?.growthRate || 0)}
              {formatPercentage(salesSummary?.growthRate || 0)} vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(salesSummary?.totalProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Margen: {formatPercentage(salesSummary?.profitMargin || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesSummary?.totalTransactions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(salesSummary?.averageTransaction || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {salesMetrics?.profit_margin.toFixed(1) || 0}%
            </div>
            <Progress value={salesMetrics?.profit_margin || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de ventas diarias */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesByLocation?.[0]?.daily_sales || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ventas por ubicación */}
            {selectedLocation === 'all' && (
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Ubicación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesByLocation?.slice(0, 5).map((location, index) => (
                      <div key={location.location_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="font-medium">{location.location_name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(location.total_sales)}</div>
                          <div className="text-sm text-gray-500">{location.transaction_count} ventas</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Métodos de pago */}
            {salesMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={salesMetrics.payment_methods}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ method, percentage }) => `${method} (${percentage.toFixed(1)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {salesMetrics.payment_methods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Ventas por hora */}
            {salesMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución Horaria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={salesMetrics.hourly_sales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Registro de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MobileOptimizedTable
                data={sales as any || []}
                columns={salesColumns as any}
                actions={salesActions as any}
                searchable={true}
                pagination={true}
                pageSize={15}
                onRowClick={(row) => console.log('Ver detalles:', row)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comparación de períodos */}
            {salesComparison && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparación de Períodos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Crecimiento de Ventas:</span>
                      <div className={`flex items-center gap-1 ${getGrowthColor(salesComparison.revenue_growth)}`}>
                        {getGrowthIcon(salesComparison.revenue_growth)}
                        <span className="font-semibold">{formatPercentage(salesComparison.revenue_growth)}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Crecimiento de Beneficio:</span>
                      <div className={`flex items-center gap-1 ${getGrowthColor(salesComparison.profit_growth)}`}>
                        {getGrowthIcon(salesComparison.profit_growth)}
                        <span className="font-semibold">{formatPercentage(salesComparison.profit_growth)}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Crecimiento de Transacciones:</span>
                      <div className={`flex items-center gap-1 ${getGrowthColor(salesComparison.transaction_growth)}`}>
                        {getGrowthIcon(salesComparison.transaction_growth)}
                        <span className="font-semibold">{formatPercentage(salesComparison.transaction_growth)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs de rendimiento */}
            <Card>
              <CardHeader>
                <CardTitle>KPIs de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Ticket Promedio:</span>
                    <span className="font-semibold">{formatCurrency(salesMetrics?.average_transaction_value || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Margen de Beneficio:</span>
                    <span className="font-semibold text-green-600">{formatPercentage(salesMetrics?.profit_margin || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Unidades Vendidas:</span>
                    <span className="font-semibold">{salesMetrics?.total_units_sold || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Transacciones Totales:</span>
                    <span className="font-semibold">{salesMetrics?.total_transactions || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesMetrics?.best_selling_products.slice(0, 10).map((product, index) => (
                  <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.product_name}</p>
                        <p className="text-sm text-gray-600">{product.units_sold} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                      <p className="text-sm text-green-600">{formatCurrency(product.profit)} beneficio</p>
                    </div>
                  </div>
                ))}
                
                {(!salesMetrics?.best_selling_products || salesMetrics.best_selling_products.length === 0) && (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin datos de productos</h3>
                    <p className="text-gray-600">No hay ventas registradas en el período seleccionado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}