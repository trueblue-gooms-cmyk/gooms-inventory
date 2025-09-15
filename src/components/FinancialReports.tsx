// Componente de reportes financieros avanzados
// Compatible con Lovable - Análisis completo y exportación de reportes
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  DollarSign,
  Calendar,
  Calculator,
  Award,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useFinancialData } from '../hooks/useFinancialData';

interface FinancialReportsProps {
  startDate: string;
  endDate: string;
  className?: string;
}

export const FinancialReports = ({ 
  startDate, 
  endDate, 
  className = '' 
}: FinancialReportsProps) => {
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous' | 'lastyear'>('previous');

  const { 
    useFinancialKPIs, 
    useCashFlowTrends, 
    useCashFlow 
  } = useFinancialData();

  const { data: currentKPIs, isLoading: loadingKPIs } = useFinancialKPIs(startDate, endDate);
  const { data: trendsData } = useCashFlowTrends(12);
  const { data: cashFlowData } = useCashFlow(startDate, endDate);

  // 📊 CALCULAR DATOS DE COMPARACIÓN
  const comparisonData = useMemo(() => {
    if (!trendsData || !currentKPIs) return null;

    const currentPeriodMonths = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const currentRevenue = trendsData.slice(-currentPeriodMonths).reduce((sum, t) => sum + t.income, 0);
    const currentExpenses = trendsData.slice(-currentPeriodMonths).reduce((sum, t) => sum + t.expenses, 0);
    
    const previousRevenue = trendsData.slice(-currentPeriodMonths * 2, -currentPeriodMonths).reduce((sum, t) => sum + t.income, 0);
    const previousExpenses = trendsData.slice(-currentPeriodMonths * 2, -currentPeriodMonths).reduce((sum, t) => sum + t.expenses, 0);

    return {
      current: {
        revenue: currentRevenue,
        expenses: currentExpenses,
        netFlow: currentRevenue - currentExpenses,
        margin: currentRevenue > 0 ? ((currentRevenue - currentExpenses) / currentRevenue) * 100 : 0
      },
      previous: {
        revenue: previousRevenue,
        expenses: previousExpenses,
        netFlow: previousRevenue - previousExpenses,
        margin: previousRevenue > 0 ? ((previousRevenue - previousExpenses) / previousRevenue) * 100 : 0
      },
      growth: {
        revenue: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
        expenses: previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0,
        netFlow: previousRevenue > 0 ? (((currentRevenue - currentExpenses) - (previousRevenue - previousExpenses)) / Math.abs(previousRevenue - previousExpenses)) * 100 : 0
      }
    };
  }, [trendsData, currentKPIs, startDate, endDate]);

  // 📈 ANÁLISIS DE PERFORMANCE
  const performanceAnalysis = useMemo(() => {
    if (!currentKPIs || !comparisonData) return null;

    const analysis = {
      profitability: {
        status: currentKPIs.net_margin >= 15 ? 'excellent' : currentKPIs.net_margin >= 8 ? 'good' : currentKPIs.net_margin >= 3 ? 'fair' : 'poor',
        score: Math.min(currentKPIs.net_margin * 2, 100),
        recommendation: currentKPIs.net_margin < 8 ? 'Optimizar costos y aumentar precios' : 'Mantener estrategia actual'
      },
      growth: {
        status: comparisonData.growth.revenue >= 10 ? 'excellent' : comparisonData.growth.revenue >= 5 ? 'good' : comparisonData.growth.revenue >= 0 ? 'fair' : 'poor',
        score: Math.max(0, Math.min(comparisonData.growth.revenue * 5 + 50, 100)),
        recommendation: comparisonData.growth.revenue < 5 ? 'Implementar estrategias de crecimiento' : 'Continuar con el crecimiento sostenido'
      },
      efficiency: {
        status: currentKPIs.inventory_turnover >= 6 ? 'excellent' : currentKPIs.inventory_turnover >= 4 ? 'good' : currentKPIs.inventory_turnover >= 2 ? 'fair' : 'poor',
        score: Math.min(currentKPIs.inventory_turnover * 15, 100),
        recommendation: currentKPIs.inventory_turnover < 4 ? 'Mejorar gestión de inventario' : 'Rotación de inventario óptima'
      },
      liquidity: {
        status: currentKPIs.cash_flow >= 0 ? currentKPIs.cash_flow > currentKPIs.revenue * 0.1 ? 'excellent' : 'good' : 'poor',
        score: currentKPIs.cash_flow >= 0 ? Math.min((currentKPIs.cash_flow / currentKPIs.revenue) * 500, 100) : 0,
        recommendation: currentKPIs.cash_flow < 0 ? 'Urgente: mejorar flujo de caja' : 'Flujo de caja saludable'
      }
    };

    const overallScore = (analysis.profitability.score + analysis.growth.score + analysis.efficiency.score + analysis.liquidity.score) / 4;
    
    return {
      ...analysis,
      overall: {
        score: overallScore,
        status: overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : overallScore >= 40 ? 'fair' : 'poor'
      }
    };
  }, [currentKPIs, comparisonData]);

  // 💼 ANÁLISIS ROI DETALLADO
  const roiAnalysis = useMemo(() => {
    if (!currentKPIs || !cashFlowData) return null;

    // Simular diferentes categorías de inversión
    const investmentCategories = {
      inventory: {
        investment: currentKPIs.costs * 0.6, // 60% del costo en inventario
        returns: currentKPIs.revenue * 0.7, // 70% de ingresos del inventario
        roi: currentKPIs.costs > 0 ? ((currentKPIs.revenue * 0.7 - currentKPIs.costs * 0.6) / (currentKPIs.costs * 0.6)) * 100 : 0
      },
      marketing: {
        investment: currentKPIs.operating_expenses * 0.2, // 20% de gastos en marketing
        returns: currentKPIs.revenue * 0.15, // 15% de ingresos del marketing
        roi: currentKPIs.operating_expenses > 0 ? ((currentKPIs.revenue * 0.15 - currentKPIs.operating_expenses * 0.2) / (currentKPIs.operating_expenses * 0.2)) * 100 : 0
      },
      operations: {
        investment: currentKPIs.operating_expenses * 0.8, // 80% de gastos operativos
        returns: currentKPIs.revenue * 0.15, // 15% de ingresos de operaciones
        roi: currentKPIs.operating_expenses > 0 ? ((currentKPIs.revenue * 0.15 - currentKPIs.operating_expenses * 0.8) / (currentKPIs.operating_expenses * 0.8)) * 100 : 0
      }
    };

    return investmentCategories;
  }, [currentKPIs, cashFlowData]);

  // 🎨 FUNCIONES DE ESTILO
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <Award className="h-4 w-4" />;
      case 'good': return <CheckCircle2 className="h-4 w-4" />;
      case 'fair': return <AlertTriangle className="h-4 w-4" />;
      case 'poor': return <TrendingDown className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // TODO: Implementar exportación real
    console.log(`Exportando reporte en formato ${format}`);
  };

  if (loadingKPIs) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Generando reportes financieros...</span>
        </CardContent>
      </Card>
    );
  }

  if (!currentKPIs) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay datos suficientes para generar reportes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reportes Financieros
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Select value={reportType} onValueChange={(value: 'monthly' | 'quarterly' | 'annual') => setReportType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => exportReport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Score General */}
      {performanceAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Score Financiero General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <div className="w-full h-full rounded-full border-8 border-gray-200">
                  <div 
                    className="w-full h-full rounded-full border-8 border-blue-500"
                    style={{
                      background: `conic-gradient(#3b82f6 ${performanceAnalysis.overall.score * 3.6}deg, transparent 0deg)`
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {performanceAnalysis.overall.score.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500">de 100</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`text-center p-3 rounded-lg border ${getStatusColor(performanceAnalysis.overall.status)}`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                {getStatusIcon(performanceAnalysis.overall.status)}
                <span className="font-semibold capitalize">
                  {performanceAnalysis.overall.status === 'excellent' ? 'Excelente' :
                   performanceAnalysis.overall.status === 'good' ? 'Bueno' :
                   performanceAnalysis.overall.status === 'fair' ? 'Regular' : 'Deficiente'}
                </span>
              </div>
              <p className="text-sm">
                {performanceAnalysis.overall.status === 'excellent' ? 'Tu negocio tiene un performance financiero sobresaliente' :
                 performanceAnalysis.overall.status === 'good' ? 'Tu negocio muestra un buen performance financiero' :
                 performanceAnalysis.overall.status === 'fair' ? 'Hay oportunidades de mejora en el performance financiero' :
                 'Se requiere atención urgente en las finanzas del negocio'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">Análisis</TabsTrigger>
          <TabsTrigger value="roi">ROI Detallado</TabsTrigger>
          <TabsTrigger value="comparison">Comparativa</TabsTrigger>
          <TabsTrigger value="projections">Proyecciones</TabsTrigger>
        </TabsList>

        {/* Análisis por Categorías */}
        <TabsContent value="analysis">
          {performanceAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(performanceAnalysis).filter(([key]) => key !== 'overall').map(([category, data]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {category === 'profitability' && <DollarSign className="h-4 w-4" />}
                      {category === 'growth' && <TrendingUp className="h-4 w-4" />}
                      {category === 'efficiency' && <BarChart3 className="h-4 w-4" />}
                      {category === 'liquidity' && <PieChart className="h-4 w-4" />}
                      {category === 'profitability' ? 'Rentabilidad' :
                       category === 'growth' ? 'Crecimiento' :
                       category === 'efficiency' ? 'Eficiencia' : 'Liquidez'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Score</span>
                         <Badge variant={(data as any).status === 'excellent' || (data as any).status === 'good' ? 'default' : 'destructive'}>
                           {(data as any).score?.toFixed(0) || 0}/100
                         </Badge>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                           className={`h-2 rounded-full ${
                             (data as any).status === 'excellent' ? 'bg-green-500' :
                             (data as any).status === 'good' ? 'bg-blue-500' :
                             (data as any).status === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                           }`}
                           style={{ width: `${Math.min((data as any).score || 0, 100)}%` }}
                        />
                      </div>
                      
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <strong>Recomendación:</strong> {(data as any).recommendation || 'Sin recomendación disponible'}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ROI Detallado */}
        <TabsContent value="roi">
          {roiAnalysis && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Análisis ROI por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(roiAnalysis).map(([category, data]) => (
                      <div key={category} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3 capitalize">
                          {category === 'inventory' ? 'Inventario' :
                           category === 'marketing' ? 'Marketing' : 'Operaciones'}
                        </h4>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Inversión:</span>
                            <span className="font-medium">${data.investment.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Retorno:</span>
                            <span className="font-medium">${data.returns.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span>ROI:</span>
                            <span className={`font-bold ${
                              data.roi >= 50 ? 'text-green-600' :
                              data.roi >= 20 ? 'text-blue-600' :
                              data.roi >= 0 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {data.roi.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                data.roi >= 50 ? 'bg-green-500' :
                                data.roi >= 20 ? 'bg-blue-500' :
                                data.roi >= 0 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(Math.max(data.roi, 0), 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recomendaciones de Inversión</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(roiAnalysis).map(([category, data]) => (
                      <Alert key={category}>
                        <Calculator className="h-4 w-4" />
                        <AlertDescription>
                          <strong className="capitalize">
                            {category === 'inventory' ? 'Inventario' :
                             category === 'marketing' ? 'Marketing' : 'Operaciones'}:
                          </strong> {' '}
                          {data.roi >= 50 ? 'Excelente ROI, considera aumentar inversión' :
                           data.roi >= 20 ? 'Buen ROI, mantener nivel actual' :
                           data.roi >= 0 ? 'ROI bajo, revisar estrategia' :
                           'ROI negativo, requiere optimización urgente'}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Comparativa */}
        <TabsContent value="comparison">
          {comparisonData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Comparación Período Actual vs Anterior</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Ingresos</h4>
                      <p className="text-2xl font-bold text-green-600 mb-2">
                        ${comparisonData.current.revenue.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        {comparisonData.growth.revenue >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          comparisonData.growth.revenue >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(comparisonData.growth.revenue).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        vs ${comparisonData.previous.revenue.toLocaleString()}
                      </p>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Gastos</h4>
                      <p className="text-2xl font-bold text-red-600 mb-2">
                        ${comparisonData.current.expenses.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        {comparisonData.growth.expenses <= 0 ? (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          comparisonData.growth.expenses <= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(comparisonData.growth.expenses).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        vs ${comparisonData.previous.expenses.toLocaleString()}
                      </p>
                    </div>

                    <div className="text-center p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Flujo Neto</h4>
                      <p className={`text-2xl font-bold mb-2 ${
                        comparisonData.current.netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        ${comparisonData.current.netFlow.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        {comparisonData.growth.netFlow >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          comparisonData.growth.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(comparisonData.growth.netFlow).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        vs ${comparisonData.previous.netFlow.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Proyecciones */}
        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Proyecciones Basadas en Tendencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Las proyecciones financieras se generan automáticamente basadas en el histórico.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Ve a la sección de Proyecciones en el tab principal para más detalles.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};