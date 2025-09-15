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
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
}

export interface CashFlowProjection {
  date: string;
  projected_income: number;
  projected_expenses: number;
  net_flow: number;
}

export interface FinancialKPI {
  revenue: number;
  expenses: number;
  profit: number;
  profit_margin: number;
}

// Mock financial service
export const financialService = {
  getCashFlowEntries,
  createCashFlowEntries,
  getCashFlowByDateRange,
  calculateCashFlow
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