import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';

// Secure role checking using RPC instead of tamperable profile.role
export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAppStore();
  
  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.rpc('get_my_role');
        if (error) throw error;
        setIsAdmin(data === 'admin');
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      }
    }
    
    checkAdminRole();
  }, [user]);
  
  return isAdmin;
};

export const useCanEdit = () => {
  const [canEdit, setCanEdit] = useState(false);
  const { user } = useAppStore();
  
  useEffect(() => {
    async function checkEditRole() {
      if (!user) {
        setCanEdit(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.rpc('get_my_role');
        if (error) throw error;
        setCanEdit(['admin', 'operator'].includes(data || ''));
      } catch (error) {
        console.error('Error checking edit role:', error);
        setCanEdit(false);
      }
    }
    
    checkEditRole();
  }, [user]);
  
  return canEdit;
};

export const useUserRole = () => {
  const [role, setRole] = useState<string | null>(null);
  const { user } = useAppStore();
  
  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        return;
      }
      
      try {
        const { data, error } = await supabase.rpc('get_my_role');
        if (error) throw error;
        setRole(data);
        
        // Log role access for security monitoring
        await supabase.rpc('log_sensitive_access', {
          table_name: 'user_roles',
          operation: 'ROLE_CHECK'
        });
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      }
    }
    
    fetchRole();
  }, [user]);
  
  return role;
};

// Security monitoring hook
export const useSecurityMonitoring = () => {
  const { user } = useAppStore();
  
  const logSensitiveOperation = async (tableName: string, operation: string, recordId?: string) => {
    try {
      await supabase.rpc('log_sensitive_access', {
        table_name: tableName,
        operation,
        record_id: recordId
      });
    } catch (error) {
      console.warn('Failed to log sensitive operation:', error);
    }
  };
  
  return {
    logSensitiveOperation
  };
};