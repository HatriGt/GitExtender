
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = 'light' | 'dark';
type BackgroundTheme = 'default' | 'gradient' | 'dots' | 'waves' | 'geometric' | 'circuit' | 'blueprint' | 'bubbles' | 'nebula' | 'hexagons';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  backgroundTheme: BackgroundTheme;
  setBackgroundTheme: (theme: BackgroundTheme) => void;
}

const defaultContext: ThemeContextType = {
  theme: 'light',
  toggleTheme: () => {},
  backgroundTheme: 'default',
  setBackgroundTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = window.localStorage.getItem('gitextender-theme');
      return (savedTheme as Theme) || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
    return 'light'; // Default for SSR
  });
  
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>(() => {
    if (typeof window !== 'undefined') {
      const savedBgTheme = window.localStorage.getItem('gitextender-bg-theme');
      return (savedBgTheme as BackgroundTheme) || 'default';
    }
    return 'default';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      window.localStorage.setItem('gitextender-theme', theme);
    }
  }, [theme]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('gitextender-bg-theme', backgroundTheme);
    }
  }, [backgroundTheme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, backgroundTheme, setBackgroundTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
