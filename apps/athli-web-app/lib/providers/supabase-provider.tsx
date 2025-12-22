'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

type SupabaseContextValue = {
  supabase: SupabaseClient | null;
  isLoaded: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

type SupabaseProviderProps = {
  children: ReactNode;
};

export default function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in your .env file');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_KEY) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_KEY in your .env file');
    }

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_KEY
    );

    setSupabase(client);
    setIsLoaded(true);
  }, []);

  return (
    <SupabaseContext.Provider
      value={{
        supabase,
        isLoaded,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);

  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }

  return {
    supabase: context.supabase,
    isLoaded: context.isLoaded,
  };
};
