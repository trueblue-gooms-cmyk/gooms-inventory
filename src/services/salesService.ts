import { supabase } from '@/integrations/supabase/client';

export interface Sale {
  id: string;
  location_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  sale_number: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'mixed';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  sale_status: 'draft' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  sold_by: string;
  sale_date: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
  cost_price: number;
  profit_amount: number;
  batch_id?: string;
  expiry_date?: string;
}

export interface SalesByLocation {
  location_id: string;
  location_name: string;
  total_sales: number;
  total_units: number;
  total_profit: number;
  average_sale: number;
  transaction_count: number;
  top_products: {
    product_id: string;
    product_name: string;
    units_sold: number;
    revenue: number;
  }[];
  daily_sales: {
    date: string;
    sales: number;
    units: number;
    transactions: number;
  }[];
}

export interface LocationSalesMetrics {
  location_id: string;
  period: string;
  total_revenue: number;
  total_profit: number;
  total_transactions: number;
  total_units_sold: number;
  average_transaction_value: number;
  profit_margin: number;
  best_selling_products: {
    product_id: string;
    product_name: string;
    units_sold: number;
    revenue: number;
    profit: number;
  }[];
  hourly_sales: {
    hour: number;
    revenue: number;
    transactions: number;
  }[];
  payment_methods: {
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
}

export interface SalesComparison {
  current_period: LocationSalesMetrics;
  previous_period: LocationSalesMetrics;
  growth_rate: number;
  revenue_growth: number;
  profit_growth: number;
  transaction_growth: number;
}

class SalesService {
  async createSale(sale: Omit<Sale, 'id' | 'sale_number' | 'created_at' | 'updated_at'>): Promise<Sale | null> {
    try {
      // Generar número de venta
      const saleNumber = await this.generateSaleNumber(sale.location_id);
      
      const { data, error } = await supabase
        .from('sales')
        .insert([{
          ...sale,
          sale_number: saleNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Sale;
    } catch (error) {
      console.error('Error creating sale:', error);
      return null;
    }
  }

  async addSaleItems(saleId: string, items: Omit<SaleItem, 'id' | 'sale_id'>[]): Promise<SaleItem[]> {
    try {
      const saleItems = items.map(item => ({
        ...item,
        sale_id: saleId
      }));

      const { data, error } = await supabase
        .from('sale_items')
        .insert(saleItems)
        .select();

      if (error) throw error;

      // Actualizar inventario por cada item vendido
      for (const item of items) {
        await this.updateInventoryAfterSale(saleId, item);
      }

      return (data || []) as SaleItem[];
    } catch (error) {
      console.error('Error adding sale items:', error);
      return [];
    }
  }

  private async updateInventoryAfterSale(saleId: string, item: Omit<SaleItem, 'id' | 'sale_id'>): Promise<void> {
    try {
      // Obtener información de la venta
      const { data: sale } = await supabase
        .from('sales')
        .select('location_id')
        .eq('id', saleId)
        .single();

      if (!sale) return;

      // Actualizar stock en inventario
      const { data: inventory } = await supabase
        .from('inventory')
        .select('current_stock')
        .eq('product_id', item.product_id)
        .eq('location_id', sale.location_id)
        .single();

      if (inventory) {
        await supabase
          .from('inventory')
          .update({
            current_stock: inventory.current_stock - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('product_id', item.product_id)
          .eq('location_id', sale.location_id);
      }

      // Registrar movimiento de inventario
      await supabase
        .from('inventory_movements')
        .insert([{
          product_id: item.product_id,
          location_id: sale.location_id,
          movement_type: 'salida',
          quantity: -item.quantity,
          reference_type: 'sale',
          reference_id: saleId,
          notes: `Venta - ${item.quantity} unidades`,
          created_by: 'system',
          created_at: new Date().toISOString()
        }]);

    } catch (error) {
      console.error('Error updating inventory after sale:', error);
    }
  }

  private async generateSaleNumber(locationId: string): Promise<string> {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');

      // Obtener ubicación para código
      const { data: location } = await supabase
        .from('locations')
        .select('code')
        .eq('id', locationId)
        .single();

      const locationCode = location?.code || 'LOC';

      // Contar ventas del día
      const startOfDay = new Date(year, today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(year, today.getMonth(), today.getDate() + 1).toISOString();

      const { count } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .gte('sale_date', startOfDay)
        .lt('sale_date', endOfDay);

      const sequence = String((count || 0) + 1).padStart(4, '0');
      return `${locationCode}-${year}${month}${day}-${sequence}`;

    } catch (error) {
      console.error('Error generating sale number:', error);
      return `SALE-${Date.now()}`;
    }
  }

  async getSales(locationId?: string, startDate?: string, endDate?: string): Promise<Sale[]> {
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (
              name,
              sku
            )
          ),
          locations (
            name,
            code
          )
        `)
        .order('sale_date', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      if (startDate) {
        query = query.gte('sale_date', startDate);
      }

      if (endDate) {
        query = query.lte('sale_date', endDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as Sale[];
    } catch (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
  }

  async getLocationSalesMetrics(locationId: string, days: number = 30): Promise<LocationSalesMetrics | null> {
    try {
      const endDate = new Date();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Ventas totales del período
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (
              name
            )
          )
        `)
        .eq('location_id', locationId)
        .eq('sale_status', 'completed')
        .gte('sale_date', startDate.toISOString())
        .lte('sale_date', endDate.toISOString());

      if (salesError) throw salesError;

      if (!sales || sales.length === 0) {
        return {
          location_id: locationId,
          period: `${days} días`,
          total_revenue: 0,
          total_profit: 0,
          total_transactions: 0,
          total_units_sold: 0,
          average_transaction_value: 0,
          profit_margin: 0,
          best_selling_products: [],
          hourly_sales: [],
          payment_methods: []
        };
      }

      // Calcular métricas básicas
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalProfit = sales.reduce((sum, sale) => {
        return sum + (sale.sale_items || []).reduce((itemSum: number, item: SaleItem) => {
          return itemSum + (item.profit_amount || 0);
        }, 0);
      }, 0);
      const totalTransactions = sales.length;
      const totalUnits = sales.reduce((sum, sale) => {
        return sum + (sale.sale_items || []).reduce((itemSum: number, item: SaleItem) => {
          return itemSum + item.quantity;
        }, 0);
      }, 0);

      // Productos más vendidos
      const productSales = new Map();
      sales.forEach(sale => {
        (sale.sale_items || []).forEach((item: any) => {
          const key = item.product_id;
          if (!productSales.has(key)) {
            productSales.set(key, {
              product_id: item.product_id,
              product_name: item.products?.name || 'N/A',
              units_sold: 0,
              revenue: 0,
              profit: 0
            });
          }
          const existing = productSales.get(key);
          existing.units_sold += item.quantity;
          existing.revenue += item.line_total;
          existing.profit += item.profit_amount || 0;
        });
      });

      const bestSellingProducts = Array.from(productSales.values())
        .sort((a, b) => b.units_sold - a.units_sold)
        .slice(0, 10);

      // Ventas por hora
      const hourlySales = new Array(24).fill(0).map((_, hour) => ({
        hour,
        revenue: 0,
        transactions: 0
      }));

      sales.forEach(sale => {
        const hour = new Date(sale.sale_date).getHours();
        hourlySales[hour].revenue += sale.total_amount;
        hourlySales[hour].transactions += 1;
      });

      // Métodos de pago
      const paymentMethods = new Map();
      sales.forEach(sale => {
        const method = sale.payment_method;
        if (!paymentMethods.has(method)) {
          paymentMethods.set(method, { count: 0, amount: 0 });
        }
        const existing = paymentMethods.get(method);
        existing.count += 1;
        existing.amount += sale.total_amount;
      });

      const paymentMethodsArray = Array.from(paymentMethods.entries()).map(([method, data]) => ({
        method,
        count: data.count,
        amount: data.amount,
        percentage: (data.count / totalTransactions) * 100
      }));

      return {
        location_id: locationId,
        period: `${days} días`,
        total_revenue: totalRevenue,
        total_profit: totalProfit,
        total_transactions: totalTransactions,
        total_units_sold: totalUnits,
        average_transaction_value: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        profit_margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        best_selling_products: bestSellingProducts,
        hourly_sales: hourlySales,
        payment_methods: paymentMethodsArray
      };

    } catch (error) {
      console.error('Error getting location sales metrics:', error);
      return null;
    }
  }

  async getSalesComparison(locationId: string, currentDays: number = 30): Promise<SalesComparison | null> {
    try {
      const currentMetrics = await this.getLocationSalesMetrics(locationId, currentDays);
      
      // Período anterior
      const previousStartDate = new Date(Date.now() - (currentDays * 2) * 24 * 60 * 60 * 1000);
      const previousEndDate = new Date(Date.now() - currentDays * 24 * 60 * 60 * 1000);
      
      const { data: previousSales } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (
              name
            )
          )
        `)
        .eq('location_id', locationId)
        .eq('sale_status', 'completed')
        .gte('sale_date', previousStartDate.toISOString())
        .lte('sale_date', previousEndDate.toISOString());

      // Calcular métricas del período anterior (simplificado)
      const previousRevenue = (previousSales || []).reduce((sum, sale) => sum + sale.total_amount, 0);
      const previousTransactions = (previousSales || []).length;
      const previousProfit = (previousSales || []).reduce((sum, sale) => {
        return sum + (sale.sale_items || []).reduce((itemSum: number, item: SaleItem) => {
          return itemSum + (item.profit_amount || 0);
        }, 0);
      }, 0);

      if (!currentMetrics) return null;

      // Calcular crecimientos
      const revenueGrowth = previousRevenue > 0 
        ? ((currentMetrics.total_revenue - previousRevenue) / previousRevenue) * 100 
        : 0;
      
      const profitGrowth = previousProfit > 0 
        ? ((currentMetrics.total_profit - previousProfit) / previousProfit) * 100 
        : 0;
      
      const transactionGrowth = previousTransactions > 0 
        ? ((currentMetrics.total_transactions - previousTransactions) / previousTransactions) * 100 
        : 0;

      return {
        current_period: currentMetrics,
        previous_period: {
          ...currentMetrics,
          total_revenue: previousRevenue,
          total_profit: previousProfit,
          total_transactions: previousTransactions
        } as LocationSalesMetrics,
        growth_rate: revenueGrowth,
        revenue_growth: revenueGrowth,
        profit_growth: profitGrowth,
        transaction_growth: transactionGrowth
      };

    } catch (error) {
      console.error('Error getting sales comparison:', error);
      return null;
    }
  }

  async getSalesByLocation(startDate?: string, endDate?: string): Promise<SalesByLocation[]> {
    try {
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true);

      const locationSales: SalesByLocation[] = [];

      for (const location of locations || []) {
        const metrics = await this.getLocationSalesMetrics(location.id, 30);
        
        if (metrics) {
          // Obtener ventas diarias
          const { data: dailySales } = await supabase
            .from('sales')
            .select('sale_date, total_amount, sale_items(quantity)')
            .eq('location_id', location.id)
            .eq('sale_status', 'completed')
            .gte('sale_date', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .lte('sale_date', endDate || new Date().toISOString())
            .order('sale_date', { ascending: true });

          const dailyData = new Map();
          (dailySales || []).forEach(sale => {
            const date = sale.sale_date.split('T')[0];
            if (!dailyData.has(date)) {
              dailyData.set(date, { sales: 0, units: 0, transactions: 0 });
            }
            const existing = dailyData.get(date);
            existing.sales += sale.total_amount;
            existing.units += (sale.sale_items || []).reduce((sum: number, item: any) => sum + item.quantity, 0);
            existing.transactions += 1;
          });

          locationSales.push({
            location_id: location.id,
            location_name: location.name,
            total_sales: metrics.total_revenue,
            total_units: metrics.total_units_sold,
            total_profit: metrics.total_profit,
            average_sale: metrics.average_transaction_value,
            transaction_count: metrics.total_transactions,
            top_products: metrics.best_selling_products.slice(0, 5),
            daily_sales: Array.from(dailyData.entries()).map(([date, data]) => ({
              date,
              sales: data.sales,
              units: data.units,
              transactions: data.transactions
            }))
          });
        }
      }

      return locationSales.sort((a, b) => b.total_sales - a.total_sales);

    } catch (error) {
      console.error('Error getting sales by location:', error);
      return [];
    }
  }

  async updateSaleStatus(saleId: string, status: Sale['sale_status']): Promise<Sale | null> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .update({
          sale_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId)
        .select()
        .single();

      if (error) throw error;
      return data as Sale;
    } catch (error) {
      console.error('Error updating sale status:', error);
      return null;
    }
  }

  async refundSale(saleId: string, reason?: string): Promise<boolean> {
    try {
      // Actualizar estado de la venta
      await this.updateSaleStatus(saleId, 'refunded');

      // Revertir inventario
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      const { data: sale } = await supabase
        .from('sales')
        .select('location_id')
        .eq('id', saleId)
        .single();

      if (sale && saleItems) {
        for (const item of saleItems) {
          // Devolver stock al inventario
          const { data: inventory } = await supabase
            .from('inventory')
            .select('current_stock')
            .eq('product_id', item.product_id)
            .eq('location_id', sale.location_id)
            .single();

          if (inventory) {
            await supabase
              .from('inventory')
              .update({
                current_stock: inventory.current_stock + item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('product_id', item.product_id)
              .eq('location_id', sale.location_id);
          }

          // Registrar movimiento de devolución
          await supabase
            .from('inventory_movements')
            .insert([{
              product_id: item.product_id,
              location_id: sale.location_id,
              movement_type: 'entrada',
              quantity: item.quantity,
              reference_type: 'refund',
              reference_id: saleId,
              notes: `Devolución - ${item.quantity} unidades${reason ? ` | Motivo: ${reason}` : ''}`,
              created_by: 'system',
              created_at: new Date().toISOString()
            }]);
        }
      }

      return true;
    } catch (error) {
      console.error('Error processing refund:', error);
      return false;
    }
  }

  async getSalesSummary(locationId?: string, days: number = 30): Promise<{
    totalSales: number;
    totalProfit: number;
    totalTransactions: number;
    averageTransaction: number;
    growthRate: number;
    profitMargin: number;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let query = supabase
        .from('sales')
        .select(`
          total_amount,
          sale_items (
            profit_amount
          )
        `)
        .eq('sale_status', 'completed')
        .gte('sale_date', startDate.toISOString())
        .lte('sale_date', endDate.toISOString());

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data: sales, error } = await query;
      if (error) throw error;

      const totalSales = (sales || []).reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalProfit = (sales || []).reduce((sum, sale) => {
        return sum + (sale.sale_items || []).reduce((itemSum: any, item: any) => {
          return itemSum + (item.profit_amount || 0);
        }, 0);
      }, 0);
      const totalTransactions = (sales || []).length;

      // Comparar con período anterior para crecimiento
      const previousEndDate = startDate;
      const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

      let previousQuery = supabase
        .from('sales')
        .select('total_amount')
        .eq('sale_status', 'completed')
        .gte('sale_date', previousStartDate.toISOString())
        .lte('sale_date', previousEndDate.toISOString());

      if (locationId) {
        previousQuery = previousQuery.eq('location_id', locationId);
      }

      const { data: previousSales } = await previousQuery;
      const previousTotal = (previousSales || []).reduce((sum, sale) => sum + sale.total_amount, 0);

      const growthRate = previousTotal > 0 ? ((totalSales - previousTotal) / previousTotal) * 100 : 0;
      const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      return {
        totalSales,
        totalProfit,
        totalTransactions,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0,
        growthRate,
        profitMargin
      };

    } catch (error) {
      console.error('Error getting sales summary:', error);
      return {
        totalSales: 0,
        totalProfit: 0,
        totalTransactions: 0,
        averageTransaction: 0,
        growthRate: 0,
        profitMargin: 0
      };
    }
  }
}

export const salesService = new SalesService();