// FILE: src/App.js

import React, { useState, useMemo, useEffect } from 'react';
import { View, StatusBar, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { APP_CONFIG } from './config/env';
import { SeoProvider } from './seo/SeoProvider';
import { getCurrentUser, logoutPatient } from './api';

// Screens
import { AuthScreen } from './screens/authentication';
import { MainShell } from './screens/MainShell';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isDark } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const sessionUser = await getCurrentUser();
        if (active && sessionUser) {
          setUser(sessionUser);
        }
      } catch {
        // Keep auth screen as fallback when no active session exists.
      }
    };
    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  // Force-logout when the API layer reports the session/cookie is no longer
  // valid (401/403). The local store is wiped inside the request client.
  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.addEventListener) return;
    const handler = () => setUser(null);
    globalThis.addEventListener('gonep:session-invalid', handler);
    return () => globalThis.removeEventListener('gonep:session-invalid', handler);
  }, []);

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      },
    }),
    [isDark],
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Gonep Healthcare">
            {(props) => (
              <AuthScreen
                {...props}
                onAuth={setUser}
                appName={APP_CONFIG.APP_NAME}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main">
            {(props) => (
              <MainShell
                {...props}
                user={user}
                onLogout={async () => {
                  try { await logoutPatient(); } catch { /* ignore */ }
                  setUser(null);
                }}
                onUpdateUser={setUser}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SeoProvider>
          <View style={styles.root}>
            <StatusBar
              barStyle={Platform.OS === 'ios' ? 'default' : 'light-content'}
            />
            <RootNavigator />
          </View>
        </SeoProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});