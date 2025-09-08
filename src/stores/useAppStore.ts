import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase, auth } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// Types
interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'operator';
  phone?: string;
  is_active: boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
  duration?: number;
}

interface AppState {
  // Auth
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  
  // UI
  sidebarOpen: boolean;
  notifications: Notification[];
  
  // Filters
  dateRange: {
    from: Date;
    to: Date;
  };
  
  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setDateRange: (from: Date, to: Date) => void;
  
  // Auth actions
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  
  // Profile actions
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

// Store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        profile: null,
        isLoading: true,
        sidebarOpen: true,
        notifications: [],
        dateRange: {
          from: new Date(new Date().setDate(1)), // First day of current month
          to: new Date(), // Today
        },
        
        // Basic setters
        setUser: (user) => set({ user }),
        setProfile: (profile) => set({ profile }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        
        // Notifications
        addNotification: (notification) => {
          const id = crypto.randomUUID();
          const newNotification: Notification = {
            ...notification,
            id,
            timestamp: new Date(),
            duration: notification.duration ?? 5000,
          };
          
          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));
          
          // Auto-remove after duration
          if (newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
              get().removeNotification(id);
            }, newNotification.duration);
          }
        },
        
        removeNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        },
        
        // Date range
        setDateRange: (from, to) => {
          set({ dateRange: { from, to } });
        },
        
        // Auth actions
        signIn: async () => {
          try {
            set({ isLoading: true });
            await auth.signInWithGoogle();
          } catch (error) {
            console.error('Sign in error:', error);
            get().addNotification({
              type: 'error',
              title: 'Error al iniciar sesión',
              message: error instanceof Error ? error.message : 'Error desconocido',
            });
          } finally {
            set({ isLoading: false });
          }
        },
        
        signOut: async () => {
          try {
            set({ isLoading: true });
            await auth.signOut();
            set({ user: null, profile: null });
            get().addNotification({
              type: 'success',
              title: 'Sesión cerrada',
              message: 'Has cerrado sesión correctamente',
            });
          } catch (error) {
            console.error('Sign out error:', error);
            get().addNotification({
              type: 'error',
              title: 'Error al cerrar sesión',
              message: error instanceof Error ? error.message : 'Error desconocido',
            });
          } finally {
            set({ isLoading: false });
          }
        },
        
        checkSession: async () => {
          try {
            set({ isLoading: true });
            const session = await auth.getSession();
            
            if (session?.user) {
              set({ user: session.user });
              await get().loadProfile();
            } else {
              set({ user: null, profile: null });
            }
          } catch (error) {
            console.error('Session check error:', error);
            set({ user: null, profile: null });
          } finally {
            set({ isLoading: false });
          }
        },
        
        // Profile actions
        loadProfile: async () => {
          const user = get().user;
          if (!user) return;
          
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            
            if (error) throw error;
            
            if (data) {
              set({ profile: data as Profile });
              
              // Update last login
              await supabase
                .from('profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);
            } else {
              // Create new profile if it doesn't exist
              const { data: newProfile } = await supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  email: user.email!,
                  full_name: user.user_metadata?.full_name || '',
                  role: 'user',
                  is_active: true,
                })
                .select()
                .single();
              
              if (newProfile) {
                set({ profile: newProfile as Profile });
              }
            }
          } catch (error) {
            console.error('Load profile error:', error);
          }
        },
        
        updateProfile: async (updates) => {
          const user = get().user;
          if (!user) return;
          
          try {
            const { data, error } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', user.id)
              .select()
              .single();
            
            if (error) throw error;
            
            if (data) {
              set({ profile: data as Profile });
              get().addNotification({
                type: 'success',
                title: 'Perfil actualizado',
                message: 'Los cambios se han guardado correctamente',
              });
            }
          } catch (error) {
            console.error('Update profile error:', error);
            get().addNotification({
              type: 'error',
              title: 'Error al actualizar perfil',
              message: error instanceof Error ? error.message : 'Error desconocido',
            });
          }
        },
      }),
      {
        name: 'gooms-inventory',
        partialize: (state) => ({ 
          sidebarOpen: state.sidebarOpen,
          dateRange: state.dateRange,
        }),
      }
    ),
    {
      name: 'gooms-inventory-store',
    }
  )
);

// Selectors
export const useProfile = () => useAppStore((state) => state.profile);
export const useIsAdmin = () => useAppStore((state) => state.profile?.role === 'admin');
export const useCanEdit = () => useAppStore((state) => ['admin', 'operator'].includes(state.profile?.role || ''));