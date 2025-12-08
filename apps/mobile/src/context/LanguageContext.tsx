import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import i18n, { setLanguage } from '../utils/i18n';

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

  // Initialize language on mount
  useEffect(() => {
    setCurrentLanguage(i18n.locale);
  }, []);

  const handleSetLanguage = async (languageCode: string) => {
    // Update i18n immediately
    setLanguage(languageCode);
    setCurrentLanguage(languageCode);
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

