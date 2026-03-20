import React, { createContext, useContext, useState, useMemo } from 'react';
import { light, dark } from './colors';

const ThemeCtx = createContext({
  C: light,
  isDark: false,
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const value = useMemo(
    () => ({
      C: isDark ? dark : light,
      isDark,
      toggle: () => setIsDark((d) => !d),
    }),
    [isDark],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}


