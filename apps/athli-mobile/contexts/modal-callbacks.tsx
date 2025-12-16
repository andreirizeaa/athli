import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Client } from '@/services/client-service';

type RepeatData = {
  type: 'weekly' | 'monthly';
  every?: number;
  for?: number | 'ever';
  weekdays?: string[];
  monthDays?: number[];
};

type ModalCallbacksContextType = {
  setClientSelectCallback: (callback: (client: Client) => void) => void;
  setTypeSelectCallback: (callback: (type: string) => void) => void;
  setRepeatSelectCallback: (callback: (data: RepeatData) => void) => void;
  setNumberSelectCallback: (callback: (value: number | 'ever') => void) => void;
  triggerClientSelect: (client: Client) => void;
  triggerTypeSelect: (type: string) => void;
  triggerRepeatSelect: (data: RepeatData) => void;
  triggerNumberSelect: (value: number | 'ever') => void;
  getRepeatData: () => RepeatData | null;
  setRepeatData: (data: RepeatData | null) => void;
};

const ModalCallbacksContext = createContext<ModalCallbacksContextType | null>(null);

export const ModalCallbacksProvider = ({ children }: { children: React.ReactNode }) => {
  const [clientSelectCallback, setClientSelectCallbackState] = useState<((client: Client) => void) | null>(null);
  const [typeSelectCallback, setTypeSelectCallbackState] = useState<((type: string) => void) | null>(null);
  const [repeatSelectCallback, setRepeatSelectCallbackState] = useState<((data: RepeatData) => void) | null>(null);
  const [numberSelectCallback, setNumberSelectCallbackState] = useState<((value: number | 'ever') => void) | null>(null);
  const [storedRepeatData, setStoredRepeatData] = useState<RepeatData | null>(null);

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

  return (
    <ModalCallbacksContext.Provider
      value={{
        setClientSelectCallback,
        setTypeSelectCallback,
        setRepeatSelectCallback,
        setNumberSelectCallback,
        triggerClientSelect,
        triggerTypeSelect,
        triggerRepeatSelect,
        triggerNumberSelect,
        getRepeatData,
        setRepeatData,
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
