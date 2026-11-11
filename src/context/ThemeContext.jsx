import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'intranuit:theme';

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const DARK = {
  name: 'dark',
  // Backgrounds
  bg: '#0e0b0c',
  bgPanel: 'rgba(10,10,10,0.95)',
  bgCard: 'rgba(255,255,255,0.01)',
  bgInput: 'transparent',
  bgInputFocus: 'rgba(0,0,0,0.2)',
  bgResponse: 'rgba(0,0,0,0.2)',
  bgSelect: 'rgba(0,0,0,0.4)',
  bgTable: '#0e0b0c',
  bgTableHead: '#171314',
  bgTableRow: 'transparent',
  bgTableRowHover: 'rgba(255,255,255,0.008)',
  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.12)',
  borderCell: 'rgba(255,255,255,0.06)',
  // Text
  textPrimary: '#f3eeeb',
  textSecondary: '#c4b9b5',
  textMuted: '#a89d99',
  textDim: '#8a7f7b',
  textInput: '#e4e4e7',
  textResponse: '#e4e4e7',
  textSerif: '#d4d4d8',
  // Nav/tabs
  tabBg: 'rgba(255,255,255,0.02)',
  tabBorder: 'rgba(255,255,255,0.04)',
};

export const LIGHT = {
  name: 'light',
  // Backgrounds
  bg: '#f4f1ec',
  bgPanel: '#faf8f5',
  bgCard: 'rgba(0,0,0,0.02)',
  bgInput: 'rgba(0,0,0,0.03)',
  bgInputFocus: 'rgba(0,0,0,0.06)',
  bgResponse: 'rgba(0,0,0,0.04)',
  bgSelect: 'rgba(0,0,0,0.04)',
  bgTable: '#faf8f5',
  bgTableHead: '#f0ede8',
  bgTableRow: 'transparent',
  bgTableRowHover: 'rgba(0,0,0,0.02)',
  // Borders
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.1)',
  borderCell: 'rgba(0,0,0,0.06)',
  // Text
  textPrimary: '#1c1917',
  textSecondary: '#57534e',
  textMuted: '#6b605c',
  textDim: '#857a74',
  textInput: '#1c1917',
  textResponse: '#1c1917',
  textSerif: '#292524',
  // Nav/tabs
  tabBg: 'rgba(0,0,0,0.04)',
  tabBorder: 'rgba(0,0,0,0.08)',
};

const ThemeContext = createContext({ theme: DARK, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => (readStoredTheme() === 'light' ? LIGHT : DARK));
  const toggleTheme = () => setTheme(t => {
    const next = t.name === 'dark' ? LIGHT : DARK;
    try { localStorage.setItem(STORAGE_KEY, next.name); } catch { /* navigation privée */ }
    return next;
  });
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}