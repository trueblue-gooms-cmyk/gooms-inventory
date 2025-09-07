import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, auth } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'operator';
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
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  sidebarOpen: boolean;
  notifications: Notification[];
  
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  loadProfile: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      sidebarOpen: true,
      notifications: [],
      
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      addNotification: (notification) => {
        const id = crypto.randomUUID();
        const newNotification = {
          ...notification,
          id,
          timestamp: new Date(),
          duration: notification.duration ?? 5000,
        };
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));
        if (newNotification.duration > 0) {
          setTimeout(() => get().removeNotification(id), newNotification.duration);
        }
      },
      
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      
      signIn: async () => {
        try {
          set({ isLoading: true });
          await auth.signInWithGoogle();
        } catch (error) {
          console.error('Sign in error:', error);
          get().addNotification({
            type: 'error',
            title: 'Error al iniciar sesión',
          });
        } finally {
          set({ isLoading: false });
        }
      },
      
      signOut: async () => {
        try {
          await auth.signOut();
          set({ user: null, profile: null });
        } catch (error) {
          console.error('Sign out error:', error);
        }
      },
      
      checkSession: async () => {
        try {
          set({ isLoading: true });
          const session = await auth.getSession();
          if (session?.user) {
            set({ user: session.user });
            await get().loadProfile();
          }
        } catch (error) {
          console.error('Session check error:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      loadProfile: async () => {
        const user = get().user;
        if (!user) return;
        
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (data) {
            set({ profile: data as Profile });
          } else {
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || '',
                role: 'user',
              })
              .select()
              .single();
            
            if (newProfile) set({ profile: newProfile as Profile });
          }
        } catch (error) {
          console.error('Load profile error:', error);
        }
      },
    }),
    {
      name: 'gooms-inventory',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
);

export const useProfile = () => useAppStore((state) => state.profile);
export const useIsAdmin = () => useAppStore((state) => state.profile?.role === 'admin');
export const useCanEdit = () => useAppStore((state) => ['admin', 'operator'].includes(state.profile?.role || ''));