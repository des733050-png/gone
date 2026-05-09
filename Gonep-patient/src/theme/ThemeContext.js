import React, { createContext, useContext, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import { light, dark } from './colors';

export const typography = {
  fontFamily: Platform.select({
    ios:     'Georgia',
    android: 'serif',
    web:     '"Times New Roman", Times, serif',
    default: 'serif',
  }),
  h1:   22,
  h2:   18,
  h3:   15,
  body: 14,
  sm:   13,
  xs:   11,
};

const ThemeCtx = createContext({
  C: light,
  isDark: false,
  toggle: () => {},
  typography,
});

export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const value = useMemo(
    () => ({
      C: isDark ? dark : light,
      isDark,
      toggle: () => setIsDark((d) => !d),
      typography,
    }),
    [isDark],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}


