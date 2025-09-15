// Mock Sales Service - simplified to avoid table conflicts
export interface Sale {
  id: string;
  location_id: string;
  sale_number: string;
  total_amount: number;
  sale_date: string;
  status: 'completed' | 'pending' | 'cancelled';
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface SalesByLocation {
  location_id: string;
  location_name: string;
  total_sales: number;
  total_units: number;
  total_profit: number;
  average_sale: number;
  transaction_count: number;
  top_products: { product_id: string; product_name: string; units_sold: number; revenue: number }[];
  daily_sales: { date: string; sales: number; units: number; transactions: number }[];
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
  best_selling_products: { product_id: string; product_name: string; units_sold: number; revenue: number; profit: number }[];
  hourly_sales: { hour: number; revenue: number; transactions: number }[];
  payment_methods: { method: string; count: number; amount: number; percentage: number }[];
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
  async createSale(_sale: Omit<Sale, 'id' | 'sale_number' | 'created_at'>): Promise<Sale | null> {
    return null;
  }

  async addSaleItems(_saleId: string, _items: Omit<SaleItem, 'id' | 'sale_id'>[]): Promise<SaleItem[]> {
    return [];
  }

  async getSales(_locationId?: string, _startDate?: string, _endDate?: string): Promise<Sale[]> {
    return [];
  }

  async getLocationSalesMetrics(locationId: string, days: number = 30): Promise<LocationSalesMetrics | null> {
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

  async getSalesComparison(_locationId: string, _currentDays: number = 30): Promise<SalesComparison | null> {
    return null;
  }

  async getSalesByLocation(_startDate?: string, _endDate?: string): Promise<SalesByLocation[]> {
    return [];
  }
}

export const salesService = new SalesService();