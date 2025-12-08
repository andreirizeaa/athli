import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ViewType = 'athlete' | 'coach';

interface ViewContextType {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  switchView: () => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

interface ViewProviderProps {
  children: ReactNode;
}

export function ViewProvider({ children }: ViewProviderProps) {
  const [currentView, setCurrentView] = useState<ViewType>('athlete');

  const setView = (view: ViewType) => {
    setCurrentView(view);
  };

  const switchView = () => {
    setCurrentView((prev) => (prev === 'athlete' ? 'coach' : 'athlete'));
  };

  return (
    <ViewContext.Provider value={{ currentView, setView, switchView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}

