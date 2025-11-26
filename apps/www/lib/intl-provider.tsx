'use client';

import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { enMessages } from '@/lib/i18n/en';

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
];

export const IntlProvider = ({ children }: IntlProviderProps) => {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
};
