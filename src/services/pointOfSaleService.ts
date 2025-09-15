// Servicio de gestión de puntos de venta
// Compatible con Lovable - Gestión completa de ubicaciones y métricas
import { supabase } from '../integrations/supabase/client';

export interface LocationMetrics {
  location_id: string;
  location_name: string;
  location_type: string;
  total_products: number;
  total_value: number;
  low_stock_items: number;
  expiring_items: number;
  movement_frequency: number;
  avg_rotation_days: number;
  performance_score: number;
  sales_velocity: number;
  restock_alerts: number;
}

export interface SalesPerformance {
  location_id: string;
  location_name: string;
  period: string;
  sales_count: number;
  sales_value: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  hourly_distribution: Array<{
    hour: number;
    sales_count: number;
    revenue: number;
  }>;
  growth_rate: number;
  conversion_rate: number;
}

export interface RestockSuggestion {
  location_id: string;
  product_id: string;
  product_name: string;
  current_stock: number;
  minimum_stock: number;
  suggested_quantity: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  days_until_stockout: number;
  avg_daily_consumption: number;
  last_restock_date?: string;
  supplier_info?: {
    supplier_id: string;
    supplier_name: string;
    lead_time_days: number;
    min_order_quantity: number;
  };
}

export interface LocationAlert {
  id: string;
  location_id: string;
  location_name: string;
  type: 'low_stock' | 'expiry' | 'overstock' | 'no_movement' | 'system';
  severity: 'info' | 'warning' | 'critical';
  product_id?: string;
  product_name?: string;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
  acknowledged: boolean;
}

class PointOfSaleService {
  
  // 📊 MÉTRICAS POR UBICACIÓN
  async getLocationMetrics(locationId?: string): Promise<LocationMetrics[]> {
    try {
      let query = supabase
        .from('locations')
        .select(`
          id,
          name,
          type,
          inventory:inventory(
            id,
            quantity_available,
            minimum_stock,
            maximum_stock,
            product:products(
              id,
              name,
              cost,
              price
            )
          )
        `);

      if (locationId) {
        query = query.eq('id', locationId);
      }

      const { data: locations, error } = await query;
      if (error) throw error;

      const metrics: LocationMetrics[] = [];

      for (const location of locations || []) {
        const inventory = location.inventory || [];
        
        // Calcular métricas
        const totalProducts = inventory.length;
        const totalValue = inventory.reduce((sum: number, item: unknown) => 
          sum + (item.quantity_available * (item.product?.cost || 0)), 0
        );
        
        const lowStockItems = inventory.filter((item: unknown) => 
          item.quantity_available <= item.minimum_stock
        ).length;
        
        // Obtener items expirando (próximos 30 días)
        const expiringItems = await this.getExpiringItemsCount(location.id);
        
        // Calcular frecuencia de movimiento (últimos 30 días)
        const movementFrequency = await this.getMovementFrequency(location.id);
        
        // Calcular días promedio de rotación
        const avgRotationDays = await this.getAverageRotationDays(location.id);
        
        // Calcular score de performance (0-100)
        const performanceScore = this.calculatePerformanceScore({
          lowStockRatio: lowStockItems / Math.max(totalProducts, 1),
          movementFrequency,
          avgRotationDays
        });
        
        // Velocidad de ventas (movimientos de salida por día)
        const salesVelocity = await this.getSalesVelocity(location.id);
        
        // Alertas de restock
        const restockAlerts = await this.getRestockAlertsCount(location.id);

        metrics.push({
          location_id: location.id,
          location_name: location.name,
          location_type: location.type,
          total_products: totalProducts,
          total_value: totalValue,
          low_stock_items: lowStockItems,
          expiring_items: expiringItems,
          movement_frequency: movementFrequency,
          avg_rotation_days: avgRotationDays,
          performance_score: performanceScore,
          sales_velocity: salesVelocity,
          restock_alerts: restockAlerts
        });
      }

      return metrics;
    } catch (error) {
      console.error('Error obteniendo métricas de ubicación:', error);
      return [];
    }
  }

  // 📈 PERFORMANCE DE VENTAS
  async getSalesPerformance(locationId: string, startDate: string, endDate: string): Promise<SalesPerformance | null> {
    try {
      // Obtener información de la ubicación
      const { data: location } = await supabase
        .from('locations')
        .select('id, name')
        .eq('id', locationId)
        .single();

      if (!location) return null;

      // Obtener movimientos de salida (ventas)
      const { data: movements } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          product:products(id, name, price)
        `)
        .eq('to_location_id', locationId)
        .eq('movement_type', 'salida')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (!movements) return null;

      // Calcular métricas básicas
      const salesCount = movements.length;
      const salesValue = movements.reduce((sum, m) => 
        sum + (m.quantity * (m.product?.price || 0)), 0
      );

      // Top productos
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      movements.forEach(m => {
        const productId = m.product?.id || 'unknown';
        const productName = m.product?.name || 'Producto desconocido';
        const revenue = m.quantity * (m.product?.price || 0);
        
        if (!productSales[productId]) {
          productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
        }
        
        productSales[productId].quantity += m.quantity;
        productSales[productId].revenue += revenue;
      });

      const topProducts = Object.entries(productSales)
        .map(([productId, data]) => ({
          product_id: productId,
          product_name: data.name,
          quantity_sold: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Distribución por horas
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        sales_count: 0,
        revenue: 0
      }));

      movements.forEach(m => {
        const hour = new Date(m.created_at).getHours();
        const revenue = m.quantity * (m.product?.price || 0);
        
        hourlyDistribution[hour].sales_count += 1;
        hourlyDistribution[hour].revenue += revenue;
      });

      // Calcular tasa de crecimiento (comparar con período anterior)
      const periodDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const previousStartDate = new Date(new Date(startDate).getTime() - (periodDays * 24 * 60 * 60 * 1000)).toISOString();
      
      const { data: previousMovements } = await supabase
        .from('inventory_movements')
        .select('quantity, product:products(price)')
        .eq('to_location_id', locationId)
        .eq('movement_type', 'salida')
        .gte('created_at', previousStartDate)
        .lt('created_at', startDate);

      const previousSalesValue = (previousMovements || []).reduce((sum, m) => 
        sum + (m.quantity * (m.product?.price || 0)), 0
      );

      const growthRate = previousSalesValue > 0 
        ? ((salesValue - previousSalesValue) / previousSalesValue) * 100 
        : 0;

      // Tasa de conversión (simplificada - ventas vs visitas)
      const conversionRate = salesCount > 0 ? Math.min(salesCount / 100, 1) * 100 : 0;

      return {
        location_id: locationId,
        location_name: location.name,
        period: `${startDate} - ${endDate}`,
        sales_count: salesCount,
        sales_value: salesValue,
        top_products: topProducts,
        hourly_distribution: hourlyDistribution,
        growth_rate: growthRate,
        conversion_rate: conversionRate
      };
    } catch (error) {
      console.error('Error obteniendo performance de ventas:', error);
      return null;
    }
  }

  // 🔄 SUGERENCIAS DE RESTOCK
  async getRestockSuggestions(locationId?: string): Promise<RestockSuggestion[]> {
    try {
      let inventoryQuery = supabase
        .from('inventory')
        .select(`
          *,
          product:products(
            id,
            name,
            suppliers:product_suppliers(
              supplier:suppliers(
                id,
                name,
                lead_time_days,
                minimum_order_quantity
              )
            )
          ),
          location:locations(id, name)
        `)
        .lt('quantity_available', supabase.rpc('get_minimum_stock_threshold'))
        .gt('minimum_stock', 0);

      if (locationId) {
        inventoryQuery = inventoryQuery.eq('location_id', locationId);
      }

      const { data: inventory, error } = await inventoryQuery;
      if (error) throw error;

      const suggestions: RestockSuggestion[] = [];

      for (const item of inventory || []) {
        // Calcular consumo promedio diario (últimos 30 días)
        const avgDailyConsumption = await this.getAverageDailyConsumption(
          item.product_id, 
          item.location_id
        );

        // Calcular días hasta agotamiento
        const daysUntilStockout = avgDailyConsumption > 0 
          ? Math.floor(item.quantity_available / avgDailyConsumption)
          : 999;

        // Determinar prioridad
        let priority: RestockSuggestion['priority'] = 'low';
        if (daysUntilStockout <= 1) priority = 'critical';
        else if (daysUntilStockout <= 3) priority = 'high';
        else if (daysUntilStockout <= 7) priority = 'medium';

        // Calcular cantidad sugerida (para 2 semanas + stock de seguridad)
        const suggestedQuantity = Math.max(
          (avgDailyConsumption * 14) + item.minimum_stock - item.quantity_available,
          item.minimum_stock
        );

        // Información del proveedor principal
        const primarySupplier = item.product?.suppliers?.[0]?.supplier;

        suggestions.push({
          location_id: item.location_id,
          product_id: item.product_id,
          product_name: item.product?.name || 'Producto desconocido',
          current_stock: item.quantity_available,
          minimum_stock: item.minimum_stock,
          suggested_quantity: Math.round(suggestedQuantity),
          priority,
          days_until_stockout: daysUntilStockout,
          avg_daily_consumption: avgDailyConsumption,
          supplier_info: primarySupplier ? {
            supplier_id: primarySupplier.id,
            supplier_name: primarySupplier.name,
            lead_time_days: primarySupplier.lead_time_days || 7,
            min_order_quantity: primarySupplier.minimum_order_quantity || 1
          } : undefined
        });
      }

      // Ordenar por prioridad y días hasta agotamiento
      return suggestions.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.days_until_stockout - b.days_until_stockout;
      });
    } catch (error) {
      console.error('Error obteniendo sugerencias de restock:', error);
      return [];
    }
  }

  // 🚨 ALERTAS POR UBICACIÓN
  async getLocationAlerts(locationId?: string): Promise<LocationAlert[]> {
    try {
      // Generar alertas basadas en métricas actuales
      const alerts: LocationAlert[] = [];

      // Obtener métricas para generar alertas
      const metrics = await this.getLocationMetrics(locationId);
      
      for (const metric of metrics) {
        // Alerta de stock bajo crítico
        if (metric.low_stock_items > metric.total_products * 0.3) {
          alerts.push({
            id: `low-stock-${metric.location_id}`,
            location_id: metric.location_id,
            location_name: metric.location_name,
            type: 'low_stock',
            severity: 'critical',
            message: `${metric.low_stock_items} productos con stock bajo`,
            details: { 
              count: metric.low_stock_items, 
              total: metric.total_products,
              percentage: Math.round((metric.low_stock_items / metric.total_products) * 100)
            },
            created_at: new Date().toISOString(),
            acknowledged: false
          });
        }

        // Alerta de productos expirando
        if (metric.expiring_items > 0) {
          alerts.push({
            id: `expiry-${metric.location_id}`,
            location_id: metric.location_id,
            location_name: metric.location_name,
            type: 'expiry',
            severity: metric.expiring_items > 5 ? 'critical' : 'warning',
            message: `${metric.expiring_items} productos próximos a vencer`,
            details: { count: metric.expiring_items },
            created_at: new Date().toISOString(),
            acknowledged: false
          });
        }

        // Alerta de performance bajo
        if (metric.performance_score < 60) {
          alerts.push({
            id: `performance-${metric.location_id}`,
            location_id: metric.location_id,
            location_name: metric.location_name,
            type: 'system',
            severity: metric.performance_score < 40 ? 'critical' : 'warning',
            message: `Performance de ubicación bajo: ${metric.performance_score}%`,
            details: { score: metric.performance_score },
            created_at: new Date().toISOString(),
            acknowledged: false
          });
        }

        // Alerta de rotación lenta
        if (metric.avg_rotation_days > 90) {
          alerts.push({
            id: `rotation-${metric.location_id}`,
            location_id: metric.location_id,
            location_name: metric.location_name,
            type: 'no_movement',
            severity: 'warning',
            message: `Rotación lenta: ${metric.avg_rotation_days} días promedio`,
            details: { days: metric.avg_rotation_days },
            created_at: new Date().toISOString(),
            acknowledged: false
          });
        }
      }

      return alerts.sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    } catch (error) {
      console.error('Error obteniendo alertas de ubicación:', error);
      return [];
    }
  }

  // 🔧 MÉTODOS HELPER PRIVADOS
  private async getExpiringItemsCount(locationId: string): Promise<number> {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { count } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString());

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getMovementFrequency(locationId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`)
        .gte('created_at', thirtyDaysAgo.toISOString());

      return (count || 0) / 30; // Promedio por día
    } catch (error) {
      return 0;
    }
  }

  private async getAverageRotationDays(locationId: string): Promise<number> {
    try {
      // Calcular basado en movimientos de los últimos 3 meses
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: movements } = await supabase
        .from('inventory_movements')
        .select('created_at, quantity, product_id')
        .eq('from_location_id', locationId)
        .eq('movement_type', 'salida')
        .gte('created_at', threeMonthsAgo.toISOString());

      if (!movements || movements.length === 0) return 0;

      // Simplificado: calcular días promedio entre movimientos
      const totalDays = Math.ceil((Date.now() - threeMonthsAgo.getTime()) / (1000 * 60 * 60 * 24));
      return totalDays / movements.length;
    } catch (error) {
      return 0;
    }
  }

  private calculatePerformanceScore(metrics: {
    lowStockRatio: number;
    movementFrequency: number;
    avgRotationDays: number;
  }): number {
    let score = 100;

    // Penalizar stock bajo (máximo -30 puntos)
    score -= Math.min(metrics.lowStockRatio * 100, 30);

    // Bonificar frecuencia de movimiento (máximo +20 puntos)
    score += Math.min(metrics.movementFrequency * 2, 20);

    // Penalizar rotación lenta (máximo -40 puntos)
    if (metrics.avgRotationDays > 30) {
      score -= Math.min((metrics.avgRotationDays - 30) / 2, 40);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private async getSalesVelocity(locationId: string): Promise<number> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .eq('from_location_id', locationId)
        .eq('movement_type', 'salida')
        .gte('created_at', sevenDaysAgo.toISOString());

      return (count || 0) / 7; // Promedio por día
    } catch (error) {
      return 0;
    }
  }

  private async getRestockAlertsCount(locationId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .lt('quantity_available', supabase.rpc('get_minimum_stock_threshold'));

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getAverageDailyConsumption(productId: string, locationId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: movements } = await supabase
        .from('inventory_movements')
        .select('quantity')
        .eq('product_id', productId)
        .eq('from_location_id', locationId)
        .eq('movement_type', 'salida')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (!movements || movements.length === 0) return 0;

      const totalConsumption = movements.reduce((sum, m) => sum + m.quantity, 0);
      return totalConsumption / 30;
    } catch (error) {
      return 0;
    }
  }
}

// Exportar instancia singleton
export const pointOfSaleService = new PointOfSaleService();