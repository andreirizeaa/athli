'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AssistantSidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  isMobile: boolean;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const AssistantSidebarContext = createContext<AssistantSidebarContextType | undefined>(undefined);

export function AssistantSidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsOpen((prev) => !prev);
    }
  }, [isMobile]);

  return (
    <AssistantSidebarContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggle,
        isMobile,
        isMobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </AssistantSidebarContext.Provider>
  );
}

export function useAssistantSidebar() {
  const context = useContext(AssistantSidebarContext);
  if (!context) {
    throw new Error('useAssistantSidebar must be used within AssistantSidebarProvider');
  }
  return context;
}
