import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Client } from '@/services/client-service';

type RepeatData = {
  type: 'weekly' | 'monthly';
  every?: number;
  for?: number | 'ever';
  weekdays?: string[];
  monthDays?: number[];
};

// Matches web app HabitFormValues optional fields
export type HabitOptionsData = {
  duration?: number; // Duration in days
  reminderTime?: string; // Time string like "07:00"
  reminderMessage?: string;
};

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type MonthlyOption = 'first' | 'last' | 'specific';

export type ScheduleData = {
  frequency: ScheduleFrequency;
  selectedDays?: string[]; // For daily, weekly, biweekly
  monthlyOption?: MonthlyOption; // For monthly
  specificDay?: number; // For monthly with specific day (1-28)
};

type ModalCallbacksContextType = {
  setClientSelectCallback: (callback: (client: Client) => void) => void;
  setTypeSelectCallback: (callback: (type: string) => void) => void;
  setRepeatSelectCallback: (callback: (data: RepeatData) => void) => void;
  setNumberSelectCallback: (callback: (value: number | 'ever') => void) => void;
  setHabitOptionsCallback: (callback: (data: HabitOptionsData) => void) => void;
  setScheduleCallback: (callback: (data: ScheduleData) => void) => void;
  triggerClientSelect: (client: Client) => void;
  triggerTypeSelect: (type: string) => void;
  triggerRepeatSelect: (data: RepeatData) => void;
  triggerNumberSelect: (value: number | 'ever') => void;
  triggerHabitOptionsSelect: (data: HabitOptionsData) => void;
  triggerScheduleSelect: (data: ScheduleData) => void;
  getRepeatData: () => RepeatData | null;
  setRepeatData: (data: RepeatData | null) => void;
  getHabitOptionsData: () => HabitOptionsData | null;
  setHabitOptionsData: (data: HabitOptionsData | null) => void;
  getScheduleData: () => ScheduleData | null;
  setScheduleData: (data: ScheduleData | null) => void;
  habitOptionsData: HabitOptionsData | null;
  scheduleData: ScheduleData | null;
};

const ModalCallbacksContext = createContext<ModalCallbacksContextType | null>(null);

export const ModalCallbacksProvider = ({ children }: { children: React.ReactNode }) => {
  const [clientSelectCallback, setClientSelectCallbackState] = useState<((client: Client) => void) | null>(null);
  const [typeSelectCallback, setTypeSelectCallbackState] = useState<((type: string) => void) | null>(null);
  const [repeatSelectCallback, setRepeatSelectCallbackState] = useState<((data: RepeatData) => void) | null>(null);
  const [numberSelectCallback, setNumberSelectCallbackState] = useState<((value: number | 'ever') => void) | null>(null);
  const [habitOptionsCallback, setHabitOptionsCallbackState] = useState<((data: HabitOptionsData) => void) | null>(null);
  const [scheduleCallback, setScheduleCallbackState] = useState<((data: ScheduleData) => void) | null>(null);
  const [storedRepeatData, setStoredRepeatData] = useState<RepeatData | null>(null);
  const [storedHabitOptionsData, setStoredHabitOptionsData] = useState<HabitOptionsData | null>(null);
  const [storedScheduleData, setStoredScheduleData] = useState<ScheduleData | null>(null);

  const setClientSelectCallback = useCallback((callback: (client: Client) => void) => {
    setClientSelectCallbackState(() => callback);
  }, []);

  const setTypeSelectCallback = useCallback((callback: (type: string) => void) => {
    setTypeSelectCallbackState(() => callback);
  }, []);

  const setRepeatSelectCallback = useCallback((callback: (data: RepeatData) => void) => {
    setRepeatSelectCallbackState(() => callback);
  }, []);

  const setNumberSelectCallback = useCallback((callback: (value: number | 'ever') => void) => {
    setNumberSelectCallbackState(() => callback);
  }, []);

  const setHabitOptionsCallback = useCallback((callback: (data: HabitOptionsData) => void) => {
    setHabitOptionsCallbackState(() => callback);
  }, []);

  const setScheduleCallback = useCallback((callback: (data: ScheduleData) => void) => {
    setScheduleCallbackState(() => callback);
  }, []);

  const triggerClientSelect = useCallback((client: Client) => {
    if (clientSelectCallback) {
      clientSelectCallback(client);
      setClientSelectCallbackState(null);
    }
  }, [clientSelectCallback]);

  const triggerTypeSelect = useCallback((type: string) => {
    if (typeSelectCallback) {
      typeSelectCallback(type);
      setTypeSelectCallbackState(null);
    }
  }, [typeSelectCallback]);

  const triggerRepeatSelect = useCallback((data: RepeatData) => {
    setStoredRepeatData(data);
    if (repeatSelectCallback) {
      repeatSelectCallback(data);
      setRepeatSelectCallbackState(null);
    }
  }, [repeatSelectCallback]);

  const getRepeatData = useCallback(() => {
    return storedRepeatData;
  }, [storedRepeatData]);

  const setRepeatData = useCallback((data: RepeatData | null) => {
    setStoredRepeatData(data);
  }, []);

  const triggerNumberSelect = useCallback((value: number | 'ever') => {
    if (numberSelectCallback) {
      numberSelectCallback(value);
      setNumberSelectCallbackState(null);
    }
  }, [numberSelectCallback]);

  const triggerHabitOptionsSelect = useCallback((data: HabitOptionsData) => {
    setStoredHabitOptionsData(data);
    if (habitOptionsCallback) {
      habitOptionsCallback(data);
      setHabitOptionsCallbackState(null);
    }
  }, [habitOptionsCallback]);

  const getHabitOptionsData = useCallback(() => {
    return storedHabitOptionsData;
  }, [storedHabitOptionsData]);

  const setHabitOptionsData = useCallback((data: HabitOptionsData | null) => {
    setStoredHabitOptionsData(data);
  }, []);

  const triggerScheduleSelect = useCallback((data: ScheduleData) => {
    setStoredScheduleData(data);
    if (scheduleCallback) {
      scheduleCallback(data);
      setScheduleCallbackState(null);
    }
  }, [scheduleCallback]);

  const getScheduleData = useCallback(() => {
    return storedScheduleData;
  }, [storedScheduleData]);

  const setScheduleData = useCallback((data: ScheduleData | null) => {
    setStoredScheduleData(data);
  }, []);

  return (
    <ModalCallbacksContext.Provider
      value={{
        setClientSelectCallback,
        setTypeSelectCallback,
        setRepeatSelectCallback,
        setNumberSelectCallback,
        setHabitOptionsCallback,
        setScheduleCallback,
        triggerClientSelect,
        triggerTypeSelect,
        triggerRepeatSelect,
        triggerNumberSelect,
        triggerHabitOptionsSelect,
        triggerScheduleSelect,
        getRepeatData,
        setRepeatData,
        getHabitOptionsData,
        setHabitOptionsData,
        getScheduleData,
        setScheduleData,
        habitOptionsData: storedHabitOptionsData,
        scheduleData: storedScheduleData,
      }}
    >
      {children}
    </ModalCallbacksContext.Provider>
  );
};

export const useModalCallbacks = () => {
  const context = useContext(ModalCallbacksContext);
  if (!context) {
    throw new Error('useModalCallbacks must be used within ModalCallbacksProvider');
  }
  return context;
};
