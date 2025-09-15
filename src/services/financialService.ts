// Servicio financiero para Gooms Inventory
// Compatible con Lovable - Gestión completa de finanzas y flujo de caja
import { supabase } from '../integrations/supabase/client';

export interface CashFlowEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  amount: number;
  description: string;
  reference_type?: 'sale' | 'purchase' | 'inventory' | 'operational' | 'other';
  reference_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CashFlowProjection {
  period: string;
  income_projected: number;
  expenses_projected: number;
  net_flow_projected: number;
  income_actual?: number;
  expenses_actual?: number;
  net_flow_actual?: number;
  variance?: number;
}

export interface FinancialKPI {
  period: string;
  revenue: number;
  costs: number;
  gross_profit: number;
  gross_margin: number;
  operating_expenses: number;
  net_profit: number;
  net_margin: number;
  inventory_turnover: number;
  cash_flow: number;
  roi: number;
}

export interface PayableAccount {
  id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  amount_pending: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  payment_terms: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

class FinancialService {
  
  // 💰 FLUJO DE CAJA
  async getCashFlowEntries(startDate: string, endDate: string): Promise<CashFlowEntry[]> {
    try {
      const { data, error } = await supabase
        .from('cash_flow_entries')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo entradas de flujo de caja:', error);
      return [];
    }
  }

  async createCashFlowEntry(entry: Omit<CashFlowEntry, 'id' | 'created_at' | 'updated_at'>): Promise<CashFlowEntry | null> {
    try {
      const { data, error } = await supabase
        .from('cash_flow_entries')
        .insert([entry])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creando entrada de flujo de caja:', error);
      return null;
    }
  }

  async updateCashFlowEntry(id: string, updates: Partial<CashFlowEntry>): Promise<CashFlowEntry | null> {
    try {
      const { data, error } = await supabase
        .from('cash_flow_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando entrada de flujo de caja:', error);
      return null;
    }
  }

  async deleteCashFlowEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cash_flow_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando entrada de flujo de caja:', error);
      return false;
    }
  }

  // 📊 PROYECCIONES DE FLUJO DE CAJA
  async getCashFlowProjections(year: number): Promise<CashFlowProjection[]> {
    try {
      const { data, error } = await supabase
        .from('cash_flow_projections')
        .select('*')
        .like('period', `${year}%`)
        .order('period');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo proyecciones de flujo de caja:', error);
      return [];
    }
  }

  async updateCashFlowProjection(period: string, projection: Partial<CashFlowProjection>): Promise<CashFlowProjection | null> {
    try {
      const { data, error } = await supabase
        .from('cash_flow_projections')
        .upsert([{ period, ...projection }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando proyección de flujo de caja:', error);
      return null;
    }
  }

  // 📈 CÁLCULO DE PROYECCIONES AUTOMÁTICAS
  async generateCashFlowProjections(year: number): Promise<CashFlowProjection[]> {
    try {
      // Obtener datos históricos de los últimos 12 meses
      const endDate = new Date(year, 0, 1);
      const startDate = new Date(year - 1, 0, 1);
      
      const historicalData = await this.getCashFlowEntries(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Analizar patrones estacionales y tendencias
      const monthlyData = this.analyzeMonthlyPatterns(historicalData);
      
      // Generar proyecciones para cada mes del año
      const projections: CashFlowProjection[] = [];
      
      for (let month = 0; month < 12; month++) {
        const period = `${year}-${String(month + 1).padStart(2, '0')}`;
        const baseMonth = month % 12;
        
        // Aplicar factores de crecimiento y estacionalidad
        const seasonalFactor = monthlyData[baseMonth]?.seasonalFactor || 1;
        const growthFactor = 1.05; // 5% de crecimiento anual por defecto
        
        const incomeProjected = (monthlyData[baseMonth]?.avgIncome || 0) * seasonalFactor * growthFactor;
        const expensesProjected = (monthlyData[baseMonth]?.avgExpenses || 0) * seasonalFactor * growthFactor;
        
        projections.push({
          period,
          income_projected: Math.round(incomeProjected),
          expenses_projected: Math.round(expensesProjected),
          net_flow_projected: Math.round(incomeProjected - expensesProjected)
        });
      }

      // Guardar proyecciones en la base de datos
      for (const projection of projections) {
        await this.updateCashFlowProjection(projection.period, projection);
      }

      return projections;
    } catch (error) {
      console.error('Error generando proyecciones de flujo de caja:', error);
      return [];
    }
  }

  private analyzeMonthlyPatterns(data: CashFlowEntry[]) {
    const monthlyStats: Array<{
      month: number;
      avgIncome: number;
      avgExpenses: number;
      seasonalFactor: number;
    }> = [];

    for (let month = 0; month < 12; month++) {
      const monthData = data.filter(entry => new Date(entry.date).getMonth() === month);
      
      const income = monthData
        .filter(entry => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0);
        
      const expenses = monthData
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Calcular factor estacional basado en la media anual
      const avgIncome = income / (monthData.length > 0 ? 1 : 1);
      const avgExpenses = expenses / (monthData.length > 0 ? 1 : 1);
      
      monthlyStats.push({
        month,
        avgIncome,
        avgExpenses,
        seasonalFactor: 1 // Simplificado, en producción sería más complejo
      });
    }

    return monthlyStats;
  }

  // 💳 CUENTAS POR PAGAR
  async getPayableAccounts(filters?: {
    status?: string;
    overdue?: boolean;
    supplierId?: string;
  }): Promise<PayableAccount[]> {
    try {
      let query = supabase
        .from('payable_accounts')
        .select(`
          *,
          supplier:suppliers(name, email, phone)
        `)
        .order('due_date');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.overdue) {
        query = query.lt('due_date', new Date().toISOString().split('T')[0]);
      }

      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo cuentas por pagar:', error);
      return [];
    }
  }

  async createPayableAccount(account: Omit<PayableAccount, 'id' | 'created_at' | 'updated_at'>): Promise<PayableAccount | null> {
    try {
      // Calcular estado basado en fechas
      const today = new Date();
      const dueDate = new Date(account.due_date);
      let status = account.status;

      if (account.amount_paid >= account.amount) {
        status = 'paid';
      } else if (account.amount_paid > 0) {
        status = 'partial';
      } else if (dueDate < today) {
        status = 'overdue';
      } else {
        status = 'pending';
      }

      const { data, error } = await supabase
        .from('payable_accounts')
        .insert([{ ...account, status }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creando cuenta por pagar:', error);
      return null;
    }
  }

  async updatePayableAccount(id: string, updates: Partial<PayableAccount>): Promise<PayableAccount | null> {
    try {
      const { data, error } = await supabase
        .from('payable_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando cuenta por pagar:', error);
      return null;
    }
  }

  async markPayment(id: string, paymentAmount: number, paymentDate: string): Promise<PayableAccount | null> {
    try {
      // Obtener cuenta actual
      const { data: currentAccount, error: fetchError } = await supabase
        .from('payable_accounts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newAmountPaid = currentAccount.amount_paid + paymentAmount;
      const newAmountPending = currentAccount.amount - newAmountPaid;
      
      let newStatus: PayableAccount['status'] = 'pending';
      if (newAmountPending <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      // Registrar pago en flujo de caja
      await this.createCashFlowEntry({
        date: paymentDate,
        type: 'expense',
        category: 'Proveedores',
        subcategory: currentAccount.supplier_name,
        amount: paymentAmount,
        description: `Pago factura ${currentAccount.invoice_number}`,
        reference_type: 'purchase',
        reference_id: id
      });

      // Actualizar cuenta
      return await this.updatePayableAccount(id, {
        amount_paid: newAmountPaid,
        amount_pending: newAmountPending,
        status: newStatus
      });
    } catch (error) {
      console.error('Error registrando pago:', error);
      return null;
    }
  }

  // 📊 KPIs FINANCIEROS
  async calculateFinancialKPIs(startDate: string, endDate: string): Promise<FinancialKPI | null> {
    try {
      // Obtener datos de flujo de caja
      const cashFlowData = await this.getCashFlowEntries(startDate, endDate);
      
      // Obtener datos de inventario para cálculos
      const { data: inventoryData } = await supabase
        .from('inventory_movements')
        .select('*, product:products(cost, price)')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Calcular métricas básicas
      const revenue = cashFlowData
        .filter(entry => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0);

      const totalExpenses = cashFlowData
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Separar costos operacionales de costos de productos
      const operatingExpenses = cashFlowData
        .filter(entry => 
          entry.type === 'expense' && 
          entry.category !== 'Costo de Ventas' &&
          entry.category !== 'Proveedores'
        )
        .reduce((sum, entry) => sum + entry.amount, 0);

      const costs = totalExpenses - operatingExpenses;

      // Calcular métricas derivadas
      const grossProfit = revenue - costs;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const netProfit = grossProfit - operatingExpenses;
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      const cashFlow = revenue - totalExpenses;

      // Calcular rotación de inventario (simplificado)
      const inventoryTurnover = this.calculateInventoryTurnover(inventoryData || []);

      // Calcular ROI (simplificado)
      const roi = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        period: `${startDate} - ${endDate}`,
        revenue,
        costs,
        gross_profit: grossProfit,
        gross_margin: grossMargin,
        operating_expenses: operatingExpenses,
        net_profit: netProfit,
        net_margin: netMargin,
        inventory_turnover: inventoryTurnover,
        cash_flow: cashFlow,
        roi
      };
    } catch (error) {
      console.error('Error calculando KPIs financieros:', error);
      return null;
    }
  }

  private calculateInventoryTurnover(movements: Record<string, unknown>[]): number {
    // Simplificado: calcular basado en movimientos de salida
    const salesMovements = movements.filter(m => m.movement_type === 'salida');
    const totalCost = salesMovements.reduce((sum, m) => 
      sum + (m.quantity * (m.product?.cost || 0)), 0
    );
    
    // En un cálculo real, se necesitaría el inventario promedio
    // Por ahora retornamos un cálculo simplificado
    return totalCost > 0 ? salesMovements.length / 12 : 0; // Rotaciones por mes
  }

  // 📈 ANÁLISIS DE TENDENCIAS
  async getCashFlowTrends(months: number = 12): Promise<{
    period: string;
    income: number;
    expenses: number;
    netFlow: number;
    trend: 'up' | 'down' | 'stable';
  }[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const data = await this.getCashFlowEntries(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Agrupar por mes
      const monthlyData: Record<string, { income: number; expenses: number }> = {};
      
      data.forEach(entry => {
        const month = entry.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expenses: 0 };
        }
        
        if (entry.type === 'income') {
          monthlyData[month].income += entry.amount;
        } else {
          monthlyData[month].expenses += entry.amount;
        }
      });

      // Convertir a array y calcular tendencias
      const trends = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, data], index, array) => {
          const netFlow = data.income - data.expenses;
          let trend: 'up' | 'down' | 'stable' = 'stable';
          
          if (index > 0) {
            const prevNetFlow = array[index - 1][1].income - array[index - 1][1].expenses;
            const change = ((netFlow - prevNetFlow) / Math.abs(prevNetFlow || 1)) * 100;
            
            if (change > 5) trend = 'up';
            else if (change < -5) trend = 'down';
          }

          return {
            period,
            income: data.income,
            expenses: data.expenses,
            netFlow,
            trend
          };
        });

      return trends;
    } catch (error) {
      console.error('Error obteniendo tendencias de flujo de caja:', error);
      return [];
    }
  }
}

// Exportar instancia singleton
export const financialService = new FinancialService();