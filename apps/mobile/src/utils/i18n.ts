import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { en } from '../languages/en';

const i18n = new I18n({
  en,
});

// Initialize i18n with fallback
i18n.enableFallback = true;

// Function to initialize language from device settings
async function initializeLanguage() {
  try {
    // Always use English
    i18n.locale = 'en';
  } catch (error) {
    console.warn('Error initializing language:', error);
    // Final fallback to English
    i18n.locale = 'en';
  }
}

// Initialize language on startup
initializeLanguage();

// Function to update language (can be called from components)
export function setLanguage(language: string) {
  i18n.locale = language;
}

export default i18n;
