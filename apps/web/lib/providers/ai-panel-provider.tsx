'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

type AIPanelContextType = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
};

const AIPanelContext = createContext<AIPanelContextType | undefined>(undefined);

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(prev => !prev);

  return (
    <AIPanelContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </AIPanelContext.Provider>
  );
}

export function useAIPanel() {
  const context = useContext(AIPanelContext);
  if (!context) {
    throw new Error('useAIPanel must be used within an AIPanelProvider');
  }
  return context;
}
