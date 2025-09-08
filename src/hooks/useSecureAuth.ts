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
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      }
    }
    
    fetchRole();
  }, [user]);
  
  return role;
};