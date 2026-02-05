'use client';

import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo } from 'react';

interface CompanySaveContextType {
  onSave?: () => Promise<void>;
  setOnSave: (handler: (() => Promise<void>) | undefined) => void;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  hasSaveHandler: boolean;
}

const CompanySaveContext = createContext<CompanySaveContextType | undefined>(undefined);

export const CompanySaveProvider = ({ children }: { children: ReactNode }) => {
  const saveHandlerRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaveHandler, setHasSaveHandler] = useState(false);

  const setOnSave = useCallback((handler: (() => Promise<void>) | undefined) => {
    saveHandlerRef.current = handler;
    setHasSaveHandler(!!handler);
  }, []);

  // Create a stable reference to the current handler
  const onSave = useCallback(async () => {
    if (saveHandlerRef.current) {
      return saveHandlerRef.current();
    }
  }, []);

  const value = useMemo(() => ({
    onSave,
    setOnSave,
    isSaving,
    setIsSaving,
    hasSaveHandler,
  }), [onSave, setOnSave, isSaving, hasSaveHandler]);

  return (
    <CompanySaveContext.Provider value={value}>
      {children}
    </CompanySaveContext.Provider>
  );
};

export const useCompanySave = () => {
  const context = useContext(CompanySaveContext);
  if (context === undefined) {
    throw new Error('useCompanySave must be used within a CompanySaveProvider');
  }
  return context;
};

