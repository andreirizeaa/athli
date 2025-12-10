import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';
import { en } from '../lib/i18n/en';

type TranslationMessages = typeof en;

type TranslationContextValue = {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
};

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

const getNestedValue = (obj: any, path: string): string => {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return path;
    }
  }
  return typeof value === 'string' ? value : path;
};

const messagesMap: Record<string, TranslationMessages> = {
  en,
};

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<string>('en');

  const setLocale = (newLocale: string) => {
    if (newLocale in messagesMap) {
      setLocaleState(newLocale);
      // Save to storage if AsyncStorage is available
      // This can be enhanced later with AsyncStorage
    }
  };

  const t = (key: string): string => {
    const messages = messagesMap[locale] || messagesMap.en;
    return getNestedValue(messages, key);
  };

  return (
    <TranslationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslations = () => {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error('useTranslations must be used within a TranslationProvider');
  }

  return context;
};

