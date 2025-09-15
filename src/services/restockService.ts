import { supabase } from '@/integrations/supabase/client';

export interface RestockRule {
  id: string;
  location_id: string;
  product_id: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  reorder_quantity: number;
  supplier_id?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_active: boolean;
  last_restock_date?: string;
  auto_restock_enabled: boolean;
  lead_time_days: number;
  seasonal_factor?: number;
  created_at: string;
  updated_at: string;
}

export interface RestockOrder {
  id: string;
  location_id: string;
  product_id: string;
  supplier_id?: string;
  quantity_requested: number;
  quantity_approved?: number;
  unit_cost: number;
  total_cost: number;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requested_by: string;
  approved_by?: string;
  requested_date: string;
  approved_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  auto_generated: boolean;
}

export interface StockAnalysis {
  product_id: string;
  location_id: string;
  current_stock: number;
  average_daily_consumption: number;
  days_of_stock_remaining: number;
  suggested_reorder_quantity: number;
  estimated_cost: number;
  urgency_score: number;
  seasonal_adjustment: number;
  lead_time_buffer: number;
}

export interface RestockAlert {
  id: string;
  location_id: string;
  product_id: string;
  product_name: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock' | 'slow_moving' | 'expired_soon';
  current_stock: number;
  recommended_action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  is_resolved: boolean;
  resolved_at?: string;
}

class RestockService {
  async createRestockRule(rule: Omit<RestockRule, 'id' | 'created_at' | 'updated_at'>): Promise<RestockRule | null> {
    try {
      const { data, error } = await supabase
        .from('restock_rules')
        .insert([{
          ...rule,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data as RestockRule;
    } catch (error) {
      console.error('Error creating restock rule:', error);
      return null;
    }
  }

  async getRestockRules(locationId?: string): Promise<RestockRule[]> {
    try {
      let query = supabase.from('restock_rules').select('*');
      
      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.eq('is_active', true);
      
      if (error) throw error;
      return (data || []) as RestockRule[];
    } catch (error) {
      console.error('Error fetching restock rules:', error);
      return [];
    }
  }

  async updateRestockRule(id: string, updates: Partial<RestockRule>): Promise<RestockRule | null> {
    try {
      const { data, error } = await supabase
        .from('restock_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RestockRule;
    } catch (error) {
      console.error('Error updating restock rule:', error);
      return null;
    }
  }

  async analyzeStockLevels(locationId: string): Promise<StockAnalysis[]> {
    try {
      // Obtener inventario actual
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select(`
          product_id,
          current_stock,
          products (
            name,
            cost,
            average_cost
          )
        `)
        .eq('location_id', locationId)
        .gt('current_stock', 0);

      if (invError) throw invError;

      // Calcular consumo promedio por producto (últimos 30 días)
      const analyses: StockAnalysis[] = [];

      for (const item of inventory || []) {
        const { data: movements, error: movError } = await supabase
          .from('inventory_movements')
          .select('quantity')
          .eq('product_id', item.product_id)
          .eq('location_id', locationId)
          .eq('movement_type', 'salida')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (movError) continue;

        const totalConsumed = movements?.reduce((sum, mov) => sum + Math.abs(mov.quantity), 0) || 0;
        const avgDailyConsumption = totalConsumed / 30;
        const daysRemaining = avgDailyConsumption > 0 ? item.current_stock / avgDailyConsumption : 999;
        
        // Obtener regla de restock si existe
        const { data: rule } = await supabase
          .from('restock_rules')
          .select('*')
          .eq('product_id', item.product_id)
          .eq('location_id', locationId)
          .eq('is_active', true)
          .single();

        const leadTimeBuffer = rule?.lead_time_days || 7;
        const seasonalFactor = rule?.seasonal_factor || 1;
        const suggestedQuantity = Math.max(
          0,
          (avgDailyConsumption * (leadTimeBuffer + 7) * seasonalFactor) - item.current_stock
        );

        analyses.push({
          product_id: item.product_id,
          location_id: locationId,
          current_stock: item.current_stock,
          average_daily_consumption: avgDailyConsumption,
          days_of_stock_remaining: daysRemaining,
          suggested_reorder_quantity: Math.round(suggestedQuantity),
          estimated_cost: suggestedQuantity * (item.products?.average_cost || item.products?.cost || 0),
          urgency_score: this.calculateUrgencyScore(daysRemaining, avgDailyConsumption),
          seasonal_adjustment: seasonalFactor,
          lead_time_buffer: leadTimeBuffer
        });
      }

      return analyses.sort((a, b) => b.urgency_score - a.urgency_score);
    } catch (error) {
      console.error('Error analyzing stock levels:', error);
      return [];
    }
  }

  private calculateUrgencyScore(daysRemaining: number, dailyConsumption: number): number {
    if (daysRemaining <= 0) return 100; // Stock agotado
    if (daysRemaining <= 3) return 90;  // Crítico
    if (daysRemaining <= 7) return 70;  // Alto
    if (daysRemaining <= 14) return 50; // Medio
    if (daysRemaining <= 30) return 30; // Bajo
    return 10; // Muy bajo
  }

  async generateAutomaticRestockOrders(): Promise<RestockOrder[]> {
    try {
      const { data: locations } = await supabase
        .from('locations')
        .select('id')
        .eq('is_active', true);

      const generatedOrders: RestockOrder[] = [];

      for (const location of locations || []) {
        const analyses = await this.analyzeStockLevels(location.id);
        const urgentItems = analyses.filter(a => a.urgency_score >= 70 && a.suggested_reorder_quantity > 0);

        for (const item of urgentItems) {
          // Verificar si ya existe una orden pendiente para este producto
          const { data: existingOrder } = await supabase
            .from('restock_orders')
            .select('id')
            .eq('product_id', item.product_id)
            .eq('location_id', item.location_id)
            .in('status', ['pending', 'approved', 'ordered'])
            .single();

          if (existingOrder) continue; // Ya existe una orden

          // Obtener información del producto y proveedor
          const { data: product } = await supabase
            .from('products')
            .select(`
              *,
              supplier_products (
                supplier_id,
                unit_cost,
                suppliers (
                  name,
                  is_active
                )
              )
            `)
            .eq('id', item.product_id)
            .single();

          if (!product) continue;

          const preferredSupplier = product.supplier_products?.find(
            (sp: { supplier_id: string; unit_cost: number; suppliers: { name: string; is_active: boolean } }) => sp.suppliers?.is_active
          );

          const order: Omit<RestockOrder, 'id'> = {
            location_id: item.location_id,
            product_id: item.product_id,
            supplier_id: preferredSupplier?.supplier_id,
            quantity_requested: item.suggested_reorder_quantity,
            unit_cost: preferredSupplier?.unit_cost || product.cost || 0,
            total_cost: item.estimated_cost,
            status: 'pending',
            priority: this.getPriorityFromUrgency(item.urgency_score),
            requested_by: 'system', // Usuario del sistema automático
            requested_date: new Date().toISOString(),
            expected_delivery_date: new Date(Date.now() + item.lead_time_buffer * 24 * 60 * 60 * 1000).toISOString(),
            auto_generated: true,
            notes: `Generada automáticamente - Stock restante: ${item.days_of_stock_remaining.toFixed(1)} días`
          };

          const { data: createdOrder, error } = await supabase
            .from('restock_orders')
            .insert([order])
            .select()
            .single();

          if (!error && createdOrder) {
            generatedOrders.push(createdOrder as RestockOrder);
          }
        }
      }

      return generatedOrders;
    } catch (error) {
      console.error('Error generating automatic restock orders:', error);
      return [];
    }
  }

  private getPriorityFromUrgency(urgencyScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (urgencyScore >= 90) return 'critical';
    if (urgencyScore >= 70) return 'high';
    if (urgencyScore >= 50) return 'medium';
    return 'low';
  }

  async getRestockOrders(locationId?: string, status?: string): Promise<RestockOrder[]> {
    try {
      let query = supabase
        .from('restock_orders')
        .select(`
          *,
          products (
            name,
            sku,
            unit
          ),
          locations (
            name
          ),
          suppliers (
            name,
            contact_email
          )
        `)
        .order('requested_date', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as RestockOrder[];
    } catch (error) {
      console.error('Error fetching restock orders:', error);
      return [];
    }
  }

  async updateRestockOrderStatus(
    orderId: string, 
    status: RestockOrder['status'],
    updates: Partial<RestockOrder> = {}
  ): Promise<RestockOrder | null> {
    try {
      const { data, error } = await supabase
        .from('restock_orders')
        .update({
          status,
          ...updates,
          [`${status}_date`]: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data as RestockOrder;
    } catch (error) {
      console.error('Error updating restock order status:', error);
      return null;
    }
  }

  async generateRestockAlerts(): Promise<RestockAlert[]> {
    try {
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true);

      const alerts: RestockAlert[] = [];

      for (const location of locations || []) {
        const analyses = await this.analyzeStockLevels(location.id);

        for (const analysis of analyses) {
          const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', analysis.product_id)
            .single();

          if (!product) continue;

          let alertType: RestockAlert['alert_type'] = 'low_stock';
          let recommendedAction = '';

          if (analysis.current_stock === 0) {
            alertType = 'out_of_stock';
            recommendedAction = 'Reabastecer inmediatamente - Sin stock disponible';
          } else if (analysis.days_of_stock_remaining <= 3) {
            alertType = 'low_stock';
            recommendedAction = `Reabastecer urgente - Solo ${analysis.days_of_stock_remaining.toFixed(1)} días de stock`;
          } else if (analysis.days_of_stock_remaining <= 7) {
            alertType = 'low_stock';
            recommendedAction = `Planificar reabastecimiento - ${analysis.days_of_stock_remaining.toFixed(1)} días de stock`;
          } else if (analysis.days_of_stock_remaining > 90 && analysis.average_daily_consumption < 0.1) {
            alertType = 'slow_moving';
            recommendedAction = 'Producto de baja rotación - Revisar estrategia de inventario';
          }

          if (alertType === 'low_stock' || alertType === 'out_of_stock' || alertType === 'slow_moving') {
            // Verificar si ya existe una alerta similar no resuelta
            const { data: existingAlert } = await supabase
              .from('restock_alerts')
              .select('id')
              .eq('product_id', analysis.product_id)
              .eq('location_id', analysis.location_id)
              .eq('alert_type', alertType)
              .eq('is_resolved', false)
              .single();

            if (!existingAlert) {
              const alert: Omit<RestockAlert, 'id'> = {
                location_id: analysis.location_id,
                product_id: analysis.product_id,
                product_name: product.name,
                alert_type: alertType,
                current_stock: analysis.current_stock,
                recommended_action: recommendedAction,
                priority: this.getPriorityFromUrgency(analysis.urgency_score),
                created_at: new Date().toISOString(),
                is_resolved: false
              };

              const { data: createdAlert, error } = await supabase
                .from('restock_alerts')
                .insert([alert])
                .select()
                .single();

              if (!error && createdAlert) {
                alerts.push(createdAlert as RestockAlert);
              }
            }
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error generating restock alerts:', error);
      return [];
    }
  }

  async getRestockAlerts(locationId?: string, unresolved: boolean = true): Promise<RestockAlert[]> {
    try {
      let query = supabase
        .from('restock_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      if (unresolved) {
        query = query.eq('is_resolved', false);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as RestockAlert[];
    } catch (error) {
      console.error('Error fetching restock alerts:', error);
      return [];
    }
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('restock_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      return !error;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
  }

  async getRestockStatistics(locationId?: string, days: number = 30): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalCost: number;
    averageLeadTime: number;
    automationRate: number;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('restock_orders')
        .select('*')
        .gte('requested_date', startDate);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => ['pending', 'approved', 'ordered'].includes(o.status)).length || 0;
      const completedOrders = orders?.filter(o => o.status === 'received').length || 0;
      const totalCost = orders?.reduce((sum, o) => sum + o.total_cost, 0) || 0;
      const autoOrders = orders?.filter(o => o.auto_generated).length || 0;

      // Calcular tiempo promedio de entrega
      const deliveredOrders = orders?.filter(o => o.actual_delivery_date && o.requested_date) || [];
      const averageLeadTime = deliveredOrders.length > 0 
        ? deliveredOrders.reduce((sum, o) => {
            const leadTime = (new Date(o.actual_delivery_date!).getTime() - new Date(o.requested_date).getTime()) / (1000 * 60 * 60 * 24);
            return sum + leadTime;
          }, 0) / deliveredOrders.length
        : 0;

      return {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalCost,
        averageLeadTime,
        automationRate: totalOrders > 0 ? (autoOrders / totalOrders) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting restock statistics:', error);
      return {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalCost: 0,
        averageLeadTime: 0,
        automationRate: 0
      };
    }
  }
}

export const restockService = new RestockService();