import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import i18n, { setLanguage } from '../utils/i18n';
import { getSelectedLanguage } from '../services/storageService';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (languageCode: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.locale);

  // Initialize language from AsyncStorage
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // Try to get from AsyncStorage
        const savedLanguage = await getSelectedLanguage();
        if (savedLanguage) {
          setLanguage(savedLanguage);
          setCurrentLanguage(savedLanguage);
          return;
        }

        // Final fallback to current i18n locale
        setCurrentLanguage(i18n.locale);
      } catch (error) {
        console.warn('Error initializing language:', error);
        setCurrentLanguage(i18n.locale);
      }
    };

    initializeLanguage();
  }, []);

  const handleSetLanguage = async (languageCode: string) => {
    // Update i18n immediately
    setLanguage(languageCode);
    setCurrentLanguage(languageCode);

    // Save to AsyncStorage
    try {
      const { setSelectedLanguage } = await import('../services/storageService');
      await setSelectedLanguage(languageCode);
    } catch (error) {
      console.warn('Error saving language to AsyncStorage:', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage: handleSetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
