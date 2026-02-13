'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LibrarySidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const LibrarySidebarContext = createContext<LibrarySidebarContextType | undefined>(undefined);

export function LibrarySidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggle = () => setIsOpen((prev) => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <LibrarySidebarContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </LibrarySidebarContext.Provider>
  );
}

export function useLibrarySidebar() {
  const context = useContext(LibrarySidebarContext);
  if (context === undefined) {
    throw new Error('useLibrarySidebar must be used within a LibrarySidebarProvider');
  }
  return context;
}
