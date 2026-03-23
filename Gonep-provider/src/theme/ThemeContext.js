// ─── ThemeContext.js ──────────────────────────────────────────────────────────
// Theme state with device persistence keyed by user email.
// • In mock/web: uses localStorage (Platform.OS === 'web')
// • In native: uses AsyncStorage if available, falls back to in-memory
//
// PERSISTENCE KEY: 'gonep_theme_{email}'
// This means each user's preference survives logout/login on the same device.
// When no email is given (pre-login), falls back to 'gonep_theme_default'.
//
// Why keyed by email and not role?
//   Roles can be changed by admin. Email is a stable identity marker per device.
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  createContext, useContext, useState, useMemo, useEffect, useCallback,
} from 'react';
import { Platform } from 'react-native';
import { light, dark } from './colors';

const ThemeCtx = createContext({ C: light, isDark: false, toggle: () => {}, setUserKey: () => {} });
export const useTheme = () => useContext(ThemeCtx);

// ─── Storage helpers ──────────────────────────────────────────────────────────
function storageKey(email) {
  return `gonep_theme_${email || 'default'}`;
}

async function readTheme(email) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(storageKey(email));
      return v === 'dark';
    }
    // React Native — try AsyncStorage (optional dep)
    const AS = require('@react-native-async-storage/async-storage').default;
    const v = await AS.getItem(storageKey(email));
    return v === 'dark';
  } catch {
    return false; // default light
  }
}

async function writeTheme(email, isDark) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey(email), isDark ? 'dark' : 'light');
      return;
    }
    const AS = require('@react-native-async-storage/async-storage').default;
    await AS.setItem(storageKey(email), isDark ? 'dark' : 'light');
  } catch {
    // storage unavailable — preference not persisted this session
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [isDark,  setIsDark]  = useState(false);
  const [userKey, setUserKey] = useState('default');
  const [loaded,  setLoaded]  = useState(false);

  // Load persisted preference whenever userKey changes (i.e. on login)
  useEffect(() => {
    let active = true;
    readTheme(userKey).then(saved => {
      if (active) { setIsDark(saved); setLoaded(true); }
    });
    return () => { active = false; };
  }, [userKey]);

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      writeTheme(userKey, next);
      return next;
    });
  }, [userKey]);

  const value = useMemo(() => ({
    C: isDark ? dark : light,
    isDark,
    toggle,
    setUserKey,   // call this with user.email after login
    themeLoaded: loaded,
  }), [isDark, toggle, loaded]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
