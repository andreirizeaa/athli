import { create } from 'zustand';
import { Storage } from '@/lib/storage';
import { en } from '@/lib/i18n/en';

type TranslationMessages = typeof en;

const LOCALE_KEY = '@athli:locale';

const messagesMap: Record<string, TranslationMessages> = {
  en,
};

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

type TranslationsStore = {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
  initialize: () => void;
};

export const useTranslationsStore = create<TranslationsStore>((set, get) => ({
  locale: 'en',

  initialize: () => {
    try {
      const savedLocale = Storage.getItem(LOCALE_KEY);
      if (savedLocale && savedLocale in messagesMap) {
        set({ locale: savedLocale });
      }
    } catch (error) {
      console.error('Failed to load locale:', error);
    }
  },

  setLocale: (newLocale) => {
    if (newLocale in messagesMap) {
      try {
        Storage.setItem(LOCALE_KEY, newLocale);
      } catch (error) {
        console.error('Failed to save locale:', error);
      }
      set({ locale: newLocale });
    }
  },

  t: (key: string): string => {
    const state = get();
    const messages = messagesMap[state.locale] || messagesMap.en;
    return getNestedValue(messages, key);
  },
}));
