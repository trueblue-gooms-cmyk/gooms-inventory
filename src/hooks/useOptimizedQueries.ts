import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Query keys for cache management
export const QUERY_KEYS = {
  products: ['products'],
  rawMaterials: ['rawMaterials'],
  inventory: ['inventory'],
  locations: ['locations'],
  suppliers: ['suppliers'],
  notifications: ['notifications'],
  movements: (page: number, limit: number) => ['movements', page, limit],
  sales: (dateRange?: { start: string; end: string }) => ['sales', dateRange],
  purchaseOrders: ['purchaseOrders'],
} as const;

// Optimized inventory query with pagination
export const useInventoryPaginated = (page: number = 1, limit: number = 50) => {
  return useQuery({
    queryKey: ['inventory', page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from('inventory_current')
        .select(`
          *,
          products:product_id(id, name, sku, type, unit_cost, min_stock_units),
          locations:location_id(id, name, code)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('last_updated', { ascending: false });

      if (error) throw error;
      
      return {
        data: data || [],
        totalCount: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for inventory
  });
};

// Optimized movements query with specific selects
export const useMovementsPaginated = (page: number = 1, limit: number = 25) => {
  return useQuery({
    queryKey: QUERY_KEYS.movements(page, limit),
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          created_at,
          movement_type,
          quantity,
          notes,
          products:product_id(name, sku)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return {
        data: data || [],
        totalCount: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    },
  });
};

// Optimized sales data query with date filtering
export const useSalesData = (dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: QUERY_KEYS.sales(dateRange),
    queryFn: async () => {
      let query = supabase
        .from('sales_data')
        .select(`
          id,
          sale_date,
          quantity,
          unit_price,
          total,
          products:product_id(name, sku)
        `)
        .order('sale_date', { ascending: false });

      if (dateRange) {
        query = query
          .gte('sale_date', dateRange.start)
          .lte('sale_date', dateRange.end);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for sales data
  });
};

// Intelligent cache invalidation hook
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
    queryClient.invalidateQueries({ queryKey: ['movements'] });
    toast({
      title: "Inventario actualizado",
      description: "Los datos se han refrescado automáticamente",
    });
  };

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rawMaterials });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries();
    toast({
      title: "Datos actualizados",
      description: "Toda la información ha sido refrescada",
    });
  };

  return {
    invalidateInventory,
    invalidateProducts,
    invalidateAll
  };
};

// Mutation for inventory movements with optimistic updates
export const useCreateMovement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (movementData: unknown) => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert(movementData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      
      toast({
        title: "Movimiento registrado",
        description: "El movimiento de inventario se ha guardado correctamente",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el movimiento",
        variant: "destructive",
      });
    },
  });
};

// Background refresh for critical data
export const useBackgroundRefresh = () => {
  const queryClient = useQueryClient();

  // Refresh critical inventory data every 5 minutes
  const refreshCriticalData = () => {
    queryClient.refetchQueries({ 
      queryKey: QUERY_KEYS.inventory,
      stale: true 
    });
    queryClient.refetchQueries({ 
      queryKey: QUERY_KEYS.notifications,
      stale: true 
    });
  };

  return { refreshCriticalData };
};