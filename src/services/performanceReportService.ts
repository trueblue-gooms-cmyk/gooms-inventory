import { supabase } from '@/integrations/supabase/client';

export interface PerformanceReport {
  id: string;
  location_id: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  report_period_start: string;
  report_period_end: string;
  generated_at: string;
  generated_by: string;
  data: PerformanceReportData;
  status: 'generating' | 'completed' | 'failed';
  file_url?: string;
}

export interface PerformanceReportData {
  summary: {
    total_revenue: number;
    total_profit: number;
    total_transactions: number;
    total_units_sold: number;
    profit_margin: number;
    average_transaction_value: number;
    revenue_growth: number;
    profit_growth: number;
  };
  
  daily_breakdown: {
    date: string;
    revenue: number;
    profit: number;
    transactions: number;
    units_sold: number;
    average_transaction: number;
  }[];

  product_performance: {
    product_id: string;
    product_name: string;
    sku: string;
    units_sold: number;
    revenue: number;
    profit: number;
    profit_margin: number;
    rank: number;
    trend: 'up' | 'down' | 'stable';
  }[];

  category_performance: {
    category_id?: string;
    category_name: string;
    revenue: number;
    profit: number;
    units_sold: number;
    product_count: number;
  }[];

  hourly_distribution: {
    hour: number;
    revenue: number;
    transactions: number;
    average_transaction: number;
  }[];

  customer_insights: {
    new_customers: number;
    returning_customers: number;
    customer_retention_rate: number;
    average_customer_value: number;
  };

  inventory_insights: {
    stock_turnover: number;
    out_of_stock_incidents: number;
    low_stock_alerts: number;
    overstock_items: number;
    inventory_value: number;
  };

  financial_kpis: {
    gross_margin: number;
    cost_of_goods_sold: number;
    operating_expenses: number;
    roi: number;
    break_even_point: number;
  };

  comparisons: {
    vs_previous_period: {
      revenue_change: number;
      profit_change: number;
      transaction_change: number;
      units_change: number;
    };
    vs_same_period_last_year: {
      revenue_change: number;
      profit_change: number;
      transaction_change: number;
      units_change: number;
    };
  };
}

export interface PerformanceMetric {
  metric_name: string;
  current_value: number;
  previous_value: number;
  target_value?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
  performance_rating: 'excellent' | 'good' | 'average' | 'poor';
}

export interface LocationComparison {
  location_id: string;
  location_name: string;
  metrics: {
    revenue: number;
    profit: number;
    transactions: number;
    units_sold: number;
    profit_margin: number;
    rank: number;
  };
  trends: {
    revenue_trend: number;
    profit_trend: number;
    efficiency_score: number;
  };
}

class PerformanceReportService {
  async generatePerformanceReport(
    locationId: string,
    reportType: PerformanceReport['report_type'],
    startDate: string,
    endDate: string,
    userId: string
  ): Promise<PerformanceReport | null> {
    try {
      console.log('Generating performance report...', { locationId, reportType, startDate, endDate });

      // Generar datos del reporte
      const reportData = await this.collectReportData(locationId, startDate, endDate);

      // Crear entrada en la base de datos
      const { data, error } = await supabase
        .from('performance_reports')
        .insert([{
          location_id: locationId,
          report_type: reportType,
          report_period_start: startDate,
          report_period_end: endDate,
          generated_at: new Date().toISOString(),
          generated_by: userId,
          data: reportData,
          status: 'completed'
        }])
        .select()
        .single();

      if (error) throw error;
      return data as PerformanceReport;

    } catch (error) {
      console.error('Error generating performance report:', error);
      return null;
    }
  }

  private async collectReportData(
    locationId: string, 
    startDate: string, 
    endDate: string
  ): Promise<PerformanceReportData> {
    const [
      salesData,
      previousPeriodData,
      lastYearData,
      productData,
      inventoryData
    ] = await Promise.all([
      this.getSalesData(locationId, startDate, endDate),
      this.getPreviousPeriodData(locationId, startDate, endDate),
      this.getLastYearData(locationId, startDate, endDate),
      this.getProductPerformanceData(locationId, startDate, endDate),
      this.getInventoryInsights(locationId, startDate, endDate)
    ]);

    return {
      summary: {
        total_revenue: salesData.total_revenue,
        total_profit: salesData.total_profit,
        total_transactions: salesData.total_transactions,
        total_units_sold: salesData.total_units_sold,
        profit_margin: salesData.total_revenue > 0 ? (salesData.total_profit / salesData.total_revenue) * 100 : 0,
        average_transaction_value: salesData.total_transactions > 0 ? salesData.total_revenue / salesData.total_transactions : 0,
        revenue_growth: this.calculateGrowth(salesData.total_revenue, previousPeriodData.total_revenue),
        profit_growth: this.calculateGrowth(salesData.total_profit, previousPeriodData.total_profit)
      },

      daily_breakdown: salesData.daily_breakdown,
      product_performance: productData,
      category_performance: await this.getCategoryPerformance(locationId, startDate, endDate),
      hourly_distribution: salesData.hourly_distribution,
      
      customer_insights: {
        new_customers: 0, // TODO: Implementar cuando tengamos sistema de clientes
        returning_customers: 0,
        customer_retention_rate: 0,
        average_customer_value: salesData.total_transactions > 0 ? salesData.total_revenue / salesData.total_transactions : 0
      },

      inventory_insights: inventoryData,

      financial_kpis: {
        gross_margin: salesData.total_revenue > 0 ? (salesData.total_profit / salesData.total_revenue) * 100 : 0,
        cost_of_goods_sold: salesData.total_revenue - salesData.total_profit,
        operating_expenses: 0, // TODO: Implementar gastos operativos
        roi: 0, // TODO: Calcular ROI
        break_even_point: 0 // TODO: Calcular punto de equilibrio
      },

      comparisons: {
        vs_previous_period: {
          revenue_change: this.calculateGrowth(salesData.total_revenue, previousPeriodData.total_revenue),
          profit_change: this.calculateGrowth(salesData.total_profit, previousPeriodData.total_profit),
          transaction_change: this.calculateGrowth(salesData.total_transactions, previousPeriodData.total_transactions),
          units_change: this.calculateGrowth(salesData.total_units_sold, previousPeriodData.total_units_sold)
        },
        vs_same_period_last_year: {
          revenue_change: this.calculateGrowth(salesData.total_revenue, lastYearData.total_revenue),
          profit_change: this.calculateGrowth(salesData.total_profit, lastYearData.total_profit),
          transaction_change: this.calculateGrowth(salesData.total_transactions, lastYearData.total_transactions),
          units_change: this.calculateGrowth(salesData.total_units_sold, lastYearData.total_units_sold)
        }
      }
    };
  }

  private async getSalesData(locationId: string, startDate: string, endDate: string) {
    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          quantity,
          line_total,
          profit_amount
        )
      `)
      .eq('location_id', locationId)
      .eq('sale_status', 'completed')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate);

    if (error) throw error;

    const total_revenue = (sales || []).reduce((sum, sale) => sum + sale.total_amount, 0);
    const total_profit = (sales || []).reduce((sum, sale) => {
      return sum + (sale.sale_items || []).reduce((itemSum: number, item: any) => {
        return itemSum + (item.profit_amount || 0);
      }, 0);
    }, 0);
    const total_transactions = (sales || []).length;
    const total_units_sold = (sales || []).reduce((sum, sale) => {
      return sum + (sale.sale_items || []).reduce((itemSum: number, item: any) => {
        return itemSum + item.quantity;
      }, 0);
    }, 0);

    // Agrupar por día
    const dailyData = new Map();
    (sales || []).forEach(sale => {
      const date = sale.sale_date.split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          revenue: 0,
          profit: 0,
          transactions: 0,
          units_sold: 0,
          average_transaction: 0
        });
      }
      const day = dailyData.get(date);
      day.revenue += sale.total_amount;
      day.profit += (sale.sale_items || []).reduce((sum: number, item: any) => sum + (item.profit_amount || 0), 0);
      day.transactions += 1;
      day.units_sold += (sale.sale_items || []).reduce((sum: number, item: any) => sum + item.quantity, 0);
      day.average_transaction = day.transactions > 0 ? day.revenue / day.transactions : 0;
    });

    // Agrupar por hora
    const hourlyData = new Array(24).fill(0).map((_, hour) => ({
      hour,
      revenue: 0,
      transactions: 0,
      average_transaction: 0
    }));

    (sales || []).forEach(sale => {
      const hour = new Date(sale.sale_date).getHours();
      hourlyData[hour].revenue += sale.total_amount;
      hourlyData[hour].transactions += 1;
      hourlyData[hour].average_transaction = hourlyData[hour].transactions > 0 
        ? hourlyData[hour].revenue / hourlyData[hour].transactions 
        : 0;
    });

    return {
      total_revenue,
      total_profit,
      total_transactions,
      total_units_sold,
      daily_breakdown: Array.from(dailyData.values()),
      hourly_distribution: hourlyData
    };
  }

  private async getPreviousPeriodData(locationId: string, startDate: string, endDate: string) {
    const periodLength = new Date(endDate).getTime() - new Date(startDate).getTime();
    const previousEndDate = new Date(new Date(startDate).getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodLength);

    return this.getSalesData(locationId, previousStartDate.toISOString(), previousEndDate.toISOString());
  }

  private async getLastYearData(locationId: string, startDate: string, endDate: string) {
    const lastYearStart = new Date(startDate);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    
    const lastYearEnd = new Date(endDate);
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

    return this.getSalesData(locationId, lastYearStart.toISOString(), lastYearEnd.toISOString());
  }

  private async getProductPerformanceData(
    locationId: string, 
    startDate: string, 
    endDate: string
  ): Promise<PerformanceReportData['product_performance']> {
    const { data: saleItems, error } = await supabase
      .from('sale_items')
      .select(`
        product_id,
        quantity,
        line_total,
        profit_amount,
        products (
          name,
          sku
        ),
        sales!inner (
          location_id,
          sale_date,
          sale_status
        )
      `)
      .eq('sales.location_id', locationId)
      .eq('sales.sale_status', 'completed')
      .gte('sales.sale_date', startDate)
      .lte('sales.sale_date', endDate);

    if (error) throw error;

    const productData = new Map();
    (saleItems || []).forEach((item: any) => {
      const key = item.product_id;
      if (!productData.has(key)) {
        productData.set(key, {
          product_id: item.product_id,
          product_name: item.products?.name || 'N/A',
          sku: item.products?.sku || 'N/A',
          units_sold: 0,
          revenue: 0,
          profit: 0,
          profit_margin: 0,
          rank: 0,
          trend: 'stable' as const
        });
      }
      const existing = productData.get(key);
      existing.units_sold += item.quantity;
      existing.revenue += item.line_total;
      existing.profit += item.profit_amount || 0;
    });

    const products = Array.from(productData.values());
    products.forEach(product => {
      product.profit_margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
    });

    return products
      .sort((a, b) => b.revenue - a.revenue)
      .map((product, index) => ({
        ...product,
        rank: index + 1
      }));
  }

  private async getCategoryPerformance(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<PerformanceReportData['category_performance']> {
    // TODO: Implementar cuando tengamos categorías de productos
    return [];
  }

  private async getInventoryInsights(locationId: string, startDate: string, endDate: string) {
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select(`
        current_stock,
        min_stock,
        max_stock,
        products (
          cost,
          average_cost
        )
      `)
      .eq('location_id', locationId);

    if (error) throw error;

    const totalValue = (inventory || []).reduce((sum, item) => {
      const cost = item.products?.average_cost || item.products?.cost || 0;
      return sum + (item.current_stock * cost);
    }, 0);

    const lowStockItems = (inventory || []).filter(item => 
      item.current_stock <= item.min_stock && item.min_stock > 0
    ).length;

    const outOfStockItems = (inventory || []).filter(item => 
      item.current_stock === 0
    ).length;

    const overstockItems = (inventory || []).filter(item => 
      item.current_stock > item.max_stock && item.max_stock > 0
    ).length;

    return {
      stock_turnover: 0, // TODO: Calcular rotación de inventario
      out_of_stock_incidents: outOfStockItems,
      low_stock_alerts: lowStockItems,
      overstock_items: overstockItems,
      inventory_value: totalValue
    };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  async getPerformanceReports(locationId?: string, limit: number = 10): Promise<PerformanceReport[]> {
    try {
      let query = supabase
        .from('performance_reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(limit);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as PerformanceReport[];
    } catch (error) {
      console.error('Error fetching performance reports:', error);
      return [];
    }
  }

  async getLocationComparison(startDate: string, endDate: string): Promise<LocationComparison[]> {
    try {
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true);

      const comparisons: LocationComparison[] = [];

      for (const location of locations || []) {
        const salesData = await this.getSalesData(location.id, startDate, endDate);
        const previousData = await this.getPreviousPeriodData(location.id, startDate, endDate);

        comparisons.push({
          location_id: location.id,
          location_name: location.name,
          metrics: {
            revenue: salesData.total_revenue,
            profit: salesData.total_profit,
            transactions: salesData.total_transactions,
            units_sold: salesData.total_units_sold,
            profit_margin: salesData.total_revenue > 0 ? (salesData.total_profit / salesData.total_revenue) * 100 : 0,
            rank: 0 // Se asignará después del ordenamiento
          },
          trends: {
            revenue_trend: this.calculateGrowth(salesData.total_revenue, previousData.total_revenue),
            profit_trend: this.calculateGrowth(salesData.total_profit, previousData.total_profit),
            efficiency_score: this.calculateEfficiencyScore(salesData, previousData)
          }
        });
      }

      // Asignar rankings
      comparisons.sort((a, b) => b.metrics.revenue - a.metrics.revenue);
      comparisons.forEach((comparison, index) => {
        comparison.metrics.rank = index + 1;
      });

      return comparisons;

    } catch (error) {
      console.error('Error getting location comparison:', error);
      return [];
    }
  }

  private calculateEfficiencyScore(current: any, previous: any): number {
    const revenueWeight = 0.4;
    const profitWeight = 0.3;
    const transactionWeight = 0.3;

    const revenueScore = this.normalizeScore(this.calculateGrowth(current.total_revenue, previous.total_revenue));
    const profitScore = this.normalizeScore(this.calculateGrowth(current.total_profit, previous.total_profit));
    const transactionScore = this.normalizeScore(this.calculateGrowth(current.total_transactions, previous.total_transactions));

    return (revenueScore * revenueWeight) + (profitScore * profitWeight) + (transactionScore * transactionWeight);
  }

  private normalizeScore(growth: number): number {
    // Normalizar crecimiento a escala 0-100
    if (growth < -50) return 0;
    if (growth > 50) return 100;
    return ((growth + 50) / 100) * 100;
  }

  async generateCustomReport(
    locationId: string,
    startDate: string,
    endDate: string,
    metrics: string[],
    userId: string
  ): Promise<PerformanceReport | null> {
    return this.generatePerformanceReport(locationId, 'custom', startDate, endDate, userId);
  }

  async scheduleAutomaticReports(
    locationId: string,
    reportType: PerformanceReport['report_type'],
    schedule: 'daily' | 'weekly' | 'monthly'
  ): Promise<boolean> {
    try {
      // TODO: Implementar programación de reportes automáticos
      console.log('Scheduling automatic reports:', { locationId, reportType, schedule });
      return true;
    } catch (error) {
      console.error('Error scheduling automatic reports:', error);
      return false;
    }
  }

  async exportReportToExcel(reportId: string): Promise<string | null> {
    try {
      // TODO: Implementar exportación a Excel
      console.log('Exporting report to Excel:', reportId);
      return null;
    } catch (error) {
      console.error('Error exporting report:', error);
      return null;
    }
  }

  async exportReportToPDF(reportId: string): Promise<string | null> {
    try {
      // TODO: Implementar exportación a PDF
      console.log('Exporting report to PDF:', reportId);
      return null;
    } catch (error) {
      console.error('Error exporting report:', error);
      return null;
    }
  }
}

export const performanceReportService = new PerformanceReportService();