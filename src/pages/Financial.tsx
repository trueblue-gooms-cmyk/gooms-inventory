// Página principal del módulo financiero
// Compatible con Lovable - Dashboard financiero completo
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  FileText, 
  AlertTriangle,
  Calendar,
  RefreshCw,
  BarChart3,
  CreditCard,
  Target,
  Download
} from 'lucide-react';
import { useFinancialData } from '../hooks/useFinancialData';
import { CashFlowChart } from '../components/CashFlowChart';
import { MobileOptimizedTable } from '../components/MobileOptimizedTable';
import { FinancialKPIDashboard } from '../components/FinancialKPIDashboard';
import { PayableAccountsManager } from '../components/PayableAccountsManager';
import { FinancialReports } from '../components/FinancialReports';

export const Financial = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Inicio del año
    end: new Date().toISOString().split('T')[0] // Hoy
  });

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newEntryType, setNewEntryType] = useState<'income' | 'expense'>('income');

  const {
    useCashFlow,
    useFinancialKPIs,
    usePayableAccounts,
    useCashFlowProjections,
    createCashFlowEntry,
    generateProjections,
    markPayment,
    calculateTotals,
    getOverdueAccounts,
    calculatePayablesTotal
  } = useFinancialData({ autoRefresh: true });

  // 📊 DATOS
  const { data: cashFlowData, isLoading: loadingCashFlow } = useCashFlow(dateRange.start, dateRange.end);
  const { data: kpiData, isLoading: loadingKPIs } = useFinancialKPIs(dateRange.start, dateRange.end);
  const { data: payableData, isLoading: loadingPayables } = usePayableAccounts();
  const { data: projectionsData } = useCashFlowProjections(selectedYear);

  // 📊 CÁLCULOS
  const totals = cashFlowData ? calculateTotals(cashFlowData) : null;
  const overdueAccounts = payableData ? getOverdueAccounts(payableData) : [];
  const totalPayables = payableData ? calculatePayablesTotal(payableData) : 0;

  // 🆕 NUEVA ENTRADA
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    description: ''
  });

  const handleCreateEntry = async () => {
    if (!newEntry.category || !newEntry.amount || !newEntry.description) return;

    await createCashFlowEntry.mutateAsync({
      date: newEntry.date,
      type: newEntry.type,
      category: newEntry.category,
      amount: parseFloat(newEntry.amount),
      description: newEntry.description
    });

    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      type: 'income',
      category: '',
      amount: '',
      description: ''
    });
    setShowNewEntry(false);
  };

  // 🔄 GENERAR PROYECCIONES
  const handleGenerateProjections = async () => {
    await generateProjections.mutateAsync(selectedYear);
  };

  // 📋 COLUMNAS PARA TABLA DE FLUJO DE CAJA
  const cashFlowColumns = [
    {
      key: 'date',
      label: 'Fecha',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('es-ES')
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (value: string) => (
        <Badge variant={value === 'income' ? 'default' : 'secondary'}>
          {value === 'income' ? 'Ingreso' : 'Gasto'}
        </Badge>
      )
    },
    {
      key: 'category',
      label: 'Categoría',
      sortable: true
    },
    {
      key: 'amount',
      label: 'Monto',
      sortable: true,
      render: (value: number, row: unknown) => (
        <span className={(row as any).type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          ${value.toLocaleString()}
        </span>
      )
    },
    {
      key: 'description',
      label: 'Descripción',
      mobileHidden: true
    }
  ];

  // 📋 COLUMNAS PARA TABLA DE CUENTAS POR PAGAR
  const payableColumns = [
    {
      key: 'supplier_name',
      label: 'Proveedor',
      sortable: true
    },
    {
      key: 'invoice_number',
      label: 'Factura',
      sortable: true
    },
    {
      key: 'due_date',
      label: 'Vencimiento',
      sortable: true,
      render: (value: string) => {
        const date = new Date(value);
        const isOverdue = date < new Date();
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {date.toLocaleDateString('es-ES')}
          </span>
        );
      }
    },
    {
      key: 'amount_pending',
      label: 'Pendiente',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">${value.toLocaleString()}</span>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => {
        const variants = {
          pending: 'secondary',
          partial: 'default',
          paid: 'default',
          overdue: 'destructive'
        } as const;
        
        const labels = {
          pending: 'Pendiente',
          partial: 'Parcial',
          paid: 'Pagado',
          overdue: 'Vencido'
        };

        return (
          <Badge variant={variants[value as keyof typeof variants]}>
            {labels[value as keyof typeof labels]}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finanzas</h1>
          <p className="text-gray-600">Gestión financiera y flujo de caja</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowNewEntry(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Nueva Entrada
          </Button>
          
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">
                  ${totals?.income.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gastos</p>
                <p className="text-2xl font-bold text-red-600">
                  ${totals?.expenses.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Flujo Neto</p>
                <p className={`text-2xl font-bold ${
                  (totals?.netFlow || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  ${totals?.netFlow.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Por Pagar</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${totalPayables.toLocaleString()}
                </p>
                {overdueAccounts.length > 0 && (
                  <p className="text-xs text-red-600">
                    {overdueAccounts.length} vencidas
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="start-date">Fecha inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Fecha fin</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="projection-year">Año proyecciones</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de flujo de caja */}
      <CashFlowChart
        startDate={dateRange.start}
        endDate={dateRange.end}
        showProjections={true}
      />

      {/* Dashboard de KPIs */}
      <FinancialKPIDashboard
        startDate={dateRange.start}
        endDate={dateRange.end}
        showComparison={true}
      />

      {/* Tabs principales */}
      <Tabs defaultValue="cashflow" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cashflow">Flujo de Caja</TabsTrigger>
          <TabsTrigger value="payables">Por Pagar</TabsTrigger>
          <TabsTrigger value="projections">Proyecciones</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        {/* Flujo de Caja */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Entradas de Flujo de Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cashFlowData && (
                <MobileOptimizedTable
                  data={cashFlowData as any}
                  columns={cashFlowColumns}
                  searchable
                  pagination
                  pageSize={10}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cuentas por Pagar */}
        <TabsContent value="payables">
          <PayableAccountsManager />
        </TabsContent>

        {/* Proyecciones */}
        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Proyecciones {selectedYear}
                </CardTitle>
                <Button 
                  onClick={handleGenerateProjections}
                  disabled={generateProjections.isPending}
                  variant="outline"
                >
                  {generateProjections.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Generar Automático
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projectionsData && projectionsData.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectionsData.slice(0, 6).map(projection => (
                      <Card key={projection.period} className="p-4">
                        <h4 className="font-medium mb-2">
                          {new Date(projection.period + '-01').toLocaleDateString('es-ES', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Ingresos:</span>
                            <span className="text-green-600 font-medium">
                              ${projection.income_projected.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gastos:</span>
                            <span className="text-red-600 font-medium">
                              ${projection.expenses_projected.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Neto:</span>
                            <span className={projection.net_flow_projected >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                              ${projection.net_flow_projected.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No hay proyecciones disponibles para {selectedYear}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reportes */}
        <TabsContent value="reports">
          <FinancialReports
            startDate={dateRange.start}
            endDate={dateRange.end}
          />
        </TabsContent>
      </Tabs>

      {/* Modal Nueva Entrada */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Nueva Entrada de Flujo de Caja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="entry-date">Fecha</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="entry-type">Tipo</Label>
                <Select value={newEntry.type} onValueChange={(value: 'income' | 'expense') => 
                  setNewEntry(prev => ({ ...prev, type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="entry-category">Categoría</Label>
                <Input
                  id="entry-category"
                  value={newEntry.category}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ej: Ventas, Proveedores, Marketing..."
                />
              </div>

              <div>
                <Label htmlFor="entry-amount">Monto</Label>
                <Input
                  id="entry-amount"
                  type="number"
                  step="0.01"
                  value={newEntry.amount}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="entry-description">Descripción</Label>
                <Input
                  id="entry-description"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción de la transacción"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateEntry} disabled={createCashFlowEntry.isPending} className="flex-1">
                  {createCashFlowEntry.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PlusCircle className="h-4 w-4 mr-2" />
                  )}
                  Crear
                </Button>
                <Button variant="outline" onClick={() => setShowNewEntry(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};