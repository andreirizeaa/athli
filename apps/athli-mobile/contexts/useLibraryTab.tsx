import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

export type LibraryTab = 'workouts' | 'programs' | 'exercises';

type LibraryTabContextValue = {
  activeTab: LibraryTab;
  setActiveTab: (tab: LibraryTab) => void;
};

const LibraryTabContext = createContext<LibraryTabContextValue | undefined>(undefined);

export const LibraryTabProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('workouts');

  return (
    <LibraryTabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </LibraryTabContext.Provider>
  );
};

export const useLibraryTab = () => {
  const context = useContext(LibraryTabContext);

  if (!context) {
    throw new Error('useLibraryTab must be used within a LibraryTabProvider');
  }

  return context;
};

