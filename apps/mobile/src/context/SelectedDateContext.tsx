import React, { createContext, useContext, ReactNode, useState } from 'react';

interface SelectedDateContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const SelectedDateContext = createContext<SelectedDateContextType | undefined>(undefined);

interface SelectedDateProviderProps {
  children: ReactNode;
}

export function SelectedDateProvider({ children }: SelectedDateProviderProps) {
  // Always start with today's date when app loads
  const [selectedDate, setSelectedDateState] = useState<Date>(new Date());

  // No longer load saved date on mount - always start with today
  // This ensures the calendar always defaults to the current date when the app loads

  const setSelectedDate = (date: Date) => {
    // Simply update the state - no persistence needed since we always start with today
    setSelectedDateState(date);
  };

  const value: SelectedDateContextType = {
    selectedDate,
    setSelectedDate,
  };

  return <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>;
}

export function useSelectedDate() {
  const ctx = useContext(SelectedDateContext);
  if (!ctx) throw new Error('useSelectedDate must be used within a SelectedDateProvider');
  return ctx;
}
