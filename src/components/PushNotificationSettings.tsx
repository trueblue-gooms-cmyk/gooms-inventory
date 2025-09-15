// Componente de configuración de notificaciones push
// Compatible con Lovable - Gestión completa de notificaciones PWA
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellOff, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  TestTube,
  Info,
  Settings,
  Shield
} from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface PushNotificationSettingsProps {
  variant?: 'card' | 'inline';
  showAdvanced?: boolean;
  className?: string;
}

export const PushNotificationSettings = ({ 
  variant = 'card', 
  showAdvanced = false, 
  className = '' 
}: PushNotificationSettingsProps) => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    canRequest,
    canSubscribe,
    canUnsubscribe,
    isBlocked,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSubscription,
    sendTestNotification
  } = usePushNotifications();

  // 📱 RENDERIZADO INLINE
  if (variant === 'inline') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Estado actual */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-green-600" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            <Label htmlFor="push-notifications" className="font-medium">
              Notificaciones Push
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Switch
                id="push-notifications"
                checked={isSubscribed}
                onCheckedChange={toggleSubscription}
                disabled={!isSupported || isBlocked}
              />
            )}
          </div>
        </div>

        {/* Estado y acciones */}
        {!isSupported && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Tu navegador no soporta notificaciones push.
            </AlertDescription>
          </Alert>
        )}

        {isBlocked && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Las notificaciones están bloqueadas. Habilítalas desde la configuración del navegador.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // 🃏 RENDERIZADO COMO CARD
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificaciones Push
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Estado actual */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-medium">Estado de las notificaciones</p>
            <div className="flex items-center gap-2">
              {isSubscribed ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Activas
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <BellOff className="h-3 w-3 mr-1" />
                  Inactivas
                </Badge>
              )}
              
              {permission === 'granted' && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Permisos concedidos
                </Badge>
              )}
              
              {permission === 'denied' && (
                <Badge variant="destructive">
                  Permisos denegados
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Información del navegador */}
        {!isSupported && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>No compatible:</strong> Tu navegador no soporta notificaciones push.
              Considera actualizar tu navegador para acceder a esta funcionalidad.
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Notificaciones bloqueadas */}
        {isBlocked && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Notificaciones bloqueadas:</strong> Habilítalas desde la configuración 
              del navegador (ícono de candado en la barra de direcciones).
            </AlertDescription>
          </Alert>
        )}

        {/* Información sobre notificaciones */}
        {showAdvanced && isSupported && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>¿Qué incluyen las notificaciones?</strong>
              <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
                <li>Alertas de productos con stock bajo</li>
                <li>Productos próximos a vencer</li>
                <li>Recepciones pendientes de procesar</li>
                <li>Actualizaciones importantes del sistema</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Acciones */}
        <div className="flex gap-2 flex-wrap">
          {canRequest && (
            <Button 
              onClick={requestPermission}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Solicitar permisos
            </Button>
          )}

          {canSubscribe && (
            <Button 
              onClick={subscribe}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Activar notificaciones
            </Button>
          )}

          {canUnsubscribe && (
            <Button 
              variant="outline"
              onClick={unsubscribe}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4 mr-2" />
              )}
              Desactivar
            </Button>
          )}

          {isSubscribed && (
            <Button 
              variant="ghost"
              size="sm"
              onClick={sendTestNotification}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Prueba
            </Button>
          )}
        </div>

        {/* Configuración avanzada */}
        {showAdvanced && isSubscribed && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium text-sm">Configuración avanzada</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <Label htmlFor="stock-alerts">Alertas de stock bajo</Label>
                <Switch id="stock-alerts" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="expiry-alerts">Alertas de vencimiento</Label>
                <Switch id="expiry-alerts" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="reception-alerts">Recepciones pendientes</Label>
                <Switch id="reception-alerts" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="system-alerts">Actualizaciones del sistema</Label>
                <Switch id="system-alerts" defaultChecked />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};