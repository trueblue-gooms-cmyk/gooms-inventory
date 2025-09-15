// Componente gestor de cuentas por pagar
// Compatible con Lovable - Gestión completa de proveedores y pagos
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PlusCircle, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Eye,
  Edit,
  CreditCard,
  FileText,
  X
} from 'lucide-react';
import { useFinancialData } from '../hooks/useFinancialData';
import { MobileOptimizedTable } from './MobileOptimizedTable';
import { type PayableAccount } from '../services/financialService';

interface PayableAccountsManagerProps {
  className?: string;
}

export const PayableAccountsManager = ({ className = '' }: PayableAccountsManagerProps) => {
  const [filters, setFilters] = useState({
    status: '',
    overdue: false,
    supplierId: ''
  });
  
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayableAccount | null>(null);
  
  const [newAccount, setNewAccount] = useState({
    supplier_name: '',
    supplier_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    payment_terms: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    notes: ''
  });

  const [payment, setPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const {
    usePayableAccounts,
    createPayableAccount,
    markPayment,
    getOverdueAccounts,
    calculatePayablesTotal
  } = useFinancialData();

  const { data: payableData, isLoading, refetch } = usePayableAccounts(filters);

  // 📊 CÁLCULOS
  const overdueAccounts = payableData ? getOverdueAccounts(payableData) : [];
  const totalPayables = payableData ? calculatePayablesTotal(payableData) : 0;
  
  const statusCounts = payableData ? {
    pending: payableData.filter(p => p.status === 'pending').length,
    partial: payableData.filter(p => p.status === 'partial').length,
    overdue: overdueAccounts.length,
    paid: payableData.filter(p => p.status === 'paid').length
  } : { pending: 0, partial: 0, overdue: 0, paid: 0 };

  // 🆕 CREAR NUEVA CUENTA
  const handleCreateAccount = async () => {
    if (!newAccount.supplier_name || !newAccount.invoice_number || !newAccount.amount || !newAccount.due_date) {
      return;
    }

    const accountData = {
      supplier_id: newAccount.supplier_id || crypto.randomUUID(),
      supplier_name: newAccount.supplier_name,
      invoice_number: newAccount.invoice_number,
      invoice_date: newAccount.invoice_date,
      due_date: newAccount.due_date,
      amount: parseFloat(newAccount.amount),
      amount_paid: 0,
      amount_pending: parseFloat(newAccount.amount),
      status: 'pending' as const,
      priority: newAccount.priority,
      payment_terms: newAccount.payment_terms,
      notes: newAccount.notes
    };

    await createPayableAccount.mutateAsync(accountData);

    // Reset form
    setNewAccount({
      supplier_name: '',
      supplier_id: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      amount: '',
      payment_terms: '',
      priority: 'medium',
      notes: ''
    });
    setShowNewAccount(false);
  };

  // 💰 PROCESAR PAGO
  const handlePayment = async () => {
    if (!selectedAccount || !payment.amount) return;

    const paymentAmount = parseFloat(payment.amount);
    if (paymentAmount <= 0 || paymentAmount > selectedAccount.amount_pending) return;

    await markPayment.mutateAsync({
      id: selectedAccount.id,
      amount: paymentAmount,
      date: payment.date
    });

    // Reset form
    setPayment({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setSelectedAccount(null);
    setShowPaymentModal(false);
  };

  // 📋 COLUMNAS DE LA TABLA
  const columns = [
    {
      key: 'supplier_name',
      label: 'Proveedor',
      sortable: true,
      render: (value: string, row: PayableAccount) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-gray-500">{row.invoice_number}</p>
        </div>
      )
    },
    {
      key: 'due_date',
      label: 'Vencimiento',
      sortable: true,
      render: (value: string, row: PayableAccount) => {
        const date = new Date(value);
        const today = new Date();
        const isOverdue = date < today && row.status !== 'paid';
        const daysUntilDue = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div className={isOverdue ? 'text-red-600' : daysUntilDue <= 7 ? 'text-orange-600' : ''}>
            <p className="font-medium">{date.toLocaleDateString('es-ES')}</p>
            <p className="text-xs">
              {isOverdue 
                ? `Vencido hace ${Math.abs(daysUntilDue)} días`
                : daysUntilDue <= 0 
                  ? 'Vence hoy'
                  : `Vence en ${daysUntilDue} días`
              }
            </p>
          </div>
        );
      }
    },
    {
      key: 'amount_pending',
      label: 'Pendiente',
      sortable: true,
      render: (value: number, row: PayableAccount) => (
        <div>
          <p className="font-bold text-lg">${value.toLocaleString()}</p>
          {row.amount_paid > 0 && (
            <p className="text-xs text-gray-500">
              de ${row.amount.toLocaleString()}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string, row: PayableAccount) => {
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
          <div className="space-y-1">
            <Badge variant={variants[value as keyof typeof variants]}>
              {labels[value as keyof typeof labels]}
            </Badge>
            {row.priority !== 'medium' && (
              <Badge 
                variant={row.priority === 'critical' ? 'destructive' : 'outline'}
                className="block"
              >
                {row.priority === 'critical' ? 'Crítico' : 
                 row.priority === 'high' ? 'Alto' : 'Bajo'}
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      key: 'payment_terms',
      label: 'Términos',
      mobileHidden: true
    }
  ];

  // 🎯 ACCIONES DE LA TABLA
  const actions = [
    {
      key: 'view',
      label: 'Ver',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row: PayableAccount) => {
        setSelectedAccount(row);
        // TODO: Mostrar modal de detalles
      },
      variant: 'ghost' as const
    },
    {
      key: 'pay',
      label: 'Pagar',
      icon: <DollarSign className="h-4 w-4" />,
      onClick: (row: PayableAccount) => {
        if (row.status === 'paid') return;
        setSelectedAccount(row);
        setPayment(prev => ({ 
          ...prev, 
          amount: row.amount_pending.toString() 
        }));
        setShowPaymentModal(true);
      },
      variant: 'default' as const,
      className: 'text-green-600 hover:text-green-700'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-xl font-bold">{statusCounts.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Vencidas</p>
                <p className="text-xl font-bold text-red-600">{statusCounts.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Parciales</p>
                <p className="text-xl font-bold">{statusCounts.partial}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Por Pagar</p>
                <p className="text-xl font-bold text-green-600">
                  ${totalPayables.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {overdueAccounts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Tienes {overdueAccounts.length} cuenta(s) vencida(s) por un total de $
            {overdueAccounts.reduce((sum, acc) => sum + acc.amount_pending, 0).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cuentas por Pagar
            </CardTitle>
            <Button onClick={() => setShowNewAccount(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nueva Cuenta
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="status-filter">Estado</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="partial">Parciales</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button 
                variant={filters.overdue ? "default" : "outline"}
                onClick={() => setFilters(prev => ({ ...prev, overdue: !prev.overdue }))}
                className="flex-1"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Solo Vencidas
              </Button>
              
              <Button variant="outline" onClick={() => setFilters({ status: '', overdue: false, supplierId: '' })}>
                Limpiar
              </Button>
            </div>
          </div>

          {/* Tabla */}
          {payableData && (
            <MobileOptimizedTable
              data={payableData as Record<string, unknown>[]}
              columns={columns as Array<{ header: string; accessor: string; type?: string }>}
              actions={actions as Array<{ label: string; onClick: (item: Record<string, unknown>) => void }>}
              searchable
              pagination
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Nueva Cuenta */}
      {showNewAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nueva Cuenta por Pagar</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNewAccount(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier-name">Proveedor *</Label>
                  <Input
                    id="supplier-name"
                    value={newAccount.supplier_name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, supplier_name: e.target.value }))}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                
                <div>
                  <Label htmlFor="invoice-number">Número de Factura *</Label>
                  <Input
                    id="invoice-number"
                    value={newAccount.invoice_number}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, invoice_number: e.target.value }))}
                    placeholder="Ej: FAC-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice-date">Fecha de Factura</Label>
                  <Input
                    id="invoice-date"
                    type="date"
                    value={newAccount.invoice_date}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, invoice_date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="due-date">Fecha de Vencimiento *</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={newAccount.due_date}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newAccount.amount}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select 
                    value={newAccount.priority} 
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                      setNewAccount(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="payment-terms">Términos de Pago</Label>
                <Input
                  id="payment-terms"
                  value={newAccount.payment_terms}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, payment_terms: e.target.value }))}
                  placeholder="Ej: 30 días, Contado, etc."
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={newAccount.notes}
                  onChange={(e) => setNewAccount(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleCreateAccount} 
                  disabled={createPayableAccount.isPending}
                  className="flex-1"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Crear Cuenta
                </Button>
                <Button variant="outline" onClick={() => setShowNewAccount(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Pago */}
      {showPaymentModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registrar Pago</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPaymentModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedAccount.supplier_name}</p>
                <p className="text-sm text-gray-600">Factura: {selectedAccount.invoice_number}</p>
                <p className="text-lg font-bold text-red-600">
                  Pendiente: ${selectedAccount.amount_pending.toLocaleString()}
                </p>
              </div>

              <div>
                <Label htmlFor="payment-amount">Monto del Pago *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  value={payment.amount}
                  onChange={(e) => setPayment(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  max={selectedAccount.amount_pending}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: ${selectedAccount.amount_pending.toLocaleString()}
                </p>
              </div>

              <div>
                <Label htmlFor="payment-date">Fecha de Pago</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={payment.date}
                  onChange={(e) => setPayment(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="payment-notes">Notas del Pago</Label>
                <Textarea
                  id="payment-notes"
                  value={payment.notes}
                  onChange={(e) => setPayment(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Referencia, método de pago, etc..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handlePayment} 
                  disabled={markPayment.isPending || !payment.amount}
                  className="flex-1"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Procesar Pago
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
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