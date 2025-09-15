// Mock Restock Service - covers all types used by AutoRestockDashboard
export interface RestockOrder {
  id: string;
  product_id: string;
  product_name: string;
  location_id: string;
  quantity_requested: number;
  quantity_approved?: number;
  unit_cost: number;
  total_cost: number;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  approved_by?: string;
  created_at: string;
  updated_at?: string;
  products?: { name: string; sku: string };
}

export interface RestockAlert {
  id: string;
  product_id: string;
  product_name?: string;
  location_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'open' | 'resolved';
  current_stock?: number;
  alert_type?: string;
  recommended_action?: string;
  created_at: string;
}

export interface StockAnalysis {
  total_pending: number;
  total_approved: number;
  total_ordered: number;
  total_received: number;
  critical_alerts: number;
  high_alerts: number;
  avg_lead_time_days: number;
  // Additional fields used in UI
  pendingOrders?: number;
  totalOrders?: number;
  completedOrders?: number;
  totalCost?: number;
  automationRate?: number;
  averageLeadTime?: number;
}

class RestockService {
  async getRestockOrders(locationId?: string): Promise<RestockOrder[]> {
    console.log('Mock getRestockOrders', locationId);
    return [];
  }

  async getRestockAlerts(locationId?: string): Promise<RestockAlert[]> {
    console.log('Mock getRestockAlerts', locationId);
    return [];
  }

  async getRestockStatistics(locationId?: string): Promise<StockAnalysis> {
    console.log('Mock getRestockStatistics', locationId);
    return {
      total_pending: 0,
      total_approved: 0,
      total_ordered: 0,
      total_received: 0,
      critical_alerts: 0,
      high_alerts: 0,
      avg_lead_time_days: 0,
      pendingOrders: 0,
      totalOrders: 0,
      completedOrders: 0,
      totalCost: 0,
      automationRate: 0,
      averageLeadTime: 0,
    };
  }

  async generateAutomaticRestockOrders(): Promise<RestockOrder[]> {
    console.log('Mock generateAutomaticRestockOrders');
    return [];
  }

  async updateRestockOrderStatus(
    orderId: string,
    status: RestockOrder['status'],
    updates?: Partial<RestockOrder>
  ): Promise<boolean> {
    console.log('Mock updateRestockOrderStatus', { orderId, status, updates });
    return true;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    console.log('Mock resolveAlert', alertId);
    return true;
  }
}

export const restockService = new RestockService();