import React from 'react';
import { Package, AlertTriangle, RefreshCw, Settings } from 'lucide-react';

interface InventoryFallbackProps {
  error?: Error | null;
  retry?: () => void;
}

export const InventoryFallback: React.FC<InventoryFallbackProps> = ({ error, retry }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario Multi-Ubicación</h1>
          <p className="text-gray-600 mt-1">Gestión integral de inventario por ubicación y categoría</p>
        </div>
      </div>

      {/* Error State */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error al cargar el inventario
          </h2>

          <p className="text-gray-600 mb-6">
            No se pudieron cargar los datos del inventario. Esto puede deberse a:
          </p>

          <div className="text-left max-w-md mx-auto mb-6">
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                Problemas de conexión con la base de datos
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                Tablas de inventario no inicializadas
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                Permisos insuficientes
              </li>
            </ul>
          </div>

          {/* Error Details */}
          {error && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
              <p className="text-sm font-mono text-gray-700 break-words">
                {error.toString()}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {retry && (
              <button
                onClick={retry}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar página
            </button>

            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Package className="w-4 h-4" />
              Ir al Dashboard
            </button>
          </div>

          {/* Setup Suggestion */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">¿Primera vez usando el sistema?</h3>
            </div>
            <p className="text-sm text-blue-700">
              Es posible que necesites configurar las tablas de inventario inicial o contactar
              al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};