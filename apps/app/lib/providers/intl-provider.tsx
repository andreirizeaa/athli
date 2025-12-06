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
  const [locale, setLocaleState] = useState<string>('en');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load language from localStorage or default to 'en'
    const savedLocale = localStorage.getItem('language') || 'en';
    if (availableLanguages.some((lang) => lang.code === savedLocale)) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem('language', newLocale);
  };

  const messages = messagesMap[locale as keyof typeof messagesMap] || enMessages;
  const currentLocale = locale || 'en';

  if (!isMounted) {
    // Return default during SSR/hydration
    return (
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    );
  }

  return (
    <LanguageContext.Provider value={{ locale: currentLocale, setLocale }}>
      <NextIntlClientProvider locale={currentLocale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
};
