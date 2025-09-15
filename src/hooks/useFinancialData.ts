// Hook personalizado para gestión de datos financieros
// Compatible con Lovable - Integración completa con sistema financiero
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialService, type CashFlowEntry, type CashFlowProjection, type FinancialKPI, type PayableAccount } from '../services/financialService';
import { useToast } from './use-toast';

interface UseFinancialDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useFinancialData = (options: UseFinancialDataOptions = {}) => {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 💰 FLUJO DE CAJA
  const useCashFlow = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['cashFlow', startDate, endDate],
      queryFn: () => financialService.getCashFlowByDateRange(new Date(startDate), new Date(endDate)),
      refetchInterval: autoRefresh ? refreshInterval : false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  // 📊 PROYECCIONES
  const useCashFlowProjections = (year: number) => {
    return useQuery({
      queryKey: ['cashFlowProjections', year],
      queryFn: () => financialService.getCashFlowProjections(year),
      refetchInterval: autoRefresh ? refreshInterval : false,
      staleTime: 15 * 60 * 1000, // 15 minutos
    });
  };

  // 💳 CUENTAS POR PAGAR
  const usePayableAccounts = (filters?: Parameters<typeof financialService.getPayableAccounts>[0]) => {
    return useQuery({
      queryKey: ['payableAccounts', filters],
      queryFn: () => financialService.getPayableAccounts(filters),
      refetchInterval: autoRefresh ? refreshInterval : false,
      staleTime: 2 * 60 * 1000, // 2 minutos
    });
  };

  // 📈 KPIs FINANCIEROS
  const useFinancialKPIs = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['financialKPIs', startDate, endDate],
      queryFn: () => financialService.calculateFinancialKPIs(startDate, endDate),
      refetchInterval: autoRefresh ? refreshInterval : false,
      staleTime: 10 * 60 * 1000, // 10 minutos
    });
  };

  // 📊 TENDENCIAS
  const useCashFlowTrends = (months: number = 12) => {
    return useQuery({
      queryKey: ['cashFlowTrends', months],
      queryFn: () => financialService.getCashFlowTrends(months),
      refetchInterval: autoRefresh ? refreshInterval : false,
      staleTime: 30 * 60 * 1000, // 30 minutos
    });
  };

  // 🔄 MUTACIONES PARA CREAR/ACTUALIZAR

  // Crear entrada de flujo de caja
  const createCashFlowEntry = useMutation({
    mutationFn: (entry: Omit<CashFlowEntry, 'id' | 'created_at' | 'updated_at'>) =>
      financialService.createCashFlowEntry(entry),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
        queryClient.invalidateQueries({ queryKey: ['financialKPIs'] });
        queryClient.invalidateQueries({ queryKey: ['cashFlowTrends'] });
        
        toast({
          title: "✅ Entrada creada",
          description: `${variables.type === 'income' ? 'Ingreso' : 'Gasto'} registrado correctamente`,
        });
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudo crear la entrada de flujo de caja",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error('Error creando entrada de flujo de caja:', error);
      toast({
        title: "❌ Error",
        description: "Error al crear la entrada de flujo de caja",
        variant: "destructive"
      });
    }
  });

  // Actualizar entrada de flujo de caja
  const updateCashFlowEntry = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CashFlowEntry> }) =>
      financialService.updateCashFlowEntry(id, updates),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
        queryClient.invalidateQueries({ queryKey: ['financialKPIs'] });
        
        toast({
          title: "✅ Entrada actualizada",
          description: "Los cambios se guardaron correctamente",
        });
      }
    },
    onError: (error) => {
      console.error('Error actualizando entrada:', error);
      toast({
        title: "❌ Error",
        description: "Error al actualizar la entrada",
        variant: "destructive"
      });
    }
  });

  // Eliminar entrada de flujo de caja
  const deleteCashFlowEntry = useMutation({
    mutationFn: (id: string) => financialService.deleteCashFlowEntry(id),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
        queryClient.invalidateQueries({ queryKey: ['financialKPIs'] });
        
        toast({
          title: "✅ Entrada eliminada",
          description: "La entrada se eliminó correctamente",
        });
      }
    },
    onError: (error) => {
      console.error('Error eliminando entrada:', error);
      toast({
        title: "❌ Error",
        description: "Error al eliminar la entrada",
        variant: "destructive"
      });
    }
  });

  // Generar proyecciones automáticas
  const generateProjections = useMutation({
    mutationFn: (year: number) => financialService.generateCashFlowProjections(year),
    onSuccess: (projections) => {
      if (projections && projections.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['cashFlowProjections'] });
        
        toast({
          title: "✅ Proyecciones generadas",
          description: `Se generaron ${projections.length} proyecciones automáticamente`,
        });
      }
    },
    onError: (error) => {
      console.error('Error generando proyecciones:', error);
      toast({
        title: "❌ Error",
        description: "Error al generar las proyecciones automáticas",
        variant: "destructive"
      });
    }
  });

  // Crear cuenta por pagar
  const createPayableAccount = useMutation({
    mutationFn: (account: Omit<PayableAccount, 'id' | 'created_at' | 'updated_at'>) =>
      financialService.createPayableAccount(account),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['payableAccounts'] });
        
        toast({
          title: "✅ Cuenta creada",
          description: "Nueva cuenta por pagar registrada",
        });
      }
    },
    onError: (error) => {
      console.error('Error creando cuenta por pagar:', error);
      toast({
        title: "❌ Error",
        description: "Error al crear la cuenta por pagar",
        variant: "destructive"
      });
    }
  });

  // Registrar pago
  const markPayment = useMutation({
    mutationFn: ({ id, amount, date }: { id: string; amount: number; date: string }) =>
      financialService.markPayment(id, amount, date),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['payableAccounts'] });
        queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
        
        toast({
          title: "✅ Pago registrado",
          description: "El pago se registró correctamente",
        });
      }
    },
    onError: (error) => {
      console.error('Error registrando pago:', error);
      toast({
        title: "❌ Error",
        description: "Error al registrar el pago",
        variant: "destructive"
      });
    }
  });

  // 📊 FUNCIONES HELPER PARA CÁLCULOS LOCALES
  const calculateTotals = useCallback((entries: CashFlowEntry[]) => {
    const income = entries
      .filter(entry => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);
      
    const expenses = entries
      .filter(entry => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);
      
    return {
      income,
      expenses,
      netFlow: income - expenses,
      count: entries.length
    };
  }, []);

  const groupByCategory = useCallback((entries: CashFlowEntry[]) => {
    const groups: Record<string, { income: number; expenses: number; count: number }> = {};
    
    entries.forEach(entry => {
      const category = entry.category;
      if (!groups[category]) {
        groups[category] = { income: 0, expenses: 0, count: 0 };
      }
      
      if (entry.type === 'income') {
        groups[category].income += entry.amount;
      } else {
        groups[category].expenses += entry.amount;
      }
      
      groups[category].count++;
    });
    
    return Object.entries(groups).map(([category, data]) => ({
      category,
      ...data,
      total: data.income - data.expenses
    }));
  }, []);

  const getOverdueAccounts = useCallback((accounts: PayableAccount[]) => {
    const today = new Date();
    return accounts.filter(account => 
      account.status !== 'paid' && 
      new Date(account.due_date) < today
    );
  }, []);

  const calculatePayablesTotal = useCallback((accounts: PayableAccount[]) => {
    return accounts.reduce((sum, account) => sum + (account.amount_pending || account.amount), 0);
  }, []);

  // 🔄 FUNCIONES DE REFETCH MANUAL
  const refreshFinancialData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
    queryClient.invalidateQueries({ queryKey: ['payableAccounts'] });
    queryClient.invalidateQueries({ queryKey: ['financialKPIs'] });
    queryClient.invalidateQueries({ queryKey: ['cashFlowTrends'] });
    queryClient.invalidateQueries({ queryKey: ['cashFlowProjections'] });
  }, [queryClient]);

  return {
    // Hooks de datos
    useCashFlow,
    useCashFlowProjections,
    usePayableAccounts,
    useFinancialKPIs,
    useCashFlowTrends,

    // Mutaciones
    createCashFlowEntry,
    updateCashFlowEntry,
    deleteCashFlowEntry,
    generateProjections,
    createPayableAccount,
    markPayment,

    // Helpers
    calculateTotals,
    groupByCategory,
    getOverdueAccounts,
    calculatePayablesTotal,
    refreshFinancialData
  };
};