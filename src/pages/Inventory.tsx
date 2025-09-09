// src/pages/Inventory.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, 
  MapPin, 
  AlertTriangle, 
  TrendingDown,
  TrendingUp,
  Eye,
  Calendar,
  Filter
} from 'lucide-react';

interface InventoryItem {
  id: string;
  product_id: string;
  location_id: string;
  batch_id: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_in_transit: number;
  expiry_date: string;
  last_movement_date: string;
  products?: {
    sku: string;
    name: string;
    min_stock_units: number;
    safety_stock_units: number;
  };
  locations?: {
    name: string;
    type: string;
  };
  production_batches?: {
    batch_number: string;
  };
}

interface Location {
  id: string;
  name: string;
  type: string;
}

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inventoryRes, locationsRes] = await Promise.all([
        supabase
          .from('inventory_current')
          .select(`
            *,
            products (sku, name, min_stock_units, safety_stock_units),
            locations (name, type),
            production_batches (batch_number)
          `)
          .order('products(name)'),
        supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ]);

      if (inventoryRes.error) throw inventoryRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setInventory(inventoryRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar inventario
  const filteredInventory = inventory.filter(item => {
    const matchesLocation = selectedLocation === 'all' || item.location_id === selectedLocation;
    const matchesSearch = item.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.products?.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const totalStock = item.quantity_available + item.quantity_reserved + item.quantity_in_transit;
    const isLowStock = totalStock < (item.products?.min_stock_units || 0);
    const matchesLowStock = !showLowStock || isLowStock;
    
    const daysUntilExpiry = item.expiry_date 
      ? Math.floor((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const isExpiringSoon = daysUntilExpiry <= 30;
    const matchesExpiring = !showExpiringSoon || isExpiringSoon;

    return matchesLocation && matchesSearch && matchesLowStock && matchesExpiring;
  });

  // Agrupar por producto
  const groupedInventory = filteredInventory.reduce((acc, item) => {
    const productId = item.product_id;
    if (!acc[productId]) {
      acc[productId] = {
        product: item.products,
        locations: [],
        totalAvailable: 0,
        totalReserved: 0,
        totalInTransit: 0,
        totalStock: 0
      };
    }
    
    acc[productId].locations.push(item);
    acc[productId].totalAvailable += item.quantity_available;
    acc[productId].totalReserved += item.quantity_reserved;
    acc[productId].totalInTransit += item.quantity_in_transit;
    acc[productId].totalStock += item.quantity_available + item.quantity_reserved + item.quantity_in_transit;
    
    return acc;
  }, {} as Record<string, any>);

  // Calcular métricas
  const metrics = {
    totalProducts: Object.keys(groupedInventory).length,
    lowStockItems: Object.values(groupedInventory).filter((group: any) => 
      group.totalStock < group.product?.min_stock_units
    ).length,
    expiringItems: filteredInventory.filter(item => {
      if (!item.expiry_date) return false;
      const days = Math.floor((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days <= 30 && days > 0;
    }).length,
    totalValue: 0 // Se calcularía con precios
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        <p className="text-gray-600 mt-1">Vista consolidada por ubicación</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Productos</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-red-600">{metrics.lowStockItems}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Por Vencer</p>
              <p className="text-2xl font-bold text-yellow-600">{metrics.expiringItems}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ubicaciones</p>
              <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Todas las ubicaciones</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.type})
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`px-4 py-2 rounded-lg border ${
              showLowStock 
                ? 'bg-red-50 border-red-300 text-red-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Stock Bajo
          </button>
          
          <button
            onClick={() => setShowExpiringSoon(!showExpiringSoon)}
            className={`px-4 py-2 rounded-lg border ${
              showExpiringSoon 
                ? 'bg-yellow-50 border-yellow-300 text-yellow-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Por Vencer
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponible</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reservado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">En Tránsito</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(groupedInventory).map(([productId, group]: [string, any]) => {
                const isLowStock = group.totalStock < group.product?.min_stock_units;
                const isCritical = group.totalStock < group.product?.safety_stock_units;
                
                return (
                  <tr key={productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{group.product?.name}</p>
                        <p className="text-xs text-gray-500">
                          {group.locations.length} ubicacion(es)
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{group.product?.sku}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">
                      {group.totalAvailable}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-yellow-600">
                      {group.totalReserved}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {group.totalInTransit}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${
                        isCritical ? 'text-red-600' : 
                        isLowStock ? 'text-yellow-600' : 
                        'text-gray-900'
                      }`}>
                        {group.totalStock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isCritical ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          Crítico
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1 w-fit">
                          <TrendingDown className="w-3 h-3" />
                          Bajo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                          <TrendingUp className="w-3 h-3" />
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-orange-600 hover:text-orange-700">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}