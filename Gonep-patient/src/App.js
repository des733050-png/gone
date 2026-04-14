import React, { useState, useMemo } from 'react';
import { View, StatusBar, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { APP_CONFIG } from './config/env';
import { SeoProvider } from './seo/SeoProvider';

// Screens
import { AuthScreen } from './screens/authentication';
import { MainShell } from './screens/MainShell';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isDark } = useTheme();
  const [user, setUser] = useState(null);

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
          <Stack.Screen name="Auth">
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


