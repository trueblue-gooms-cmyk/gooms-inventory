// DEPRECATED: Use @/integrations/supabase/client instead
// This file exists for backward compatibility only

import { supabase } from '@/integrations/supabase/client';

// Re-export the main client for backward compatibility
export { supabase };

// Deprecated auth helpers - use supabase.auth directly
export const auth = {
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
    return data;
  },
  
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },
  
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },
};