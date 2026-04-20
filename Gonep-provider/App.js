import React, { useState, useMemo, useEffect } from 'react';
import { View, StatusBar, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { SeoProvider } from './src/seo/SeoProvider';
import { APP_CONFIG } from './src/config/env';
import { PAGE_PATHS } from './src/seo/meta';
import { getCurrentUser, logoutProvider } from './src/api';
import { normalizeRole } from './src/config/roles';
import { AuthScreen }                from './src/screens/Auth/Authentication';
import { MainShell }                 from './src/screens/MainShell';
import { HospitalOnboardingScreen }  from './src/screens/Auth/Onboarding';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isDark, C } = useTheme();
  const [user, setUser] = useState(null);
  // showOnboarding: true = new hospital registering (no existing account)
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const sessionUser = await getCurrentUser();
        if (active && sessionUser) {
          setUser({ ...sessionUser, role: normalizeRole(sessionUser.role) });
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


  // React Navigation linking config — gives each page a clean URL on web.
  // On iOS/Android this is a no-op (in-app navigation only).
  // Native deep-link support can be added later via app.json scheme config.
  const linking = React.useMemo(() => ({
    prefixes: [],
    config: {
      screens: {
        // Keep auth route unique so it doesn't conflict with Main's root pattern.
        Auth: 'login',
        Main: {
          path: '',
          screens: Object.fromEntries(
            Object.entries(PAGE_PATHS).map(([id, path]) => [id, path.slice(1)])
          ),
        },
      },
    },
  }), []);

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors) },
    }),
    [isDark],
  );

  // Hospital onboarding flow — accessible from auth screen
  if (showOnboarding) {
    return (
      <HospitalOnboardingScreen
        onComplete={() => setShowOnboarding(false)}
        onBack={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking} documentTitle={{ enabled: false }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth">
            {(props) => (
              <View style={{ flex: 1 }}>
                <AuthScreen
                  {...props}
                  onAuth={(u) => { setUser({ ...u, role: normalizeRole(u?.role) }); }}
                  appName={APP_CONFIG.APP_NAME}
                  onRegister={() => setShowOnboarding(true)}
                />
              </View>
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main">
            {(props) => (
              <MainShell
                {...props}
                user={user}
                onLogout={async () => {
                  try {
                    await logoutProvider();
                  } finally {
                    setUser(null);
                  }
                }}
                onUpdateUser={(nextUser) => {
                  setUser(nextUser ? { ...nextUser, role: normalizeRole(nextUser.role) } : null);
                }}
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
            <StatusBar barStyle={Platform.OS === 'ios' ? 'default' : 'light-content'} />
            <RootNavigator />
          </View>
        </SeoProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },

});