// Dashboard de KPIs financieros
// Compatible con Lovable - Visualización completa de métricas financieras
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw
} from 'lucide-react';
import { useFinancialData } from '../hooks/useFinancialData';

interface FinancialKPIDashboardProps {
  startDate: string;
  endDate: string;
  className?: string;
  showComparison?: boolean;
}

export const FinancialKPIDashboard = ({ 
  startDate, 
  endDate, 
  className = '',
  showComparison = true
}: FinancialKPIDashboardProps) => {
  const { useFinancialKPIs, useCashFlowTrends } = useFinancialData();
  
  const { data: kpiData, isLoading, error } = useFinancialKPIs(startDate, endDate);
  const { data: trendsData } = useCashFlowTrends(12);

  // 📊 PROCESAR DATOS PARA COMPARACIÓN
  const comparisonData = useMemo(() => {
    if (!showComparison || !trendsData || trendsData.length < 6) return null;

    const currentPeriod = trendsData.slice(-3); // Últimos 3 meses
    const previousPeriod = trendsData.slice(-6, -3); // 3 meses anteriores

    const currentRevenue = currentPeriod.reduce((sum, t) => sum + t.income, 0);
    const previousRevenue = previousPeriod.reduce((sum, t) => sum + t.income, 0);
    
    const currentExpenses = currentPeriod.reduce((sum, t) => sum + t.expenses, 0);
    const previousExpenses = previousPeriod.reduce((sum, t) => sum + t.expenses, 0);

    const revenueGrowth = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
      
    const expenseGrowth = previousExpenses > 0 
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
      : 0;

    return {
      revenueGrowth,
      expenseGrowth,
      currentRevenue,
      previousRevenue,
      currentExpenses,
      previousExpenses
    };
  }, [trendsData, showComparison]);

  // 🎯 DETERMINAR ESTADO DE KPIs
  const getKPIStatus = (value: number, type: 'margin' | 'growth' | 'turnover' | 'ratio') => {
    const thresholds = {
      margin: { good: 20, average: 10 },
      growth: { good: 10, average: 5 },
      turnover: { good: 6, average: 3 },
      ratio: { good: 2, average: 1 }
    };

    const threshold = thresholds[type];
    if (value >= threshold.good) return 'good';
    if (value >= threshold.average) return 'average';
    return 'poor';
  };

  const getStatusColor = (status: 'good' | 'average' | 'poor') => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'average': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: 'good' | 'average' | 'poor') => {
    switch (status) {
      case 'good': return <TrendingUp className="h-4 w-4" />;
      case 'average': return <Minus className="h-4 w-4" />;
      case 'poor': return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Calculando KPIs financieros...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !kpiData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error cargando KPIs</p>
            <p className="text-sm text-gray-500">Verifica que hay datos en el período seleccionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Margen Bruto */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Margen Bruto</span>
              </div>
              {(() => {
                const status = getKPIStatus(kpiData.gross_margin, 'margin');
                return (
                  <div className={`flex items-center gap-1 ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-blue-600">
                {kpiData.gross_margin.toFixed(1)}%
              </p>
              <Progress 
                value={Math.min(kpiData.gross_margin, 100)} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                ${kpiData.gross_profit.toLocaleString()} de utilidad bruta
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Margen Neto */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Margen Neto</span>
              </div>
              {(() => {
                const status = getKPIStatus(kpiData.net_margin, 'margin');
                return (
                  <div className={`flex items-center gap-1 ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-green-600">
                {kpiData.net_margin.toFixed(1)}%
              </p>
              <Progress 
                value={Math.min(Math.max(kpiData.net_margin, 0), 100)} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                ${kpiData.net_profit.toLocaleString()} de utilidad neta
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ROI */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PieChart className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">ROI</span>
              </div>
              {(() => {
                const status = getKPIStatus(kpiData.roi, 'growth');
                return (
                  <div className={`flex items-center gap-1 ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-purple-600">
                {kpiData.roi.toFixed(1)}%
              </p>
              <Progress 
                value={Math.min(Math.max(kpiData.roi, 0), 100)} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                Retorno sobre inversión
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rotación de Inventario */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium text-gray-600">Rotación</span>
              </div>
              {(() => {
                const status = getKPIStatus(kpiData.inventory_turnover, 'turnover');
                return (
                  <div className={`flex items-center gap-1 ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-orange-600">
                {kpiData.inventory_turnover.toFixed(1)}x
              </p>
              <Progress 
                value={Math.min(kpiData.inventory_turnover * 10, 100)} 
                className="h-2"
              />
              <p className="text-xs text-gray-500">
                Veces por período
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Detalladas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen Financiero */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Ingresos Totales</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  ${kpiData.revenue.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Costos de Ventas</span>
                </div>
                <span className="text-lg font-bold text-red-600">
                  ${kpiData.costs.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">Gastos Operativos</span>
                </div>
                <span className="text-lg font-bold text-orange-600">
                  ${kpiData.operating_expenses.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="font-bold">Flujo de Caja Neto</span>
                </div>
                <span className={`text-xl font-bold ${
                  kpiData.cash_flow >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  ${kpiData.cash_flow.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análisis de Tendencias */}
        {comparisonData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Análisis de Tendencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Crecimiento de Ingresos</span>
                    <Badge variant={comparisonData.revenueGrowth >= 0 ? "default" : "destructive"}>
                      {comparisonData.revenueGrowth >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(comparisonData.revenueGrowth).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Actual: ${comparisonData.currentRevenue.toLocaleString()}</p>
                    <p>Anterior: ${comparisonData.previousRevenue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Variación de Gastos</span>
                    <Badge variant={comparisonData.expenseGrowth <= 0 ? "default" : "destructive"}>
                      {comparisonData.expenseGrowth <= 0 ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(comparisonData.expenseGrowth).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Actual: ${comparisonData.currentExpenses.toLocaleString()}</p>
                    <p>Anterior: ${comparisonData.previousExpenses.toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Insights</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    {comparisonData.revenueGrowth > 10 && (
                      <p>✅ Excelente crecimiento de ingresos</p>
                    )}
                    {comparisonData.revenueGrowth < 0 && (
                      <p>⚠️ Disminución en ingresos requiere atención</p>
                    )}
                    {comparisonData.expenseGrowth > comparisonData.revenueGrowth && (
                      <p>⚠️ Los gastos crecen más rápido que los ingresos</p>
                    )}
                    {kpiData.net_margin > 15 && (
                      <p>✅ Margen neto saludable</p>
                    )}
                    {kpiData.inventory_turnover < 2 && (
                      <p>💡 Considerar optimizar rotación de inventario</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráfico de Barras Simple */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativa de Márgenes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Margen Bruto</span>
                <span className="font-medium">{kpiData.gross_margin.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(kpiData.gross_margin, 100)} className="h-3" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Margen Neto</span>
                <span className="font-medium">{kpiData.net_margin.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(Math.max(kpiData.net_margin, 0), 100)} className="h-3" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>ROI</span>
                <span className="font-medium">{kpiData.roi.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(Math.max(kpiData.roi, 0), 100)} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};