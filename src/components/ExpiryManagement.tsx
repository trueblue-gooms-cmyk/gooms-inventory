// Componente principal para gestión completa de vencimientos
// Incluye dashboard, alertas, sugerencias y acciones automatizadas
import React, { useState } from 'react';
import { useInventoryRotation, ExpiryAlert, RotationSuggestion } from '@/hooks/useInventoryRotation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  DollarSign,
  ArrowRight,
  RefreshCw,
  Package,
  Calendar,
  MapPin,
  Target
} from 'lucide-react';

const ExpiryManagement = () => {
  const { data, isLoading, error, refresh, executeAction } = useInventoryRotation();
  const [selectedTab, setSelectedTab] = useState('alerts');
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando análisis de vencimientos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error: {error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const { alerts, suggestions, rotationMetrics } = data;

  // Función para obtener color de badge según nivel de alerta
  const getAlertVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'secondary';
    }
  };

  // Función para obtener icono según tipo de acción
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'transfer': return <ArrowRight className="h-4 w-4" />;
      case 'discount': return <DollarSign className="h-4 w-4" />;
      case 'dispose': return <AlertTriangle className="h-4 w-4" />;
      case 'promote': return <Target className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  // Ejecutar acción con feedback visual
  const handleExecuteAction = async (suggestion: RotationSuggestion) => {
    try {
      setExecutingAction(suggestion.product_id);
      await executeAction(suggestion);
      await refresh();
    } catch (err) {
      console.error('Error executing action:', err);
    } finally {
      setExecutingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Vencimiento Próximo</p>
                <p className="text-2xl font-bold text-red-600">
                  {rotationMetrics.total_expiring_soon}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Valor en Riesgo</p>
                <p className="text-2xl font-bold text-yellow-600">
                  ${rotationMetrics.total_value_at_risk.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Rotación Promedio</p>
                <p className="text-2xl font-bold text-blue-600">
                  {rotationMetrics.avg_rotation_days} días
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Lenta Rotación</p>
                <p className="text-2xl font-bold text-orange-600">
                  {rotationMetrics.slow_moving_products}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes vistas */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="alerts">
              Alertas ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              Sugerencias ({suggestions.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              Análisis
            </TabsTrigger>
          </TabsList>

          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Tab de Alertas */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Vencimiento Activas</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay alertas de vencimiento activas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{alert.product_name}</h3>
                            <Badge variant={getAlertVariant(alert.alert_level)}>
                              {alert.alert_level === 'critical' ? 'Crítico' : 
                               alert.alert_level === 'warning' ? 'Advertencia' : 'Info'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {alert.location_name}
                            </div>
                            <div className="flex items-center">
                              <Package className="h-4 w-4 mr-1" />
                              {alert.current_quantity} unidades
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              Vence en {alert.days_until_expiry} días
                            </div>
                          </div>
                          {alert.batch_number && (
                            <p className="text-sm text-gray-500">
                              Lote: {alert.batch_number}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Vencimiento</p>
                          <p className="font-medium">
                            {new Date(alert.expiry_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Progreso visual de tiempo restante */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Tiempo restante</span>
                          <span>{alert.days_until_expiry} días</span>
                        </div>
                        <Progress 
                          value={Math.max(0, Math.min(100, (30 - alert.days_until_expiry) / 30 * 100))} 
                          className="h-2"
                        />
                      </div>

                      {/* Acciones sugeridas */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Acciones recomendadas:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {alert.suggested_actions.map((action, index) => (
                            <li key={index} className="flex items-start">
                              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Sugerencias */}
        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle>Sugerencias de Rotación Inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay sugerencias de rotación disponibles</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.product_id}-${index}`}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{suggestion.product_name}</h3>
                            <Badge 
                              variant={suggestion.priority === 'high' ? 'destructive' : 
                                     suggestion.priority === 'medium' ? 'secondary' : 'outline'}
                            >
                              {suggestion.priority === 'high' ? 'Alta' : 
                               suggestion.priority === 'medium' ? 'Media' : 'Baja'} prioridad
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {suggestion.location_name}
                            </div>
                            <div className="flex items-center">
                              <Package className="h-4 w-4 mr-1" />
                              {suggestion.quantity} unidades
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              Impacto: ${suggestion.financial_impact.toFixed(2)}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{suggestion.reason}</p>
                        </div>
                        
                        <Button
                          onClick={() => handleExecuteAction(suggestion)}
                          disabled={executingAction === suggestion.product_id}
                          size="sm"
                          variant="outline"
                        >
                          {executingAction === suggestion.product_id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              {getActionIcon(suggestion.action)}
                              <span className="ml-2 capitalize">
                                {suggestion.action === 'transfer' ? 'Transferir' :
                                 suggestion.action === 'discount' ? 'Descuento' :
                                 suggestion.action === 'dispose' ? 'Disponer' :
                                 suggestion.action === 'promote' ? 'Promoción' : suggestion.action}
                              </span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Análisis */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['critical', 'warning', 'info'].map((level) => {
                    const count = alerts.filter(a => a.alert_level === level).length;
                    const percentage = alerts.length > 0 ? (count / alerts.length * 100) : 0;
                    
                    return (
                      <div key={level} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">
                            {level === 'critical' ? 'Críticas' : 
                             level === 'warning' ? 'Advertencias' : 'Informativas'}
                          </span>
                          <span>{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress 
                          value={percentage} 
                          className="h-2"
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eficiencia de Rotación</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Productos con rotación rápida (&lt;30 días)</span>
                    <Badge variant="outline">
                      {alerts.filter(a => a.days_until_expiry > 30).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                    <span>Productos con rotación media (30-60 días)</span>
                    <Badge variant="secondary">
                      {alerts.filter(a => a.days_until_expiry >= 15 && a.days_until_expiry <= 30).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span>Productos con rotación lenta (&lt;15 días)</span>
                    <Badge variant="destructive">
                      {alerts.filter(a => a.days_until_expiry < 15).length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpiryManagement;