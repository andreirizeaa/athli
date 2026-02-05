import { create } from 'zustand';
import { Storage } from '@/lib/storage';
import { en } from '@/lib/i18n/en';

type TranslationMessages = typeof en;

const LOCALE_KEY = '@athli:locale';

const messagesMap: Record<string, TranslationMessages> = {
  en,
};

const getNestedValue = (obj: any, path: string, params?: Record<string, string | number>): string => {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return path;
    }
  }

  if (typeof value === 'string') {
    if (params) {
      let result = value;
      Object.entries(params).forEach(([key, val]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
      });
      return result;
    }
    return value;
  }
  return path;
};

type TranslationsStore = {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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

  t: (key: string, params?: Record<string, string | number>): string => {
    const state = get();
    const messages = messagesMap[state.locale] || messagesMap.en;
    return getNestedValue(messages, key, params);
  },
}));
