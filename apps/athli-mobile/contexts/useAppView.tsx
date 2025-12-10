import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

export type AppView = 'athlete' | 'coach';

type AppViewContextValue = {
  appView: AppView;
  setAppView: (view: AppView) => void;
};

const AppViewContext = createContext<AppViewContextValue | undefined>(undefined);

export const AppViewProvider = ({ children }: { children: ReactNode }) => {
  const [appView, setAppView] = useState<AppView>('athlete');

  return (
    <AppViewContext.Provider value={{ appView, setAppView }}>
      {children}
    </AppViewContext.Provider>
  );
};

export const useAppView = () => {
  const context = useContext(AppViewContext);

  if (!context) {
    throw new Error('useAppView must be used within an AppViewProvider');
  }

  return context;
};


