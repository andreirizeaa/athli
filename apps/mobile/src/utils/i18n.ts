import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { getSelectedLanguage } from '../services/storageService';
import { en } from '../languages/en';
import { es } from '../languages/es';
import { zh } from '../languages/zh';
import { it } from '../languages/it';
import { pt } from '../languages/pt';
import { ro } from '../languages/ro';
import { de } from '../languages/de';
import { fr } from '../languages/fr';
import { ar } from '../languages/ar';

const i18n = new I18n({
  en,
  es,
  zh,
  it,
  pt,
  ro,
  de,
  fr,
  ar,
});

// Initialize i18n with fallback
i18n.enableFallback = true;

// Function to initialize language from AsyncStorage or device settings
async function initializeLanguage() {
  try {
    // First try to get saved language from AsyncStorage
    const savedLanguage = await getSelectedLanguage();

    if (savedLanguage) {
      i18n.locale = savedLanguage;
      return;
    }

    // Fallback to device language
    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
    i18n.locale = deviceLanguage;
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
