'use client';

import { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';

interface AccountSaveContextType {
  onSave?: () => Promise<void>;
  setOnSave: (handler: (() => Promise<void>) | undefined) => void;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  hasSaveHandler: boolean;
}

const AccountSaveContext = createContext<AccountSaveContextType | undefined>(undefined);

export const AccountSaveProvider = ({ children }: { children: ReactNode }) => {
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

  return (
    <AccountSaveContext.Provider value={{ onSave, setOnSave, isSaving, setIsSaving, hasSaveHandler }}>
      {children}
    </AccountSaveContext.Provider>
  );
};

export const useAccountSave = () => {
  const context = useContext(AccountSaveContext);
  if (context === undefined) {
    throw new Error('useAccountSave must be used within an AccountSaveProvider');
  }
  return context;
};

