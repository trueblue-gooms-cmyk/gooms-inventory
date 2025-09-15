// Componente de estado de sincronización offline
// Compatible con Lovable - Indica el estado de conexión y sincronización
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Database,
  Loader2
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

interface OfflineSyncStatusProps {
  variant?: 'minimal' | 'detailed' | 'floating';
  className?: string;
}

export const OfflineSyncStatus = ({ 
  variant = 'minimal', 
  className = '' 
}: OfflineSyncStatusProps) => {
  const {
    isOnline,
    isSyncing,
    hasPendingActions,
    pendingCount,
    lastSync,
    syncProgress,
    timeSinceLastSync,
    syncNow,
    preloadData,
    canSync,
    needsSync,
    isFullyOffline
  } = useOfflineSync();

  // 🎨 VARIANTE MÍNIMAL
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isOnline ? (
          <div className="flex items-center gap-1 text-green-600">
            <Wifi className="h-4 w-4" />
            {isSyncing && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-600">
            <WifiOff className="h-4 w-4" />
            {hasPendingActions && (
              <Badge variant="destructive" className="text-xs">
                {pendingCount}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  // 🎈 VARIANTE FLOTANTE
  if (variant === 'floating') {
    if (!hasPendingActions && isOnline) return null;

    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Card className="p-3 shadow-lg border-l-4 border-l-blue-500 bg-white/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {!isOnline ? (
              <WifiOff className="h-5 w-5 text-red-500" />
            ) : (
              <Wifi className="h-5 w-5 text-green-500" />
            )}
            
            <div className="flex-1 min-w-0">
              {isFullyOffline ? (
                <div>
                  <p className="text-sm font-medium text-red-700">
                    Sin conexión
                  </p>
                  <p className="text-xs text-red-600">
                    {pendingCount} acciones pendientes
                  </p>
                </div>
              ) : needsSync ? (
                <div>
                  <p className="text-sm font-medium text-orange-700">
                    Sincronización pendiente
                  </p>
                  <p className="text-xs text-orange-600">
                    {pendingCount} acciones por sincronizar
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Sincronizado
                  </p>
                  <p className="text-xs text-green-600">
                    Datos actualizados
                  </p>
                </div>
              )}
            </div>

            {canSync && hasPendingActions && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={syncNow}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>

          {isSyncing && (
            <Progress value={syncProgress} className="mt-2 h-1" />
          )}
        </Card>
      </div>
    );
  }

  // 📋 VARIANTE DETALLADA
  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Estado de conexión */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700">Conectado</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-700">Sin conexión</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasPendingActions && (
              <Badge variant={isOnline ? "default" : "destructive"}>
                {pendingCount} pendientes
              </Badge>
            )}
            
            {!hasPendingActions && isOnline && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Sincronizado
              </Badge>
            )}
          </div>
        </div>

        {/* Progreso de sincronización */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sincronizando...</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        {/* Información de última sincronización */}
        {lastSync && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>
              Última sincronización: {
                timeSinceLastSync !== null
                  ? timeSinceLastSync < 1 
                    ? 'hace menos de 1 minuto'
                    : `hace ${timeSinceLastSync} minutos`
                  : 'nunca'
              }
            </span>
          </div>
        )}

        {/* Alertas y estado especial */}
        {isFullyOffline && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-800">Modo offline activo</p>
              <p className="text-red-600">
                Tienes {pendingCount} acciones que se sincronizarán automáticamente 
                cuando recuperes la conexión.
              </p>
            </div>
          </div>
        )}

        {needsSync && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800">Sincronización pendiente</p>
              <p className="text-orange-600">
                Hay {pendingCount} acciones esperando sincronización.
              </p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={syncNow}
            disabled={!canSync || !hasPendingActions}
            className="flex-1"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Sincronizar ahora
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={preloadData}
            disabled={!isOnline}
          >
            <Database className="h-3 w-3 mr-2" />
            Actualizar datos
          </Button>
        </div>
      </div>
    </Card>
  );
};