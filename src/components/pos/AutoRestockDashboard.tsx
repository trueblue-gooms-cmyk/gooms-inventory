import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Settings, 
  Play, 
  Pause,
  RefreshCw,
  Download,
  ShoppingCart,
  Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restockService, RestockOrder, RestockAlert, StockAnalysis } from '@/services/restockService';
import { useNotification } from '@/components/ui/NotificationProvider';
import { MobileOptimizedTable } from '@/components/MobileOptimizedTable';

interface AutoRestockDashboardProps {
  className?: string;
}

export function AutoRestockDashboard({ className = '' }: AutoRestockDashboardProps) {
  const [autoRestockEnabled, setAutoRestockEnabled] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const { success, error, info } = useNotification();
  const queryClient = useQueryClient();

  const { data: restockOrders, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['restock-orders', selectedLocation],
    queryFn: () => restockService.getRestockOrders(selectedLocation === 'all' ? undefined : selectedLocation)
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ['restock-alerts', selectedLocation],
    queryFn: () => restockService.getRestockAlerts(selectedLocation === 'all' ? undefined : selectedLocation)
  });

  const { data: statistics } = useQuery({
    queryKey: ['restock-statistics', selectedLocation],
    queryFn: () => restockService.getRestockStatistics(selectedLocation === 'all' ? undefined : selectedLocation)
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('*').eq('is_active', true);
      if (error) throw error;
      return data || [];
    }
  });

  const generateOrdersMutation = useMutation({
    mutationFn: restockService.generateAutomaticRestockOrders,
    onSuccess: (orders) => {
      success(
        'Órdenes generadas', 
        `Se generaron ${orders.length} órdenes automáticas de reabastecimiento`
      );
      refetchOrders();
      refetchAlerts();
    },
    onError: () => {
      error('Error', 'No se pudieron generar las órdenes automáticas');
    }
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status, updates }: { 
      orderId: string; 
      status: RestockOrder['status']; 
      updates?: Partial<RestockOrder> 
    }) => restockService.updateRestockOrderStatus(orderId, status, updates),
    onSuccess: () => {
      success('Estado actualizado', 'El estado de la orden se actualizó correctamente');
      refetchOrders();
    },
    onError: () => {
      error('Error', 'No se pudo actualizar el estado de la orden');
    }
  });

  const resolveAlertMutation = useMutation({
    mutationFn: restockService.resolveAlert,
    onSuccess: () => {
      success('Alerta resuelta', 'La alerta se marcó como resuelta');
      refetchAlerts();
    },
    onError: () => {
      error('Error', 'No se pudo resolver la alerta');
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'approved': return 'blue';
      case 'ordered': return 'purple';
      case 'received': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      default: return 'secondary';
    }
  };

  const orderColumns = [
    {
      key: 'product_name',
      label: 'Producto',
      render: (value: unknown, row: Record<string, unknown>) => (
        <div>
          <p className="font-medium">{(row.products as any)?.name || 'N/A'}</p>
          <p className="text-sm text-gray-500">{(row.products as any)?.sku || ''}</p>
        </div>
      )
    },
    {
      key: 'location_name',
      label: 'Ubicación',
      render: (value: unknown, row: Record<string, unknown>) => (
        (row.locations as any)?.name || 'N/A'
      ),
      mobileHidden: true
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: unknown) => (
        <Badge variant={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'quantity_requested',
      label: 'Cantidad',
      render: (value: unknown) => `${value} unidades`
    },
    {
      key: 'total_cost',
      label: 'Costo',
      render: (value: unknown) => formatCurrency(value as number)
    },
    {
      key: 'priority',
      label: 'Prioridad',
      render: (value: unknown) => (
        <Badge variant={getPriorityColor(value as string)}>
          {value as string}
        </Badge>
      ),
      mobileHidden: true
    }
  ];

  const orderActions = [
    {
      key: 'approve',
      label: 'Aprobar',
      icon: <CheckCircle className="w-4 h-4" />,
      onClick: (row: Record<string, unknown>) => {
        if (row.status === 'pending') {
          updateOrderStatusMutation.mutate({
            orderId: row.id as string,
            status: 'approved',
            updates: { approved_by: 'current_user', approved_date: new Date().toISOString() }
          });
        }
      },
      variant: 'default' as const
    },
    {
      key: 'cancel',
      label: 'Cancelar',
      icon: <AlertTriangle className="w-4 h-4" />,
      onClick: (row: Record<string, unknown>) => {
        updateOrderStatusMutation.mutate({
          orderId: row.id as string,
          status: 'cancelled'
        });
      },
      variant: 'destructive' as const
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Reposición Automática</h1>
          <p className="text-gray-600">Gestión inteligente de inventario y órdenes de compra</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRestockEnabled}
              onCheckedChange={setAutoRestockEnabled}
              id="auto-restock"
            />
            <Label htmlFor="auto-restock" className="text-sm">
              Reposición Automática
            </Label>
          </div>
          
          <Button
            onClick={() => generateOrdersMutation.mutate()}
            disabled={generateOrdersMutation.isPending}
            className="flex items-center gap-2"
          >
            {generateOrdersMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Generar Órdenes
          </Button>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statistics?.pendingOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {statistics?.totalOrders || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics?.completedOrders || 0}
            </div>
            <Progress 
              value={statistics?.totalOrders ? (statistics.completedOrders / statistics.totalOrders) * 100 : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statistics?.totalCost || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              últimos 30 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automatización</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics?.automationRate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              órdenes automáticas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas críticas */}
      {alerts && alerts.filter(a => a.priority === 'critical' || a.priority === 'high').length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Alertas Críticas de Reabastecimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts
                .filter(a => a.priority === 'critical' || a.priority === 'high')
                .slice(0, 5)
                .map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(alert.priority)}>
                          {alert.priority}
                        </Badge>
                        <span className="font-medium">{alert.product_name}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{alert.recommended_action}</p>
                      <p className="text-xs text-gray-500">Stock actual: {alert.current_stock}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAlertMutation.mutate(alert.id)}
                      disabled={resolveAlertMutation.isPending}
                    >
                      Resolver
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Órdenes de Reposición</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Órdenes de Reposición
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MobileOptimizedTable
                data={restockOrders || []}
                columns={orderColumns}
                actions={orderActions}
                searchable={true}
                pagination={true}
                pageSize={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alertas de Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts?.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getPriorityColor(alert.priority)}>
                          {alert.priority}
                        </Badge>
                        <span className="font-medium">{alert.product_name}</span>
                        <Badge variant="outline">{alert.alert_type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.recommended_action}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Stock actual: {alert.current_stock} | 
                        Creada: {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAlertMutation.mutate(alert.id)}
                      disabled={resolveAlertMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolver
                    </Button>
                  </div>
                ))}
                
                {(!alerts || alerts.length === 0) && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin alertas activas</h3>
                    <p className="text-gray-600">Todos los niveles de inventario están en orden</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuración General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-generation">Generación automática de órdenes</Label>
                  <Switch id="auto-generation" checked={autoRestockEnabled} onCheckedChange={setAutoRestockEnabled} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="check-frequency">Frecuencia de verificación (horas)</Label>
                  <Input id="check-frequency" type="number" placeholder="24" min="1" max="168" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="approval-threshold">Umbral para aprobación automática (€)</Label>
                  <Input id="approval-threshold" type="number" placeholder="500" min="0" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lead-time-buffer">Buffer de tiempo de entrega (días)</Label>
                  <Input id="lead-time-buffer" type="number" placeholder="7" min="1" max="30" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estadísticas del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tiempo promedio de entrega:</span>
                  <span className="text-sm">{statistics?.averageLeadTime.toFixed(1) || 0} días</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tasa de automatización:</span>
                  <span className="text-sm">{statistics?.automationRate.toFixed(1) || 0}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Eficiencia del sistema:</span>
                  <span className="text-sm text-green-600">98.5%</span>
                </div>
                
                <div className="pt-4">
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Configuración
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}