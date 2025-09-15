// Mock Performance Report Service - since performance_reports table doesn't exist
export interface PerformanceReport {
  id: string;
  location_id: string;
  report_type: string;
  report_period_start: string;
  report_period_end: string;
  generated_at: string;
  generated_by: string;
  data: any;
  status: string;
}

export interface ReportSummary {
  totalSales: number;
  totalItems: number;
  averageOrderValue: number;
  salesGrowth: number;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  salesByDay: Array<{
    date: string;
    amount: number;
    items: number;
  }>;
  salesByHour: Array<{
    hour: number;
    amount: number;
    count: number;
  }>;
}

class PerformanceReportService {
  // Mock implementation
  async generateReport(
    locationId: string,
    reportType: string,
    startDate: string,
    endDate: string,
    userId: string
  ): Promise<PerformanceReport | null> {
    try {
      console.log('Generating mock performance report...', { locationId, reportType, startDate, endDate });

      // Mock report data
      const mockData: ReportSummary = {
        totalSales: 0,
        totalItems: 0,
        averageOrderValue: 0,
        salesGrowth: 0,
        topProducts: [],
        salesByDay: [],
        salesByHour: []
      };

      // Mock report
      const mockReport: PerformanceReport = {
        id: crypto.randomUUID(),
        location_id: locationId,
        report_type: reportType,
        report_period_start: startDate,
        report_period_end: endDate,
        generated_at: new Date().toISOString(),
        generated_by: userId,
        data: mockData,
        status: 'completed'
      };

      console.log('Mock performance report generated successfully');
      return mockReport;
    } catch (error) {
      console.error('Error generating mock performance report:', error);
      return null;
    }
  }

  async getReportsByLocation(locationId: string): Promise<PerformanceReport[]> {
    // Return empty array as mock
    return [];
  }

  async getReportById(reportId: string): Promise<PerformanceReport | null> {
    // Return null as mock
    return null;
  }

  async deleteReport(reportId: string): Promise<boolean> {
    // Return true as mock
    return true;
  }

  async getReportSummary(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<ReportSummary> {
    try {
      console.log('Generating mock report summary...', { locationId, startDate, endDate });

      // Mock summary
      return {
        totalSales: 0,
        totalItems: 0,
        averageOrderValue: 0,
        salesGrowth: 0,
        topProducts: [],
        salesByDay: [],
        salesByHour: []
      };
    } catch (error) {
      console.error('Error generating mock report summary:', error);
      return {
        totalSales: 0,
        totalItems: 0,
        averageOrderValue: 0,
        salesGrowth: 0,
        topProducts: [],
        salesByDay: [],
        salesByHour: []
      };
    }
  }

  async scheduleAutomaticReport(
    locationId: string,
    reportType: string,
    frequency: 'daily' | 'weekly' | 'monthly'
  ): Promise<boolean> {
    console.log('Mock scheduling automatic report:', { locationId, reportType, frequency });
    return true;
  }

  async getScheduledReports(): Promise<any[]> {
    // Return empty array as mock
    return [];
  }

  async cancelScheduledReport(scheduleId: string): Promise<boolean> {
    console.log('Mock canceling scheduled report:', scheduleId);
    return true;
  }

  async exportReportToPDF(reportId: string): Promise<Blob | null> {
    console.log('Mock exporting report to PDF:', reportId);
    return null;
  }

  async exportReportToExcel(reportId: string): Promise<Blob | null> {
    console.log('Mock exporting report to Excel:', reportId);
    return null;
  }

  async getPerformanceMetrics(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    console.log('Mock getting performance metrics:', { locationId, startDate, endDate });
    return {
      efficiency: 0,
      productivity: 0,
      qualityScore: 0,
      customerSatisfaction: 0,
      trends: {
        efficiency: [],
        productivity: [],
        quality: []
      }
    };
  }

  async compareLocations(
    locationIds: string[],
    startDate: string,
    endDate: string
  ): Promise<any> {
    console.log('Mock comparing locations:', { locationIds, startDate, endDate });
    return {
      comparison: [],
      insights: [],
      recommendations: []
    };
  }

  async getRealtimeMetrics(locationId: string): Promise<any> {
    console.log('Mock getting realtime metrics:', locationId);
    return {
      currentSales: 0,
      activeSessions: 0,
      averageSessionTime: 0,
      conversionRate: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

export const performanceReportService = new PerformanceReportService();