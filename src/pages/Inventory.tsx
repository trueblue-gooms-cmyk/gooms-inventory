import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  MapPin,
  Box,
  Factory,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useInventoryPaginated, useInvalidateQueries } from '@/hooks/useOptimizedQueries';
import { useAdvancedErrorHandler } from '@/hooks/useErrorHandler';
import { useAppStore } from '@/stores/useAppStore';
import { useUserRole } from '@/hooks/useSecureAuth';
import { OptimizedInventoryTable } from '@/components/OptimizedInventoryTable';
import { InventoryMovementModal } from '@/components/InventoryMovementModal';
import ExpiryManagement from '@/components/ExpiryManagement';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InventoryFallback } from '@/components/InventoryFallback';
import { useErrorHandler } from '@/utils/errorHandler';
import { formatNumber } from '@/utils/formatters';
import { useFormModal } from '@/hooks/useModal';
import { useSecurity } from '@/utils/security';

// Tipos para el inventario
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'materia_prima' | 'empaques' | 'gomas_granel' | 'producto_final';
  location: string;
  quantity: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  unit_cost: number;
  total_value: number;
  status: 'optimal' | 'low' | 'critical' | 'overstock';
  last_movement: string;
  expiry_date?: string;
}

interface Movement {
  id: string;
  date: string;
  type: 'entrada' | 'salida' | 'transferencia' | 'ajuste' | 'producción' | 'devolución';
  product: string;
  quantity: number;
  from_location?: string;
  to_location?: string;
  user: string;
  notes?: string;
}

interface ProductionNeed {
  id: string;
  product: string;
  required: number;
  available: number;
  missing: number;
  suggestions: string[];
}

const LOCATIONS = [
  'Bodega Central',
  'POS-Colina',
  'POS-Fontanar',
  'POS-Eventos'
];

const CATEGORIES = {
  materia_prima: { label: 'Materia Prima', color: 'bg-blue-500', icon: Factory },
  empaques: { label: 'Empaques', color: 'bg-green-500', icon: Package },
  gomas_granel: { label: 'Gomas al Granel', color: 'bg-purple-500', icon: Box },
  producto_final: { label: 'Producto Final', color: 'bg-orange-500', icon: ShoppingCart }
};

export function Inventory() {
  // UI State
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'expiry'>('inventory');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Auth and data hooks
  const { user, isLoading: authLoading } = useAppStore();
  const userRole = useUserRole();
  const { handleAsyncOperation, isLoading: operationLoading } = useAdvancedErrorHandler();
  const { invalidateInventory } = useInvalidateQueries();
  
  // Optimized inventory data with pagination
  const { 
    data: inventoryData, 
    isLoading: inventoryLoading, 
    error: inventoryError 
  } = useInventoryPaginated(1, 100); // Load first 100 items for metrics
  
  const isLoading = authLoading || inventoryLoading || operationLoading;

  // Estados para el modal de movimiento
  const [movementData, setMovementData] = useState({
    type: 'entrada' as 'entrada' | 'salida' | 'ajuste',
    quantity: 0,
    notes: ''
  });

  // Estados para el modal de transferencia
  const [transferData, setTransferData] = useState({
    from_location: '',
    to_location: '',
    quantity: 0,
    notes: ''
  });

  // Authentication guard - show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Debes iniciar sesión para acceder al inventario.</p>
      </div>
    );
  }

  // Show loading while role is being determined
  if (userRole === null) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Check permissions
  if (!['admin', 'operator'].includes(userRole)) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No tienes permisos para acceder al inventario.</p>
      </div>
    );
  }

  // Handle inventory error with fallback
  if (inventoryError) {
    return (
      <ErrorBoundary>
        <InventoryFallback
          error={inventoryError}
          retry={() => window.location.reload()}
        />
      </ErrorBoundary>
    );
  }

  // Process inventory data for metrics calculation with error handling
  const processedInventory = React.useMemo(() => {
    try {
      if (!inventoryData?.data || !Array.isArray(inventoryData.data)) return [];

      return inventoryData.data
        .filter(item => {
          return item &&
                 typeof item === 'object' &&
                 item.products &&
                 typeof item.products === 'object' &&
                 item.locations &&
                 typeof item.locations === 'object';
        })
        .map(item => {
          try {
            const product = item.products;
            const location = item.locations;

            const quantity = Number(item.quantity_available) || 0;
            const minStock = Number(product.min_stock_units) || 0;
            const unitCost = Number(product.unit_cost) || 0;
            const totalValue = quantity * unitCost;

            return {
              id: String(item.id || ''),
              sku: String(product.sku || 'N/A'),
              name: String(product.name || 'Producto sin nombre'),
              category: product.type as any,
              location: String(location.name || 'Ubicación desconocida'),
              quantity,
              min_stock: minStock,
              max_stock: Math.max(minStock * 5, 1000),
              unit: 'unidades',
              unit_cost: unitCost,
              total_value: totalValue,
              status: getStockStatus(quantity, minStock, Math.max(minStock * 5, 1000)),
              last_movement: item.last_movement_date ?
                new Date(item.last_movement_date).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0],
              expiry_date: item.expiry_date || undefined
            } as InventoryItem;
          } catch (itemError) {
            console.error('Error processing inventory item:', itemError, item);
            return null;
          }
        })
        .filter((item): item is InventoryItem => item !== null);
    } catch (error) {
      console.error('Error processing inventory data:', error);
      return [];
    }
  }, [inventoryData]);

  const handleMovement = async () => {
    if (!selectedItem || movementData.quantity <= 0) return;
    
    await handleAsyncOperation(async () => {
      // Here you would implement the actual movement logic
      console.log('Movimiento:', { item: selectedItem, ...movementData });
      
      // Invalidate cache to refetch fresh data
      invalidateInventory();
      
      setShowMovementModal(false);
      setMovementData({ type: 'entrada', quantity: 0, notes: '' });
      setSelectedItem(null);
    });
  };

  const handleTransfer = async () => {
    if (!selectedItem || transferData.quantity <= 0 || 
        !transferData.from_location || !transferData.to_location) return;
    
    await handleAsyncOperation(async () => {
      console.log('Transferencia:', { item: selectedItem, ...transferData });
      
      // Invalidate cache to refetch fresh data
      invalidateInventory();
      
      setShowTransferModal(false);
      setTransferData({ from_location: '', to_location: '', quantity: 0, notes: '' });
      setSelectedItem(null);
    });
  };

  const getStockStatus = (quantity: number, min: number, max: number) => {
    if (quantity <= min * 0.5) return 'critical';
    if (quantity <= min) return 'low';
    if (quantity >= max) return 'overstock';
    return 'optimal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-100 text-green-700';
      case 'low': return 'bg-yellow-100 text-yellow-700';
      case 'critical': return 'bg-red-100 text-red-700';
      case 'overstock': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'optimal': return 'Óptimo';
      case 'low': return 'Bajo';
      case 'critical': return 'Crítico';
      case 'overstock': return 'Sobrestock';
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

  // Filter processed inventory for metrics
  const filteredInventory = processedInventory.filter(item => {
    const matchesLocation = selectedLocation === 'all' || item.location === selectedLocation;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLocation && matchesCategory && matchesSearch;
  });

  // Calculate metrics from processed data
  const metrics = {
    totalItems: filteredInventory.length,
    totalValue: filteredInventory.reduce((sum, item) => sum + item.total_value, 0),
    criticalItems: filteredInventory.filter(item => item.status === 'critical').length,
    lowStockItems: filteredInventory.filter(item => item.status === 'low').length
  };

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario Multi-Ubicación</h1>
            <p className="text-gray-600 mt-1">Gestión integral de inventario por ubicación y categoría</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              <Plus className="w-4 h-4" />
              <span>Nuevo Item</span>
            </button>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === 'inventory'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Inventario General
            </div>
          </button>
          <button
            onClick={() => setActiveTab('expiry')}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === 'expiry'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Control de Vencimientos
            </div>
          </button>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalItems}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(metrics.totalValue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Crítico</p>
                <p className="text-2xl font-bold text-red-600">{metrics.criticalItems}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.lowStockItems}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todas las ubicaciones</option>
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todas las categorías</option>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>

            <button 
              onClick={() => invalidateInventory()}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Contenido condicional basado en pestaña activa */}
        {activeTab === 'inventory' ? (
          <OptimizedInventoryTable 
            searchQuery={searchQuery}
            selectedLocation={selectedLocation}
            selectedCategory={selectedCategory}
          />
        ) : (
          <ExpiryManagement />
        )}

        {/* Modal de movimiento */}
        {showMovementModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar Movimiento</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Producto</p>
                  <p className="font-medium text-gray-900">{selectedItem.name}</p>
                  <p className="text-xs text-gray-500">Stock actual: {selectedItem.quantity} {selectedItem.unit}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de movimiento
                  </label>
                  <select
                    value={movementData.type}
                    onChange={(e) => setMovementData({...movementData, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="ajuste">Ajuste</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={movementData.quantity}
                    onChange={(e) => setMovementData({...movementData, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={movementData.notes}
                    onChange={(e) => setMovementData({...movementData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowMovementModal(false);
                    setMovementData({ type: 'entrada', quantity: 0, notes: '' });
                    setSelectedItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMovement}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Registrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de transferencia */}
        {showTransferModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Transferir entre Ubicaciones</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Producto</p>
                  <p className="font-medium text-gray-900">{selectedItem.name}</p>
                  <p className="text-xs text-gray-500">Disponible: {selectedItem.quantity} {selectedItem.unit}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desde
                  </label>
                  <select
                    value={transferData.from_location}
                    onChange={(e) => setTransferData({...transferData, from_location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seleccionar ubicación</option>
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hacia
                  </label>
                  <select
                    value={transferData.to_location}
                    onChange={(e) => setTransferData({...transferData, to_location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seleccionar ubicación</option>
                    {LOCATIONS.filter(loc => loc !== transferData.from_location).map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad a transferir
                  </label>
                  <input
                    type="number"
                    value={transferData.quantity}
                    onChange={(e) => setTransferData({...transferData, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min="1"
                    max={selectedItem.quantity}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={transferData.notes}
                    onChange={(e) => setTransferData({...transferData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferData({ from_location: '', to_location: '', quantity: 0, notes: '' });
                    setSelectedItem(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTransfer}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Transferir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}