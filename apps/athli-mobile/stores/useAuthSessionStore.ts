import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthSessionStore = {
  // State
  session: Session | null;
  userId: string | null;
  isSessionReady: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  initializeSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
  setSession: (session: Session | null) => void;
};

export const useAuthSessionStore = create<AuthSessionStore>((set, get) => ({
  // Initial state
  session: null,
  userId: null,
  isSessionReady: false,
  isInitializing: false,
  error: null,

  // Initialize session from storage
  initializeSession: async () => {
    const { isInitializing } = get();

    // Prevent concurrent initialization
    if (isInitializing) {
      console.log('[AuthSession] Already initializing, skipping...');
      return;
    }

    set({ isInitializing: true, error: null });

    try {
      console.log('[AuthSession] Initializing session...');

      // Get session from Supabase (restores from MMKV storage)
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (session) {
        console.log('[AuthSession] Session restored successfully');
        set({
          session,
          userId: session.user.id,
          isSessionReady: true,
          isInitializing: false,
          error: null,
        });
      } else {
        console.log('[AuthSession] No session found');
        set({
          session: null,
          userId: null,
          isSessionReady: true, // Changed: Still "ready" even with no session (initialization complete)
          isInitializing: false,
          error: null,
        });
      }
    } catch (error: any) {
      console.error('[AuthSession] Error initializing session:', error);
      set({
        session: null,
        userId: null,
        isSessionReady: true, // Changed: Initialization complete even on error
        isInitializing: false,
        error: error.message || 'Failed to initialize session',
      });
    }
  },

  // Refresh session (for token refresh)
  refreshSession: async () => {
    try {
      console.log('[AuthSession] Refreshing session...');

      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (session) {
        console.log('[AuthSession] Session refreshed successfully');
        set({
          session,
          userId: session.user.id,
          isSessionReady: true,
          error: null,
        });
      } else {
        console.log('[AuthSession] No session after refresh');
        set({
          session: null,
          userId: null,
          isSessionReady: true, // Changed: Refresh complete even with no session
        });
      }
    } catch (error: any) {
      console.error('[AuthSession] Error refreshing session:', error);
      set({
        error: error.message || 'Failed to refresh session',
      });
    }
  },

  // Clear session (on logout)
  clearSession: () => {
    console.log('[AuthSession] Clearing session');
    set({
      session: null,
      userId: null,
      isSessionReady: true, // Changed: Keep ready state (just no session)
      isInitializing: false,
      error: null,
    });
  },

  // Set session directly (useful after login)
  setSession: (session) => {
    if (session) {
      console.log('[AuthSession] Setting session directly');
      set({
        session,
        userId: session.user.id,
        isSessionReady: true,
        error: null,
      });
    } else {
      console.log('[AuthSession] Clearing session (setSession called with null)');
      set({
        session: null,
        userId: null,
        isSessionReady: true, // Changed: Keep ready state (just no session)
        error: null,
      });
    }
  },
}));
