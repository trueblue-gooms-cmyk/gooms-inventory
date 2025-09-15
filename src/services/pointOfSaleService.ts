// Mock Point of Sale Service - simplified to avoid table conflicts
export interface LocationAlert {
  id: string;
  location_id: string;
  type: 'low_stock' | 'expiry' | 'movement' | 'performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
}

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
}

class PointOfSaleService {
  // Mock implementation to avoid database conflicts
  async getLocationMetrics(locationId: string): Promise<LocationMetrics> {
    console.log('Mock getting location metrics:', locationId);
    return {
      location_id: locationId,
      location_name: 'Mock Location',
      location_type: 'store',
      total_products: 0,
      total_value: 0,
      low_stock_items: 0,
      expiring_items: 0,
      movement_frequency: 0,
      avg_rotation_days: 0,
      performance_score: 0,
      sales_velocity: 0,
      restock_alerts: 0
    };
  }

  async getSalesPerformance(locationId: string, period: string, granularity: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<SalesPerformance> {
    console.log('Mock getting sales performance:', { locationId, period, granularity });
    return {
      location_id: locationId,
      location_name: 'Mock Location',
      period,
      sales_count: 0,
      sales_value: 0,
      top_products: [],
      hourly_distribution: [],
      growth_rate: 0,
      conversion_rate: 0
    };
  }

  async getRestockSuggestions(locationId: string): Promise<RestockSuggestion[]> {
    console.log('Mock getting restock suggestions:', locationId);
    return [];
  }

  async getAllLocationsMetrics(): Promise<LocationMetrics[]> {
    console.log('Mock getting all locations metrics');
    return [];
  }

  async compareLocations(locationIds: string[]): Promise<any> {
    console.log('Mock comparing locations:', locationIds);
    return { comparison: [], insights: [] };
  }

  async getTopPerformingLocations(limit: number = 10): Promise<LocationMetrics[]> {
    console.log('Mock getting top performing locations:', limit);
    return [];
  }

  async getLocationAlerts(locationId: string): Promise<LocationAlert[]> {
    console.log('Mock getting location alerts:', locationId);
    return [];
  }
}

export const pointOfSaleService = new PointOfSaleService();