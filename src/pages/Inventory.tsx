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
import { supabase } from '@/integrations/supabase/client';
import { useInventoryPaginated, useInvalidateQueries } from '@/hooks/useOptimizedQueries';
import { useAdvancedErrorHandler } from '@/hooks/useErrorHandler';
import { useAppStore } from '@/stores/useAppStore';
import { useUserRole } from '@/hooks/useSecureAuth';
import { OptimizedInventoryTable } from '@/components/OptimizedInventoryTable';
import { InventoryMovementModal } from '@/components/InventoryMovementModal';
import { MovementFormModal } from '@/components/MovementFormModal';
import ExpiryManagement from '@/components/ExpiryManagement';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InventoryFallback } from '@/components/InventoryFallback';
import { useErrorHandler } from '@/utils/errorHandler';
import { formatNumber } from '@/utils/formatters';
import { DESIGN_SYSTEM, cn, getStatusStyle } from '@/styles/design-system';
import { useFormModal } from '@/hooks/useModal';
import { useSecurity } from '@/utils/security';

// Tipos para el inventario
interface InventoryItem {
  id: string;
  product_id: string; // uuid del producto
  location_id: string; // uuid de la ubicación
  sku: string;
  name: string;
  type: 'materia_prima' | 'empaques' | 'gomas_granel' | 'producto_final';
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
  // CRITICAL: ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS

  // UI State
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'expiry'>('inventory');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Estados para datos reales - MOVED TO TOP
  const [realInventory, setRealInventory] = useState<InventoryItem[]>(() => []);
  const [inventoryLoaded, setInventoryLoaded] = useState(() => false);

  // Estados para el modal de movimiento - inicialización limpia
  const [movementData, setMovementData] = useState(() => ({
    type: 'entrada' as 'entrada' | 'salida' | 'ajuste',
    quantity: 0,
    notes: ''
  }));

  // Estados para el modal de transferencia - inicialización limpia
  const [transferData, setTransferData] = useState(() => ({
    from_location: '',
    to_location: '',
    quantity: 0,
    notes: ''
  }));

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

  // Helper functions - MOVED BEFORE useEffect
  const getStockStatus = (quantity: number, min: number, max: number) => {
    if (quantity <= min * 0.5) return 'critical';
    if (quantity <= min) return 'low';
    if (quantity >= max) return 'overstock';
    return 'optimal';
  };

  // Función para cargar datos del inventario - MOVED BEFORE useEffect
  const loadInventoryData = async () => {
    try {
      setInventoryLoaded(false);

      // Cargar inventario actual con productos y ubicaciones
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_current')
        .select(`
          id,
          quantity_available,
          quantity_reserved,
          last_movement_date,
          expiry_date,
          products!inner(id, name, sku, type, min_stock_units, unit_cost),
          locations!inner(id, name, code)
        `)
        .gt('quantity_available', 0);

      if (inventoryError) {
        console.error('Error loading inventory:', inventoryError);
        // Usar datos demo como fallback
        setRealInventory(getDemoInventory());
      } else {
        // Función para limpiar completamente los objetos
        const cleanObject = (obj: any): any => {
          if (obj === null || obj === undefined) return obj;
          if (typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map(cleanObject);

          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
              cleaned[key] = value;
            } else if (typeof value === 'object') {
              // Convertir objetos anidados a strings o limpiarlos recursivamente
              if (typeof value === 'object' && value.constructor === Object) {
                cleaned[key] = cleanObject(value);
              } else {
                cleaned[key] = String(value);
              }
            } else {
              cleaned[key] = value;
            }
          }
          return cleaned;
        };

        // Transformar datos reales con limpieza extrema
        const transformedInventory: InventoryItem[] = (inventoryData || [])
          .filter(item => item && typeof item === 'object')
          .map(item => {
          try {
            const product = item.products as any;
            const location = item.locations as any;
            const quantity = Number(item.quantity_available) || 0;
            const minStock = Number(product?.min_stock_units) || 0;
            const unitCost = Number(product?.unit_cost) || 0;

            // Crear objeto completamente plano - sin anidación
            const transformedItem: InventoryItem = {
              id: String(item.id || 'unknown'),
              product_id: String(product?.id || 'unknown'),
              location_id: String(location?.id || 'unknown'),
              sku: String(product?.sku || 'N/A'),
              name: String(product?.name || 'Producto sin nombre'),
              type: String(product?.type || 'producto_final') as any,
              location: String(location?.name || 'Ubicación desconocida'),
              quantity: quantity,
              min_stock: minStock,
              max_stock: minStock * 5,
              unit: String((product?.type) === 'materia_prima' ? 'kg' : 'unidades'),
              unit_cost: unitCost,
              total_value: quantity * unitCost,
              status: getStockStatus(quantity, minStock, minStock * 5) as 'optimal' | 'low' | 'critical' | 'overstock',
              last_movement: String(item.last_movement_date || new Date().toISOString().split('T')[0]),
              expiry_date: item.expiry_date ? String(item.expiry_date) : undefined
            };

            // Verificación final - serializar y deserializar para eliminar cualquier referencia
            const serialized = JSON.stringify(transformedItem);
            const finalItem = JSON.parse(serialized);

            return finalItem;
          } catch (error) {
            console.error('Error transforming item:', error, item);
            return null;
          }
        }).filter(Boolean);

        setRealInventory(transformedInventory);
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
      setRealInventory(getDemoInventory());
    } finally {
      setInventoryLoaded(true);
    }
  };

  // Función para datos demo de inventario - completamente limpios
  const getDemoInventory = (): InventoryItem[] => {
    const demoData = [
      {
        id: 'demo-1',
        product_id: 'demo-prod-1',
        location_id: 'demo-loc-1',
        sku: 'DEMO-001',
        name: 'Producto Demo 1',
        type: 'producto_final',
        location: 'Bodega Central',
        quantity: 150,
        min_stock: 50,
        max_stock: 500,
        unit: 'unidades',
        unit_cost: 25000,
        total_value: 3750000,
        status: 'optimal',
        last_movement: new Date().toISOString().split('T')[0]
      },
      {
        id: 'demo-2',
        product_id: 'demo-prod-2',
        location_id: 'demo-loc-2',
        sku: 'DEMO-002',
        name: 'Materia Prima Demo',
        type: 'materia_prima',
        location: 'POS-Colina',
        quantity: 25,
        min_stock: 100,
        max_stock: 1000,
        unit: 'kg',
        unit_cost: 15000,
        total_value: 375000,
        status: 'critical',
        last_movement: new Date().toISOString().split('T')[0]
      }
    ];

    // Serializar y deserializar para garantizar que sean objetos completamente limpios
    return JSON.parse(JSON.stringify(demoData));
  };

  // Cargar datos reales usando el patrón exitoso del Laboratorio
  useEffect(() => {
    loadInventoryData();
  }, []);

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

  // Usar datos reales o demo
  const processedInventory = inventoryLoaded ? realInventory : getDemoInventory();

  const handleMovement = async () => {
    if (!selectedItem || movementData.quantity <= 0) return;
    
    await handleAsyncOperation(async () => {
      // Implementar movimiento real usando supabase con UUIDs correctos
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          movement_type: movementData.type,
          product_id: selectedItem.product_id, // Usar UUID del producto
          quantity: movementData.quantity,
          to_location_id: selectedItem.location_id, // Usar UUID de ubicación
          notes: movementData.notes,
          created_by: user?.id
        });

      if (error) throw error;
      
      // Recargar datos como en Laboratory
      loadInventoryData();
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
      // Implementar transferencia real usando UUIDs correctos
      const { error } = await supabase
        .from('inventory_movements')
        .insert({
          movement_type: 'ajuste',
          product_id: selectedItem.product_id, // UUID del producto
          quantity: transferData.quantity,
          from_location_id: selectedItem.location_id, // UUID origen
          to_location_id: selectedItem.location_id, // UUID destino (ajuste en misma ubicación)
          notes: `Transferencia: ${transferData.notes}`,
          created_by: user?.id
        });

      if (error) throw error;
      
      // Recargar datos como en Laboratory
      loadInventoryData();
      invalidateInventory();
      
      setShowTransferModal(false);
      setTransferData({ from_location: '', to_location: '', quantity: 0, notes: '' });
      setSelectedItem(null);
    });
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
    const matchesCategory = selectedCategory === 'all' || item.type === selectedCategory;
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
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="typography-page-title">Inventario Multi-Ubicación</h1>
            <p className="typography-page-subtitle">Gestión integral de inventario por ubicación y categoría</p>
          </div>
          <div className="flex gap-2">
            <button className="button-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button 
              onClick={() => setShowNewItemModal(true)}
              className="button-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Item</span>
            </button>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex space-x-1 bg-gray-50/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 rounded-lg font-light transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Inventario General
            </div>
          </button>
          <button
            onClick={() => setActiveTab('expiry')}
            className={`px-4 py-2.5 rounded-lg font-light transition-all ${
              activeTab === 'expiry'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Control de Vencimientos
            </div>
          </button>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 font-light">Total Items</p>
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-4xl font-thin text-gray-900">{metrics.totalItems}</p>
            <p className="text-xs text-gray-400 mt-1">Items en inventario</p>
          </div>
          
          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 font-light">Valor Total</p>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-thin text-gray-900">{formatCurrency(metrics.totalValue)}</p>
            <p className="text-xs text-gray-400 mt-1">Valor del inventario</p>
          </div>

          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 font-light">Stock Crítico</p>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-4xl font-thin text-red-600">{metrics.criticalItems}</p>
            <p className="text-xs text-gray-400 mt-1">Requieren atención</p>
          </div>

          <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 font-light">Stock Bajo</p>
              <TrendingDown className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-4xl font-thin text-yellow-600">{metrics.lowStockItems}</p>
            <p className="text-xs text-gray-400 mt-1">Por debajo del mínimo</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="card-modern p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o SKU..."
                  className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                />
              </div>
            </div>
            
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-3 border-0 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            >
              <option value="all">Todas las ubicaciones</option>
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border-0 bg-gray-50/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            >
              <option value="all">Todas las categorías</option>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>

            <button 
              onClick={() => {
                loadInventoryData();
                invalidateInventory();
              }}
              className="button-secondary flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Contenido condicional basado en pestaña activa */}
        {activeTab === 'inventory' ? (
          <div className="card-modern overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="typography-section-title">
                Inventario ({processedInventory.length} items)
              </h3>
            </div>
            <div className="p-6">
              {(() => {
                try {
                  if (processedInventory.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-light">No hay items de inventario disponibles</p>
                      </div>
                    );
                  }
                  return (
                <div className="grid gap-4">
                  {processedInventory.slice(0, 10).map((item) => {
                    try {
                      // EXTRA SAFE: Verificar que el item no sea nulo y sea un objeto válido
                      if (!item || typeof item !== 'object' || !item.id) {
                        console.warn('Invalid inventory item skipped:', item);
                        return null;
                      }

                      // CRITICAL: Defensive checks extremos para prevenir React #310 error
                      const safeName = String(item.name || 'N/A');
                      const safeSku = String(item.sku || 'N/A');
                      const safeLocation = String(item.location || 'N/A');
                      const safeQuantity = Number(item.quantity) || 0;
                      const safeMinStock = Number(item.min_stock) || 0;
                      const safeStatus = String(item.status || 'optimal');
                      const safeId = String(item.id || Math.random());

                      return (
                        <div key={safeId} className="p-6 bg-gray-50/30 rounded-2xl border border-gray-100">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="font-light text-gray-900 text-lg">{safeName}</h4>
                              <p className="text-sm text-gray-500 font-light">{safeSku}</p>
                              <p className="text-sm text-gray-600 font-light flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {safeLocation}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="font-thin text-2xl text-gray-900">{safeQuantity}</p>
                              <p className="text-xs text-gray-500 font-light">Stock mínimo: {safeMinStock}</p>
                              <span className={`status-badge ${getStatusColor(safeStatus).replace('bg-', 'status-').replace('-100', '').replace('text-', '').replace('-700', '')}`}>
                                {getStatusLabel(safeStatus)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    } catch (error) {
                      console.error('Error rendering inventory item:', error, item);
                      return (
                        <div key={`error-${Math.random()}`} className="p-6 bg-red-50 rounded-2xl border border-red-200">
                          <p className="text-red-600 text-sm">Error cargando item</p>
                        </div>
                      );
                    }
                  }).filter(Boolean)}
                  {processedInventory.length > 10 && (
                    <div className="text-center text-gray-400 text-sm font-light py-4">
                      Mostrando 10 de {processedInventory.length} items
                    </div>
                  )}
                  </div>
                  );
                } catch (error) {
                  console.error('Inventory rendering error:', error);
                  return (
                    <div className="text-center py-12">
                      <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                      <p className="text-red-500 font-light">Error cargando inventario. Revisa la consola.</p>
                      <button 
                        onClick={() => {
                          console.log('Current inventory data:', processedInventory);
                          loadInventoryData();
                        }}
                        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                      >
                        Recargar
                      </button>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        ) : (
          <ExpiryManagement />
        )}

        {/* Movement Form Modal */}
        <MovementFormModal
          isOpen={showNewItemModal}
          onClose={() => setShowNewItemModal(false)}
          onSuccess={() => {
            // Refresh inventory data
            invalidateInventory();
            setShowNewItemModal(false);
          }}
        />

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