import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useSecureAuth';

// Hook for secure data access that respects role permissions
export const useSecureData = () => {
  const userRole = useUserRole();

  // Safe data access for all authenticated users (no sensitive info)
  const useProductsSafe = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const fetchProducts = async () => {
        try {
          const { data, error } = await supabase.rpc('get_products_safe');
          if (error) throw error;
          setProducts(data || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
          setLoading(false);
        }
      };

      fetchProducts();
    }, []);

    return { products, loading, error };
  };

  const useRawMaterialsSafe = () => {
    const [rawMaterials, setRawMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const fetchRawMaterials = async () => {
        try {
          const { data, error } = await supabase.rpc('get_raw_materials_safe');
          if (error) throw error;
          setRawMaterials(data || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch raw materials');
        } finally {
          setLoading(false);
        }
      };

      fetchRawMaterials();
    }, []);

    return { rawMaterials, loading, error };
  };

  const useLocationsSafe = () => {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const fetchLocations = async () => {
        try {
          const { data, error } = await supabase.rpc('get_locations_safe');
          if (error) throw error;
          setLocations(data || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch locations');
        } finally {
          setLoading(false);
        }
      };

      fetchLocations();
    }, []);

    return { locations, loading, error };
  };

  const useInventorySafe = () => {
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const fetchInventory = async () => {
        try {
          const { data, error } = await supabase.rpc('get_inventory_safe');
          if (error) throw error;
          setInventory(data || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
        } finally {
          setLoading(false);
        }
      };

      fetchInventory();
    }, []);

    return { inventory, loading, error };
  };

  // Full data access for admin/operators (includes sensitive info)
  const useProductsFull = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!['admin', 'operator'].includes(userRole || '')) {
        setError('Insufficient permissions for full product data');
        setLoading(false);
        return;
      }

      const fetchProducts = async () => {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*');
          if (error) throw error;
          setProducts(data || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
          setLoading(false);
        }
      };

      fetchProducts();
    }, [userRole]);

    return { products, loading, error };
  };

  const useRawMaterialsFull = () => {
    const [rawMaterials, setRawMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!['admin', 'operator'].includes(userRole || '')) {
        setError('Insufficient permissions for full raw materials data');
        setLoading(false);
        return;
      }

      const fetchRawMaterials = async () => {
        try {
          const { data, error } = await supabase
            .from('raw_materials')
            .select('*');
          if (error) throw error;
          setRawMaterials(data || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch raw materials');
        } finally {
          setLoading(false);
        }
      };

      fetchRawMaterials();
    }, [userRole]);

    return { rawMaterials, loading, error };
  };

  // Secure external API integration
  const useAlegraIntegration = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const syncSales = async () => {
      if (!['admin', 'operator'].includes(userRole || '')) {
        throw new Error('Insufficient permissions for Alegra integration');
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke('alegra-integration', {
          body: { action: 'sync_sales' }
        });

        if (error) throw error;
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync sales data';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    const createPurchaseOrder = async (orderData: any) => {
      if (!['admin', 'operator'].includes(userRole || '')) {
        throw new Error('Insufficient permissions for Alegra integration');
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.functions.invoke('alegra-integration', {
          body: { action: 'create_purchase_order', data: orderData }
        });

        if (error) throw error;
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create purchase order';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    return { syncSales, createPurchaseOrder, loading, error };
  };

  return {
    // Safe data hooks (all authenticated users)
    useProductsSafe,
    useRawMaterialsSafe,
    useLocationsSafe,
    useInventorySafe,
    
    // Full data hooks (admin/operator only)
    useProductsFull,
    useRawMaterialsFull,
    
    // External integrations (admin/operator only)
    useAlegraIntegration,
  };
};