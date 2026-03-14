import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';
import api from './api';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('EN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load language from user preference or localStorage
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && (savedLang === 'EN' || savedLang === 'KN')) {
      setLanguageState(savedLang);
    }
    setLoading(false);
  }, []);

  const setLanguage = async (lang) => {
    if (lang !== 'EN' && lang !== 'KN') return;
    
    setLanguageState(lang);
    localStorage.setItem('preferredLanguage', lang);
    
    // Update user preference in backend if logged in
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await api.put('/users/language', null, { params: { language: lang } });
      } catch (error) {
        console.error('Failed to update language preference:', error);
      }
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['EN']?.[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
    loading,
    isKannada: language === 'KN',
    isEnglish: language === 'EN',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
