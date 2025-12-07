import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { handleAuthError } from '../services/authErrorService';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Global auth error handler
let globalAuthErrorHandler: (() => void) | null = null;

export function setGlobalAuthErrorHandler(handler: () => void) {
  globalAuthErrorHandler = handler;
}

// Listen for auth state changes and handle errors globally
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' && !session) {
    // User was signed out, clear any cached data
    try {
      const { removeUserId } = await import('../services/storageService');
      await removeUserId();
    } catch (error) {
      console.warn('Failed to clear user data on sign out:', error);
    }
  }
});

// Global error handler for auth errors
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // Token refresh failed, handle the error
    try {
      await handleAuthError(
        supabase,
        new Error('Token refresh failed - no session available'),
        globalAuthErrorHandler || undefined
      );
    } catch (error) {
      console.warn('Failed to handle auth error:', error);
    }
  }
});
