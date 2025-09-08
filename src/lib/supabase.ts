import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables - Replace with your Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create Supabase client with proper typing
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  global: {
    headers: {
      'x-application-name': 'gooms-inventory',
    },
  },
  db: {
    schema: 'public',
  },
});

// Helper functions for error handling
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export async function handleSupabaseError<T>(
  promise: Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await promise;
  
  if (error) {
    console.error('Supabase error:', error);
    throw new SupabaseError(
      error.message || 'Database operation failed',
      error.code,
      error.details
    );
  }
  
  if (!data) {
    throw new SupabaseError('No data returned from database');
  }
  
  return data;
}

// Auth helpers
export const auth = {
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) throw new SupabaseError('Google sign-in failed', error.code);
    return data;
  },
  
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new SupabaseError('Sign out failed', error.code);
  },
  
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new SupabaseError('Failed to get session', error.code);
    return session;
  },
  
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new SupabaseError('Failed to get user', error.code);
    return user;
  },
  
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers with proper error handling
export const db = {
  // Generic query builder with error handling
  async query<T>(
    table: string,
    options?: {
      select?: string;
      filter?: Record<string, any>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<T[]> {
    let query = supabase.from(table).select(options?.select || '*');
    
    if (options?.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (options?.order) {
      query = query.order(
        options.order.column,
        { ascending: options.order.ascending ?? true }
      );
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return handleSupabaseError(query);
  },
  
  // Insert with audit logging
  async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[],
    options?: { returning?: boolean }
  ): Promise<T[]> {
    const query = supabase
      .from(table)
      .insert(data)
      .select(options?.returning ? '*' : undefined);
    
    return handleSupabaseError(query);
  },
  
  // Update with audit logging
  async update<T>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    const query = supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    return handleSupabaseError(query);
  },
  
  // Delete with soft delete option
  async delete(
    table: string,
    id: string,
    soft = false
  ): Promise<void> {
    if (soft) {
      await this.update(table, id, { is_active: false });
    } else {
      const query = supabase.from(table).delete().eq('id', id);
      await handleSupabaseError(query);
    }
  },
  
  // Batch operations
  async batchInsert<T>(
    table: string,
    data: Partial<T>[],
    chunkSize = 100
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const inserted = await this.insert<T>(table, chunk, { returning: true });
      results.push(...inserted);
    }
    
    return results;
  },
};

// Real-time subscriptions
export const realtime = {
  subscribe(
    table: string,
    callback: (payload: any) => void,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
  ) {
    return supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
        },
        callback
      )
      .subscribe();
  },
  
  unsubscribe(channel: any) {
    return supabase.removeChannel(channel);
  },
};

// Storage helpers for file uploads
export const storage = {
  async upload(
    bucket: string,
    path: string,
    file: File,
    options?: { upsert?: boolean }
  ) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options?.upsert ?? false,
        cacheControl: '3600',
      });
    
    if (error) throw new SupabaseError('File upload failed', error.message);
    return data;
  },
  
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};

// Export types for use in components
export type { Database };
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = 
  Database['public']['Enums'][T];