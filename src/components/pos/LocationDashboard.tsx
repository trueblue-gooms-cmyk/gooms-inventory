import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, MapPin, Package, TrendingUp, TrendingDown, RefreshCw, Bell, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { pointOfSaleService, LocationMetrics, SalesPerformance, RestockSuggestion, LocationAlert } from '@/services/pointOfSaleService';
import { useNotification } from '@/components/ui/NotificationProvider';
import { supabase } from '@/integrations/supabase/client';

interface LocationDashboardProps {
  className?: string;
}

export function LocationDashboard({ className = '' }: LocationDashboardProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const { info, warning, error, success } = useNotification();

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['location-metrics', selectedLocation],
    queryFn: () => selectedLocation ? pointOfSaleService.getLocationMetrics(selectedLocation) : Promise.resolve(null),
    enabled: !!selectedLocation
  });

  const { data: salesPerformance, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-performance', selectedLocation],
    queryFn: () => selectedLocation ? pointOfSaleService.getSalesPerformance(selectedLocation, '30', 'daily') : Promise.resolve(null),
    enabled: !!selectedLocation
  });

  const { data: restockSuggestions, isLoading: restockLoading } = useQuery({
    queryKey: ['restock-suggestions', selectedLocation],
    queryFn: () => selectedLocation ? pointOfSaleService.getRestockSuggestions(selectedLocation) : null,
    enabled: !!selectedLocation
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['location-alerts', selectedLocation],
    queryFn: () => selectedLocation ? pointOfSaleService.getLocationAlerts(selectedLocation) : null,
    enabled: !!selectedLocation
  });

  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);

  const handleRefresh = async () => {
    await refetchMetrics();
    await refetchAlerts();
    success('Datos actualizados', 'Dashboard actualizado correctamente');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      default: return 'secondary';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con selector de ubicación */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Ubicaciones</h1>
          <p className="text-gray-600">Monitoreo y métricas por punto de venta</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Seleccionar ubicación" />
            </SelectTrigger>
            <SelectContent>
              {locations?.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {location.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {selectedLocation && (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricsLoading ? '...' : (metrics as any)?.total_products || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(metrics as any)?.low_stock_items || 0} con stock bajo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getPerformanceColor((metrics as any)?.performance_score || 0)}`}>
                  {metricsLoading ? '...' : `${(metrics as any)?.performance_score || 0}%`}
                </div>
                <Progress value={(metrics as any)?.performance_score || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Velocidad de Venta</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricsLoading ? '...' : ((metrics as any)?.sales_velocity || 0).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">unidades/día</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {alerts?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {alerts?.filter(a => (a as any).priority === 'critical').length || 0} críticas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alertas críticas */}
          {alerts && alerts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Alertas de la Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={(alert as any).priority === 'critical' ? 'destructive' : 'secondary'}>
                            {(alert as any).priority}
                          </Badge>
                          <span className="font-medium">{(alert as any).title}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{(alert as any).message}</p>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Hace {Math.floor((Date.now() - new Date((alert as any).created_at).getTime()) / (1000 * 60))} min
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sugerencias de reposición */}
          {restockSuggestions && restockSuggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Sugerencias de Reposición
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {restockSuggestions.slice(0, 10).map((suggestion, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={(suggestion as any).priority === 'critical' ? 'destructive' : 'secondary'}>
                            {(suggestion as any).priority}
                          </Badge>
                          <span className="font-medium">{(suggestion as any).product_name}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Stock actual: {(suggestion as any).current_stock} | Sugerido: {(suggestion as any).suggested_quantity}
                        </p>
                      </div>
                      <div className="text-sm text-gray-700">
                        {formatCurrency((suggestion as any).estimated_cost)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance de ventas */}
          {salesPerformance && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance de Ventas (30 días)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Ventas:</span>
                      <span className="text-lg font-bold">{formatCurrency((salesPerformance as any).total_sales)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Unidades Vendidas:</span>
                      <span className="text-lg font-bold">{(salesPerformance as any).total_units}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Precio Promedio:</span>
                      <span className="text-lg font-bold">{formatCurrency((salesPerformance as any).average_sale)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Crecimiento vs mes anterior:</span>
                      <div className="flex items-center gap-1">
                        {(salesPerformance as any).growth_rate >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-bold ${(salesPerformance as any).growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {((salesPerformance as any).growth_rate).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribución Horaria de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {((salesPerformance as any).hourly_distribution || []).map((hour: any) => (
                      <div key={hour.hour} className="flex items-center gap-3">
                        <span className="text-sm w-8">{hour.hour}h</span>
                        <div className="flex-1">
                          <Progress value={(hour.revenue / (salesPerformance as any).total_sales) * 100} className="h-2" />
                        </div>
                        <span className="text-sm w-16 text-right">{formatCurrency(hour.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {!selectedLocation && locations && locations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ubicaciones configuradas</h3>
            <p className="text-gray-600">Configura al menos una ubicación para ver el dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}