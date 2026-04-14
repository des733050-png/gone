// ─── ThemeContext.js ──────────────────────────────────────────────────────────
// Device-wide theme persistence. One preference for the whole device —
// dark mode stays dark regardless of who logs in or out.
// Web: localStorage · Native: AsyncStorage (falls back to in-memory)
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  createContext, useContext, useState, useMemo, useEffect, useCallback,
} from 'react';
import { Platform } from 'react-native';
import { light, dark } from './colors';

const STORAGE_KEY = 'gonep_theme_device';

const ThemeCtx = createContext({ C: light, isDark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

async function readTheme() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'dark';
    }
    const AS = require('@react-native-async-storage/async-storage').default;
    return (await AS.getItem(STORAGE_KEY)) === 'dark';
  } catch {
    return false;
  }
}

async function writeTheme(isDark) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
      return;
    }
    const AS = require('@react-native-async-storage/async-storage').default;
    await AS.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {}
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    readTheme().then(saved => {
      if (active) { setIsDark(saved); setLoaded(true); }
    });
    return () => { active = false; };
  }, []);

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      writeTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    C: isDark ? dark : light,
    isDark,
    toggle,
    themeLoaded: loaded,
  }), [isDark, toggle, loaded]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}