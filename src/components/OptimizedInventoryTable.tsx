import React, { useState } from 'react';
import { useInventoryPaginated } from '@/hooks/useOptimizedQueries';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  Factory, 
  Box, 
  ShoppingCart,
  MapPin,
  RefreshCw
} from 'lucide-react';

const CATEGORIES = {
  materia_prima: { label: 'Materia Prima', color: 'bg-blue-500', icon: Factory },
  empaques: { label: 'Empaques', color: 'bg-green-500', icon: Package },
  gomas_granel: { label: 'Gomas al Granel', color: 'bg-purple-500', icon: Box },
  producto_final: { label: 'Producto Final', color: 'bg-orange-500', icon: ShoppingCart }
};

interface OptimizedInventoryTableProps {
  searchQuery: string;
  selectedLocation: string;
  selectedCategory: string;
}

export const OptimizedInventoryTable: React.FC<OptimizedInventoryTableProps> = ({
  searchQuery,
  selectedLocation,
  selectedCategory
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  
  const { 
    data: inventoryData, 
    isLoading, 
    error,
    refetch 
  } = useInventoryPaginated(currentPage, pageSize);
  
  const { isConnected } = useRealtimeNotifications();

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity <= minStock * 0.5) return 'critical';
    if (quantity <= minStock) return 'low';
    return 'optimal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-100 text-green-700';
      case 'low': return 'bg-yellow-100 text-yellow-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'optimal': return 'Óptimo';
      case 'low': return 'Bajo';
      case 'critical': return 'Crítico';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Filter data based on search and filters
  const filteredData = inventoryData?.data.filter(item => {
    const product = item.products;
    if (!product) return false;

    const matchesLocation = selectedLocation === 'all' || 
      item.locations?.name === selectedLocation;
    const matchesCategory = selectedCategory === 'all' || 
      product.type === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesLocation && matchesCategory && matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-red-600">
          <p>Error al cargar inventario: {error.message}</p>
          <button 
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with real-time status */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Inventario ({filteredData.length} items)
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Tiempo real activo' : 'Sin conexión'}
          </span>
          <button 
            onClick={() => refetch()}
            className="p-1 hover:bg-gray-200 rounded"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ubicación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No se encontraron items
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const product = item.products;
                const location = item.locations;
                if (!product) return null;

                const quantity = item.quantity_available || 0;
                const minStock = product.min_stock_units || 0;
                const unitCost = product.unit_cost || 0;
                const totalValue = quantity * unitCost;
                const status = getStockStatus(quantity, minStock);
                
                const CategoryIcon = CATEGORIES[product.type as keyof typeof CATEGORIES]?.icon || Package;
                const categoryConfig = CATEGORIES[product.type as keyof typeof CATEGORIES] || {
                  label: product.type,
                  color: 'bg-gray-500'
                };

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 ${categoryConfig.color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                          <CategoryIcon className="w-4 h-4 text-gray-700" />
                        </div>
                        <span className="text-sm text-gray-700">{categoryConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{location?.name || 'Sin ubicación'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {quantity.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Mín: {minStock}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(totalValue)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(unitCost)}/ud
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {inventoryData && inventoryData.totalPages > 1 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Página {currentPage} de {inventoryData.totalPages} 
            ({inventoryData.totalCount} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(inventoryData.totalPages, currentPage + 1))}
              disabled={currentPage === inventoryData.totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};