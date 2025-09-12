// src/pages/Inventory.tsx
// REEMPLAZAR TODO EL CONTENIDO DEL ARCHIVO Inventory.tsx CON ESTE CÓDIGO

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
  type: 'entrada' | 'salida' | 'transferencia' | 'ajuste';
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productionNeeds, setProductionNeeds] = useState<ProductionNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

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

  useEffect(() => {
    loadInventoryData();
  }, [selectedLocation, selectedCategory]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos de ejemplo
      setInventory([
        {
          id: '1',
          sku: 'MP-001',
          name: 'Azúcar refinada',
          category: 'materia_prima',
          location: 'Bodega Central',
          quantity: 500,
          min_stock: 100,
          max_stock: 1000,
          unit: 'kg',
          unit_cost: 2500,
          total_value: 1250000,
          status: 'optimal',
          last_movement: '2025-09-10',
          expiry_date: '2026-03-15'
        },
        {
          id: '2',
          sku: 'EMP-001',
          name: 'Bolsas 100g',
          category: 'empaques',
          location: 'Bodega Central',
          quantity: 50,
          min_stock: 200,
          max_stock: 1000,
          unit: 'unidades',
          unit_cost: 150,
          total_value: 7500,
          status: 'critical',
          last_movement: '2025-09-09'
        },
        {
          id: '3',
          sku: 'GG-001',
          name: 'Gomas Fresa 5kg',
          category: 'gomas_granel',
          location: 'POS-Colina',
          quantity: 25,
          min_stock: 10,
          max_stock: 50,
          unit: 'bolsas',
          unit_cost: 45000,
          total_value: 1125000,
          status: 'optimal',
          last_movement: '2025-09-08'
        },
        {
          id: '4',
          sku: 'PF-001',
          name: 'Gomas Surtidas 100g',
          category: 'producto_final',
          location: 'POS-Fontanar',
          quantity: 150,
          min_stock: 50,
          max_stock: 200,
          unit: 'unidades',
          unit_cost: 8500,
          total_value: 1275000,
          status: 'optimal',
          last_movement: '2025-09-10'
        },
        {
          id: '5',
          sku: 'MP-002',
          name: 'Gelatina sin sabor',
          category: 'materia_prima',
          location: 'Bodega Central',
          quantity: 15,
          min_stock: 50,
          max_stock: 200,
          unit: 'kg',
          unit_cost: 18000,
          total_value: 270000,
          status: 'low',
          last_movement: '2025-09-07',
          expiry_date: '2025-10-20'
        }
      ]);

      setMovements([
        {
          id: '1',
          date: '2025-09-10T10:30:00',
          type: 'entrada',
          product: 'Azúcar refinada',
          quantity: 200,
          to_location: 'Bodega Central',
          user: 'Sebastian Canal',
          notes: 'Recepción orden #OC-2025-045'
        },
        {
          id: '2',
          date: '2025-09-09T15:45:00',
          type: 'transferencia',
          product: 'Gomas Surtidas 100g',
          quantity: 50,
          from_location: 'Bodega Central',
          to_location: 'POS-Fontanar',
          user: 'Sebastian Alape',
          notes: 'Reabastecimiento punto de venta'
        }
      ]);

      setProductionNeeds([
        {
          id: '1',
          product: 'Gomas Surtidas 100g',
          required: 100,
          available: 150,
          missing: 0,
          suggestions: ['Stock óptimo disponible']
        },
        {
          id: '2',
          product: 'Bolsas 100g',
          required: 200,
          available: 50,
          missing: 150,
          suggestions: ['Ordenar 500 unidades (MOQ)', 'Lead time: 90 días', 'Proveedor: Empaques Colombia']
        },
        {
          id: '3',
          product: 'Gelatina sin sabor',
          required: 30,
          available: 15,
          missing: 15,
          suggestions: ['Ordenar 50kg (MOQ)', 'Stock crítico - ordenar urgente']
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setLoading(false);
    }
  };

  const handleMovement = async () => {
    if (!selectedItem || movementData.quantity <= 0) return;
    
    // Simular guardado
    console.log('Movimiento:', { item: selectedItem, ...movementData });
    
    // Actualizar inventario localmente
    setInventory(prev => prev.map(item => {
      if (item.id === selectedItem.id) {
        const newQuantity = movementData.type === 'entrada' 
          ? item.quantity + movementData.quantity
          : item.quantity - movementData.quantity;
        
        return {
          ...item,
          quantity: Math.max(0, newQuantity),
          status: getStockStatus(newQuantity, item.min_stock, item.max_stock),
          last_movement: new Date().toISOString().split('T')[0]
        };
      }
      return item;
    }));
    
    setShowMovementModal(false);
    setMovementData({ type: 'entrada', quantity: 0, notes: '' });
    setSelectedItem(null);
  };

  const handleTransfer = async () => {
    if (!selectedItem || transferData.quantity <= 0 || 
        !transferData.from_location || !transferData.to_location) return;
    
    console.log('Transferencia:', { item: selectedItem, ...transferData });
    
    // Aquí iría la lógica de transferencia
    
    setShowTransferModal(false);
    setTransferData({ from_location: '', to_location: '', quantity: 0, notes: '' });
    setSelectedItem(null);
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

  const filteredInventory = inventory.filter(item => {
    const matchesLocation = selectedLocation === 'all' || item.location === selectedLocation;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLocation && matchesCategory && matchesSearch;
  });

  // Cálculo de métricas
  const metrics = {
    totalItems: filteredInventory.length,
    totalValue: filteredInventory.reduce((sum, item) => sum + item.total_value, 0),
    criticalItems: filteredInventory.filter(item => item.status === 'critical').length,
    lowStockItems: filteredInventory.filter(item => item.status === 'low').length
  };

  return (
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
            onClick={loadInventoryData}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tabla de inventario */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron items
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const CategoryIcon = CATEGORIES[item.category].icon;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${CATEGORIES[item.category].color} bg-opacity-20 rounded-lg flex items-center justify-center`}>
                            <CategoryIcon className="w-4 h-4 text-gray-700" />
                          </div>
                          <span className="text-sm text-gray-700">{CATEGORIES[item.category].label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{item.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.quantity} {item.unit}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">Min: {item.min_stock}</span>
                            <span className="text-xs text-gray-500">Max: {item.max_stock}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(item.total_value)}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.unit_cost)}/u</p>
                      </td>
                      <td className="px-6 py-4">
                        {item.expiry_date ? (
                          <span className="text-sm text-gray-700">
                            {new Date(item.expiry_date).toLocaleDateString('es-CO')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowMovementModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Registrar movimiento"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setTransferData({ ...transferData, from_location: item.location });
                              setShowTransferModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Transferir"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900" title="Ver detalles">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección de necesidades de producción */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Análisis de Necesidades de Producción</h2>
        <div className="space-y-4">
          {productionNeeds.map((need) => (
            <div key={need.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{need.product}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm text-gray-600">
                      Requerido: <span className="font-medium">{need.required}</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Disponible: <span className="font-medium">{need.available}</span>
                    </span>
                    {need.missing > 0 && (
                      <span className="text-sm text-red-600">
                        Faltante: <span className="font-medium">{need.missing}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {need.missing === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {need.suggestions.length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  {need.suggestions.map((suggestion, idx) => (
                    <p key={idx} className="text-xs text-gray-600">• {suggestion}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

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
  );
}