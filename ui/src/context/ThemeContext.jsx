import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [systemTheme, setSystemTheme] = useState('dark');

  // Load theme from localStorage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('pulsar-ui-theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }

    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for system theme changes
    const handleSystemThemeChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Effect to handle theme changes
  useEffect(() => {
    let effectiveTheme = theme;

    // If theme is 'system', use system preference
    if (theme === 'system') {
      effectiveTheme = systemTheme;
    }

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    localStorage.setItem('pulsar-ui-theme', theme);
  }, [theme, systemTheme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark'; // from system back to dark
    });
  };

  const setThemeDirect = (newTheme) => {
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  // Get current effective theme
  const currentTheme = theme === 'system' ? systemTheme : theme;

  return (
    <ThemeContext.Provider value={{
      theme,
      currentTheme,
      systemTheme,
      toggleTheme,
      setTheme: setThemeDirect
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}