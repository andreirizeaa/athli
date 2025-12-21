'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, createContext, useContext } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { enMessages } from '@/lib/i18n/en';
import { esMessages } from '@/lib/i18n/es';

type IntlProviderProps = {
  children: ReactNode;
};

export type Language = {
  code: string;
  label: string;
  flag: string;
};

export const availableLanguages: Language[] = [
  {
    code: 'en',
    label: 'English',
    flag: '🇬🇧',
  },
  {
    code: 'es',
    label: 'Español',
    flag: '🇪🇸',
  },
];

type LanguageContextType = {
  locale: string;
  setLocale: (locale: string) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within IntlProvider');
  }
  return context;
};

const messagesMap = {
  en: enMessages,
  es: esMessages,
} as const;

export const IntlProvider = ({ children }: IntlProviderProps) => {
  // Initialize with 'en' to ensure context is always available
  const [locale, setLocaleState] = useState<string>('en');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load language from localStorage or default to 'en'
    if (typeof window !== 'undefined') {
    const savedLocale = localStorage.getItem('language') || 'en';
    if (availableLanguages.some((lang) => lang.code === savedLocale)) {
      setLocaleState(savedLocale);
      }
    }
  }, []);

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
    localStorage.setItem('language', newLocale);
    }
  };

  const messages = messagesMap[locale as keyof typeof messagesMap] || enMessages;
  const currentLocale = locale || 'en';

  // Always render NextIntlClientProvider to ensure context is available
  // Use default 'en' during SSR and initial render, then update to saved locale after mount
  // This ensures the context is always available, preventing "context not found" errors
  const providerLocale = isMounted ? currentLocale : 'en';
  const providerMessages = isMounted ? messages : enMessages;

  return (
    <LanguageContext.Provider value={{ locale: currentLocale, setLocale }}>
      <NextIntlClientProvider 
        key="intl-provider"
        locale={providerLocale} 
        messages={providerMessages} 
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
};
