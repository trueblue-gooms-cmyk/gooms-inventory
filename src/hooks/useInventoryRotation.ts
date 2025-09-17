// Hook personalizado para gestión inteligente de rotación de inventario
// Implementa algoritmos FIFO (First In, First Out) y FEFO (First Expired, First Out)
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface ExpiryAlert {
  id: string;
  product_id: string;
  product_name: string;
  location_name: string;
  batch_number?: string;
  current_quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  alert_level: 'critical' | 'warning' | 'info';
  suggested_actions: string[];
}

export interface RotationSuggestion {
  product_id: string;
  product_name: string;
  location_id: string;
  location_name: string;
  action: 'transfer' | 'discount' | 'dispose' | 'promote';
  priority: 'high' | 'medium' | 'low';
  quantity: number;
  reason: string;
  expiry_date: string;
  financial_impact: number;
}

export interface InventoryRotationData {
  alerts: ExpiryAlert[];
  suggestions: RotationSuggestion[];
  rotationMetrics: {
    total_expiring_soon: number;
    total_value_at_risk: number;
    avg_rotation_days: number;
    slow_moving_products: number;
  };
}

export const useInventoryRotation = () => {
  const [data, setData] = useState<InventoryRotationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Configuración de alertas escalonadas
  const ALERT_THRESHOLDS = {
    critical: 7,   // 7 días o menos - acción inmediata
    warning: 15,   // 15 días - planificar acciones
    info: 30       // 30 días - monitoreo preventivo
  };

  const loadRotationData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Consulta optimizada para obtener inventario con fechas de vencimiento
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_current')
        .select(`
          id,
          product_id,
          location_id,
          quantity_available,
          expiry_date,
          batch_id,
          last_movement_date,
          products!inner (
            id,
            name,
            type,
            unit_cost
          ),
          locations!inner (
            id,
            name,
            type
          )
        `)
        .not('expiry_date', 'is', null)
        .gt('quantity_available', 0)
        .order('expiry_date', { ascending: true });

      if (inventoryError) throw inventoryError;

      // Procesar alertas de vencimiento
      const alerts = processExpiryAlerts(inventoryData || []);
      
      // Generar sugerencias de rotación inteligente
      const suggestions = generateRotationSuggestions(inventoryData || []);
      
      // Calcular métricas de rotación
      const metrics = calculateRotationMetrics(inventoryData || []);

      setData({
        alerts,
        suggestions,
        rotationMetrics: metrics
      });

      // Crear notificaciones automáticas para alertas críticas
      const criticalAlerts = alerts.filter(alert => alert.alert_level === 'critical');
      if (criticalAlerts.length > 0) {
        await createExpiryNotifications(criticalAlerts);
      }

    } catch (err: unknown) {
      console.error('Error loading rotation data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast({
        title: "Error cargando datos de rotación",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Procesar alertas de vencimiento con lógica escalonada
  const processExpiryAlerts = (inventory: unknown[]): ExpiryAlert[] => {
    const today = new Date();
    
    return inventory
      .map(item => {
        const typedItem = item as any;
        const expiryDate = new Date(typedItem.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determinar nivel de alerta
        let alertLevel: 'critical' | 'warning' | 'info';
        if (daysUntilExpiry <= ALERT_THRESHOLDS.critical) {
          alertLevel = 'critical';
        } else if (daysUntilExpiry <= ALERT_THRESHOLDS.warning) {
          alertLevel = 'warning';
        } else if (daysUntilExpiry <= ALERT_THRESHOLDS.info) {
          alertLevel = 'info';
        } else {
          return null; // No mostrar si está muy lejos del vencimiento
        }

        // Generar acciones sugeridas basadas en el nivel de alerta
        const suggestedActions = generateSuggestedActions(alertLevel, daysUntilExpiry, typedItem);

        return {
          id: typedItem.id,
          product_id: typedItem.product_id,
          product_name: typedItem.products.name,
          location_name: typedItem.locations.name,
          batch_number: typedItem.batch_id,
          current_quantity: typedItem.quantity_available,
          expiry_date: typedItem.expiry_date,
          days_until_expiry: daysUntilExpiry,
          alert_level: alertLevel,
          suggested_actions: suggestedActions
        };
      })
      .filter(Boolean) as ExpiryAlert[];
  };

  // Generar acciones sugeridas según el contexto
  const generateSuggestedActions = (
    alertLevel: 'critical' | 'warning' | 'info', 
    daysUntilExpiry: number, 
    item: unknown
  ): string[] => {
    const actions: string[] = [];
    
    if (alertLevel === 'critical') {
      if (daysUntilExpiry <= 1) {
        actions.push('Disposición inmediata si no se puede vender');
        actions.push('Descuento de emergencia 50-70%');
      } else {
        actions.push('Transferir a ubicación de mayor rotación');
        actions.push('Promoción especial con descuento');
        actions.push('Priorizar en próximas ventas');
      }
    } else if (alertLevel === 'warning') {
      actions.push('Planificar promoción para próxima semana');
      actions.push('Evaluar transferencia entre ubicaciones');
      actions.push('Considerar bundling con otros productos');
    } else {
      actions.push('Monitorear rotación del producto');
      actions.push('Evaluar políticas de reabastecimiento');
    }

    return actions;
  };

  // Generar sugerencias de rotación inteligente usando algoritmo FIFO/FEFO
  const generateRotationSuggestions = (inventory: unknown[]): RotationSuggestion[] => {
    const suggestions: RotationSuggestion[] = [];
    const today = new Date();

    // Agrupar por producto para análisis comparativo
    const productGroups = inventory.reduce((groups: any, item) => {
      const typedItem = item as any;
      if (!groups[typedItem.product_id]) {
        groups[typedItem.product_id] = [];
      }
      groups[typedItem.product_id].push(typedItem);
      return groups;
    }, {});

    Object.entries(productGroups).forEach(([productId, items]: [string, any]) => {
      const sortedItems = (items as any[]).sort((a, b) => 
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      );

      // Implementar lógica FEFO: identificar el lote que vence primero
      const firstExpiring = sortedItems[0];
      const lastExpiring = sortedItems[sortedItems.length - 1];
      
      const daysUntilFirstExpiry = Math.ceil(
        (new Date(firstExpiring.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Sugerir acciones basadas en algoritmo FEFO
      if (daysUntilFirstExpiry <= 15 && sortedItems.length > 1) {
        const totalValue = firstExpiring.quantity_available * (firstExpiring.products?.unit_cost || 0);
        
        suggestions.push({
          product_id: firstExpiring.product_id,
          product_name: firstExpiring.products.name,
          location_id: firstExpiring.location_id,
          location_name: firstExpiring.locations.name,
          action: daysUntilFirstExpiry <= 7 ? 'discount' : 'promote',
          priority: daysUntilFirstExpiry <= 7 ? 'high' : 'medium',
          quantity: firstExpiring.quantity_available,
          reason: `Lote vence en ${daysUntilFirstExpiry} días. Priorizar según FEFO.`,
          expiry_date: firstExpiring.expiry_date,
          financial_impact: totalValue
        });
      }

      // Detectar productos de lenta rotación
      sortedItems.forEach(item => {
        const daysSinceLastMovement = Math.ceil(
          (today.getTime() - new Date(item.last_movement_date || item.expiry_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastMovement > 60) {
          suggestions.push({
            product_id: item.product_id,
            product_name: item.products.name,
            location_id: item.location_id,
            location_name: item.locations.name,
            action: 'transfer',
            priority: 'medium',
            quantity: Math.floor(item.quantity_available * 0.5),
            reason: `Sin movimiento por ${daysSinceLastMovement} días. Considerar reubicación.`,
            expiry_date: item.expiry_date,
            financial_impact: (item.quantity_available * 0.5) * (item.products?.unit_cost || 0)
          });
        }
      });
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  // Calcular métricas de rotación de inventario
  const calculateRotationMetrics = (inventory: unknown[]) => {
    const today = new Date();
    let totalValueAtRisk = 0;
    let totalExpiringSoon = 0;
    let slowMovingProducts = 0;
    let totalRotationDays = 0;

    inventory.forEach(item => {
      const typedItem = item as any;
      const expiryDate = new Date(typedItem.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 15) {
        totalExpiringSoon++;
        totalValueAtRisk += typedItem.quantity_available * (typedItem.products?.unit_cost || 0);
      }

      const daysSinceLastMovement = Math.ceil(
        (today.getTime() - new Date(typedItem.last_movement_date || today).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastMovement > 60) {
        slowMovingProducts++;
      }

      totalRotationDays += daysSinceLastMovement;
    });

    return {
      total_expiring_soon: totalExpiringSoon,
      total_value_at_risk: Math.round(totalValueAtRisk),
      avg_rotation_days: inventory.length > 0 ? Math.round(totalRotationDays / inventory.length) : 0,
      slow_moving_products: slowMovingProducts
    };
  };

  // Crear notificaciones automáticas para alertas críticas
  const createExpiryNotifications = async (criticalAlerts: ExpiryAlert[]) => {
    try {
      const notifications = criticalAlerts.map(alert => ({
        type: 'expiry_alert' as const,
        title: `⚠️ Producto próximo a vencer`,
        message: `${alert.product_name} en ${alert.location_name} vence en ${alert.days_until_expiry} días`,
        data: {
          product_id: alert.product_id,
          location_name: alert.location_name,
          days_until_expiry: alert.days_until_expiry
        },
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    } catch (err) {
      console.error('Error creating expiry notifications:', err);
    }
  };

  // Ejecutar acción de rotación sugerida
  const executeRotationAction = async (suggestion: RotationSuggestion) => {
    try {
      // Implementar acciones específicas según el tipo
      switch (suggestion.action) {
        case 'discount':
          toast({
            title: "Sugerencia registrada",
            description: `Se recomienda aplicar descuento a ${suggestion.product_name}`,
          });
          break;
        case 'transfer':
          // Lógica para sugerir transferencia
          toast({
            title: "Transferencia sugerida",
            description: `Transferir ${suggestion.quantity} unidades de ${suggestion.product_name}`,
          });
          break;
        case 'dispose':
          // Lógica para disposición
          toast({
            title: "Disposición requerida",
            description: `Proceder con disposición de ${suggestion.product_name}`,
            variant: "destructive"
          });
          break;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast({
        title: "Error ejecutando acción",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadRotationData();
  }, []);

  // Auto-refresh cada 30 minutos para mantener datos actualizados
  useEffect(() => {
    const interval = setInterval(() => {
      loadRotationData();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    isLoading,
    error,
    refresh: loadRotationData,
    executeAction: executeRotationAction
  };
};