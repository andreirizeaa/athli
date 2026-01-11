import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key: string) => {
        const { Storage } = await import('./storage');
        return Storage.getItem(key) ?? null;
      },
      setItem: async (key: string, value: string) => {
        const { Storage } = await import('./storage');
        Storage.setItem(key, value);
      },
      removeItem: async (key: string) => {
        const { Storage } = await import('./storage');
        Storage.removeItem(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
