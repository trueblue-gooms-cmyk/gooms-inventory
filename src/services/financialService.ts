// Mock Financial Service - since cash_flow_entries table doesn't exist
export interface CashFlowEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  reference_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PayableAccount {
  id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  amount_paid: number;
  amount_pending: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  priority: 'low' | 'medium' | 'high' | 'critical';
  payment_terms: string;
  notes?: string;
  created_at: string;
}

export interface CashFlowProjection {
  date: string;
  period: string;
  projected_income: number;
  projected_expenses: number;
  net_flow: number;
  income_projected: number;
  expenses_projected: number;
  net_flow_projected: number;
}

export interface FinancialKPI {
  revenue: number;
  expenses: number;
  profit: number;
  profit_margin: number;
  gross_margin: number;
  net_margin: number;
  gross_profit: number;
  net_profit: number;
  roi: number;
  inventory_turnover: number;
  costs: number;
  operating_expenses: number;
  cash_flow: number;
}

// Mock financial service
export const financialService = {
  getCashFlowEntries,
  createCashFlowEntries,
  getCashFlowByDateRange,
  calculateCashFlow,
  getCashFlowProjections,
  getPayableAccounts,
  calculateFinancialKPIs,
  getCashFlowTrends,
  createCashFlowEntry,
  updateCashFlowEntry,
  deleteCashFlowEntry,
  generateCashFlowProjections,
  createPayableAccount,
  markPayment
};

// Mock implementations
export async function getCashFlowEntries(): Promise<CashFlowEntry[]> {
  return [];
}

export async function createCashFlowEntries(entries: Omit<CashFlowEntry, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ data: CashFlowEntry[] | null; error: Error | null }> {
  return { data: [], error: null };
}

export async function getCashFlowByDateRange(startDate: Date, endDate: Date): Promise<CashFlowEntry[]> {
  return [];
}

export async function calculateCashFlow(startDate: Date, endDate: Date): Promise<{
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  entries: CashFlowEntry[];
}> {
  return {
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    entries: []
  };
}

export async function getCashFlowProjections(year: number): Promise<CashFlowProjection[]> {
  return [];
}

export async function getPayableAccounts(filters?: any): Promise<PayableAccount[]> {
  return [];
}

export async function calculateFinancialKPIs(startDate: string, endDate: string): Promise<FinancialKPI> {
  return {
    revenue: 0,
    expenses: 0,
    profit: 0,
    profit_margin: 0,
    gross_margin: 0,
    net_margin: 0,
    gross_profit: 0,
    net_profit: 0,
    roi: 0,
    inventory_turnover: 0,
    costs: 0,
    operating_expenses: 0,
    cash_flow: 0
  };
}

export async function getCashFlowTrends(months: number): Promise<any[]> {
  return [];
}

export async function createCashFlowEntry(entry: Omit<CashFlowEntry, 'id' | 'created_at' | 'updated_at'>): Promise<CashFlowEntry | null> {
  return null;
}

export async function updateCashFlowEntry(id: string, updates: Partial<CashFlowEntry>): Promise<CashFlowEntry | null> {
  return null;
}

export async function deleteCashFlowEntry(id: string): Promise<boolean> {
  return false;
}

export async function generateCashFlowProjections(year: number): Promise<CashFlowProjection[]> {
  return [];
}

export async function createPayableAccount(account: Omit<PayableAccount, 'id' | 'created_at'>): Promise<PayableAccount | null> {
  return null;
}

export async function markPayment(id: string, amount: number, date: string): Promise<PayableAccount | null> {
  return null;
}