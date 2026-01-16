'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { useSupabaseAuth } from './supabase-auth-provider';

interface LogoutContextType {
  isLoggingOut: boolean;
  triggerLogout: () => Promise<void>;
}

const LogoutContext = createContext<LogoutContextType | undefined>(undefined);

export function LogoutProvider({ children }: { children: ReactNode }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { signOut } = useSupabaseAuth();

  const triggerLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <LogoutContext.Provider value={{ isLoggingOut, triggerLogout }}>
      {children}
    </LogoutContext.Provider>
  );
}

export function useLogout() {
  const context = useContext(LogoutContext);
  if (context === undefined) {
    throw new Error('useLogout must be used within a LogoutProvider');
  }
  return context;
}
