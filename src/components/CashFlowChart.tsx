// Componente de gráfico de flujo de caja
// Compatible con Lovable - Visualización financiera interactiva
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { useFinancialData } from '../hooks/useFinancialData';

interface CashFlowChartProps {
  startDate: string;
  endDate: string;
  showProjections?: boolean;
  className?: string;
}

export const CashFlowChart = ({ 
  startDate, 
  endDate, 
  showProjections = false,
  className = '' 
}: CashFlowChartProps) => {
  const { useCashFlow, useCashFlowTrends, calculateTotals } = useFinancialData();
  
  const { data: cashFlowData, isLoading, error, refetch } = useCashFlow(startDate, endDate);
  const { data: trendsData } = useCashFlowTrends(6); // Últimos 6 meses

  // 📊 PROCESAR DATOS
  const chartData = useMemo(() => {
    if (!cashFlowData) return null;

    const totals = calculateTotals(cashFlowData);
    
    // Agrupar por mes para el gráfico
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    
    cashFlowData.forEach(entry => {
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

    const chartEntries = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        netFlow: data.income - data.expenses
      }));

    return {
      totals,
      monthlyData: chartEntries
    };
  }, [cashFlowData, calculateTotals]);

  // 📈 CALCULAR TENDENCIA GENERAL
  const overallTrend = useMemo(() => {
    if (!trendsData || trendsData.length < 2) return 'stable';
    
    const recent = trendsData.slice(-3); // Últimos 3 meses
    const upward = recent.filter(t => t.trend === 'up').length;
    const downward = recent.filter(t => t.trend === 'down').length;
    
    if (upward > downward) return 'up';
    if (downward > upward) return 'down';
    return 'stable';
  }, [trendsData]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Cargando datos financieros...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Error cargando datos</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No hay datos para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  const { totals, monthlyData } = chartData;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Flujo de Caja
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {overallTrend === 'up' && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                Al alza
              </Badge>
            )}
            {overallTrend === 'down' && (
              <Badge variant="destructive">
                <TrendingDown className="h-3 w-3 mr-1" />
                A la baja
              </Badge>
            )}
            {overallTrend === 'stable' && (
              <Badge variant="secondary">
                Estable
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Resumen de totales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-sm font-medium">Ingresos</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              ${totals.income.toLocaleString()}
            </p>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <ArrowDownRight className="h-4 w-4" />
              <span className="text-sm font-medium">Gastos</span>
            </div>
            <p className="text-2xl font-bold text-red-700">
              ${totals.expenses.toLocaleString()}
            </p>
          </div>
          
          <div className={`text-center p-4 rounded-lg ${
            totals.netFlow >= 0 ? 'bg-blue-50' : 'bg-orange-50'
          }`}>
            <div className={`flex items-center justify-center gap-1 mb-1 ${
              totals.netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'
            }`}>
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Flujo Neto</span>
            </div>
            <p className={`text-2xl font-bold ${
              totals.netFlow >= 0 ? 'text-blue-700' : 'text-orange-700'
            }`}>
              ${totals.netFlow.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Gráfico simple (barras ASCII) */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Flujo por mes</h4>
          
          {monthlyData.length > 0 ? (
            <div className="space-y-2">
              {monthlyData.map(item => {
                const maxAmount = Math.max(
                  Math.max(...monthlyData.map(d => d.income)),
                  Math.max(...monthlyData.map(d => d.expenses))
                );
                
                const incomeWidth = (item.income / maxAmount) * 100;
                const expenseWidth = (item.expenses / maxAmount) * 100;
                
                return (
                  <div key={item.month} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{new Date(item.month + '-01').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</span>
                      <span className={`font-medium ${
                        item.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${item.netFlow.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {/* Barra de ingresos */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16 text-green-600">Ingresos</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${incomeWidth}%` }}
                          />
                        </div>
                        <span className="text-xs w-20 text-right text-green-600">
                          ${item.income.toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Barra de gastos */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16 text-red-600">Gastos</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${expenseWidth}%` }}
                          />
                        </div>
                        <span className="text-xs w-20 text-right text-red-600">
                          ${item.expenses.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No hay datos suficientes para mostrar el gráfico
            </p>
          )}
        </div>

        {/* Estadísticas adicionales */}
        {trendsData && trendsData.length > 0 && (
          <div className="border-t pt-4">
            <h5 className="font-medium text-gray-900 mb-2">Tendencias recientes</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {trendsData.slice(-4).map(trend => (
                <div key={trend.period} className="text-center p-2 border rounded">
                  <div className="font-medium">{trend.period}</div>
                  <div className={`flex items-center justify-center gap-1 mt-1 ${
                    trend.trend === 'up' ? 'text-green-600' : 
                    trend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {trend.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                    {trend.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                    <span className="capitalize">{
                      trend.trend === 'up' ? 'Subida' :
                      trend.trend === 'down' ? 'Bajada' : 'Estable'
                    }</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};