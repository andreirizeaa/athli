import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

type TrainingOverlayContextValue = {
  isVisible: boolean;
  showOverlay: () => void;
  hideOverlay: () => void;
};

const TrainingOverlayContext = createContext<TrainingOverlayContextValue | undefined>(undefined);

export const TrainingOverlayProvider = ({ children }: { children: ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);

  const showOverlay = () => setIsVisible(true);
  const hideOverlay = () => setIsVisible(false);

  return (
    <TrainingOverlayContext.Provider value={{ isVisible, showOverlay, hideOverlay }}>
      {children}
    </TrainingOverlayContext.Provider>
  );
};

export const useTrainingOverlay = () => {
  const context = useContext(TrainingOverlayContext);

  if (!context) {
    throw new Error('useTrainingOverlay must be used within a TrainingOverlayProvider');
  }

  return context;
};

