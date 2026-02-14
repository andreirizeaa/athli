'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const MOBILE_BREAKPOINT = 900;

interface SettingsSidebarContextType {
  isOpen: boolean;
  isMobileOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  setMobileOpen: (open: boolean) => void;
}

const SettingsSidebarContext = createContext<SettingsSidebarContextType | undefined>(undefined);

export function SettingsSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsOpen((prev) => !prev);
    }
  }, [isMobile]);

  return (
    <SettingsSidebarContext.Provider value={{ isOpen, isMobileOpen, isMobile, toggle, setMobileOpen: setIsMobileOpen }}>
      {children}
    </SettingsSidebarContext.Provider>
  );
}

export function useSettingsSidebar() {
  const context = useContext(SettingsSidebarContext);
  if (context === undefined) {
    throw new Error('useSettingsSidebar must be used within a SettingsSidebarProvider');
  }
  return context;
}
