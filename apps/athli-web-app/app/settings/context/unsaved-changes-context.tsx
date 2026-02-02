'use client';

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export const UnsavedChangesProvider = ({ children }: { children: ReactNode }) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const value = useMemo(() => ({
    hasUnsavedChanges,
    setHasUnsavedChanges,
  }), [hasUnsavedChanges]);

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const context = useContext(UnsavedChangesContext);
  if (context === undefined) {
    throw new Error('useUnsavedChanges must be used within an UnsavedChangesProvider');
  }
  return context;
};

