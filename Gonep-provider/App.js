import React, { useState, useMemo } from 'react';
import { View, StatusBar, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { SeoProvider } from './src/seo/SeoProvider';
import { APP_CONFIG } from './src/config/env';
import { AuthScreen } from './src/screens/Auth/AuthScreen';
import { MainShell } from './src/screens/MainShell';
import { HospitalOnboardingScreen } from './src/screens/Onboarding';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isDark, C } = useTheme();
  const [user, setUser] = useState(null);
  // showOnboarding: true = new hospital registering (no existing account)
  const [showOnboarding, setShowOnboarding] = useState(false);

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
      />
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth">
            {(props) => (
              <View style={{ flex: 1 }}>
                <AuthScreen
                  {...props}
                  onAuth={setUser}
                  appName={APP_CONFIG.APP_NAME}
                />
                {/* Register hospital link */}
                <View style={[styles.registerBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
                  <Text style={{ color: C.textMuted, fontSize: 13 }}>Are you a hospital?</Text>
                  <TouchableOpacity onPress={() => setShowOnboarding(true)} style={styles.registerBtn}>
                    <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>Register your facility →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Main">
            {(props) => (
              <MainShell
                {...props}
                user={user}
                onLogout={() => setUser(null)}
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
  registerBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1 },
  registerBtn: { padding: 4 },
});
