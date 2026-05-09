import React, { useState, useMemo, useEffect } from 'react';
import { View, StatusBar, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { SeoProvider } from './src/seo/SeoProvider';
import { APP_CONFIG } from './src/config/env';
import { getCurrentUser, logoutProvider } from './src/api';
import { normalizeRole } from './src/config/roles';
import { AuthScreen }                from './src/screens/Auth/Authentication';
import { MainShell }                 from './src/screens/MainShell';
import { HospitalOnboardingScreen }  from './src/screens/Auth/Onboarding';
import { VerificationGateScreen }    from './src/screens/Auth/Onboarding/VerificationGateScreen';
import { GettingStartedOverlay }     from './src/screens/Auth/Onboarding/GettingStartedOverlay';
import MuiXProvider from './src/mui/MuiXProvider';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isDark } = useTheme();
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

  // ── Auto-logout on session/cookie mismatch ───────────────────────────────────
  // The request layer dispatches `gonep:session-invalid` whenever a 401/403 is
  // returned for a previously-authenticated request. We force-clear local user
  // state so the AuthScreen is shown immediately. Local store is already
  // wiped inside the request layer.
  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.addEventListener) return;
    const handler = () => setUser(null);
    globalThis.addEventListener('gonep:session-invalid', handler);
    return () => globalThis.removeEventListener('gonep:session-invalid', handler);
  }, []);

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors) },
    }),
    [isDark],
  );

  // After onboarding finishes we pre-fill the auth screen with the admin
  // email so the new admin can sign straight in.
  const [prefilledEmail, setPrefilledEmail] = useState('');

  // Hospital onboarding flow — accessible from auth screen
  if (showOnboarding) {
    return (
      <HospitalOnboardingScreen
        onComplete={(payload) => {
          if (payload?.adminEmail) setPrefilledEmail(payload.adminEmail);
          setShowOnboarding(false);
        }}
        onBack={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <NavigationContainer theme={navTheme} documentTitle={{ enabled: false }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Gonep Healthcare">
            {(props) => (
              <View style={{ flex: 1 }}>
                <AuthScreen
                  {...props}
                  onAuth={(u) => { setUser({ ...u, role: normalizeRole(u?.role) }); }}
                  appName={APP_CONFIG.APP_NAME}
                  onRegister={() => setShowOnboarding(true)}
                  prefilledEmail={prefilledEmail}
                />
              </View>
            )}
          </Stack.Screen>
        ): (
          <Stack.Screen name="Main">
            {(props) => (
              <PostLoginShell
                {...props}
                user={user}
                setUser={setUser}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// PostLoginShell gates the main portal behind:
//   1. facility verification (VerificationGateScreen)
//   2. one-time getting-started overlay (after VERIFIED, only first time)
function PostLoginShell({ user, setUser, ...rest }) {
  // Re-read the user object's verification fields. The session payload
  // includes `verification_status` + `access` from build_provider_payload.
  const verificationStatus = user?.verification_status || 'UNVERIFIED';
  const isVerified = verificationStatus === 'VERIFIED';

  const handleLogout = async () => {
    try { await logoutProvider(); } finally { setUser(null); }
  };

  if (!isVerified) {
    return (
      <VerificationGateScreen
        user={user}
        onUnlock={async () => {
          // After verification approval, refresh user payload to pick up
          // the new verification_status + access flags.
          try {
            const fresh = await getCurrentUser();
            if (fresh) setUser({ ...fresh, role: normalizeRole(fresh.role) });
          } catch (_) {}
        }}
        onLogout={() => setUser(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MainShell
        {...rest}
        user={user}
        onLogout={handleLogout}
        onUpdateUser={(nextUser) => {
          setUser(nextUser ? { ...nextUser, role: normalizeRole(nextUser.role) } : null);
        }}
      />
      <GettingStartedOverlay
        user={user}
        onDone={() => setUser((u) => u ? { ...u, onboarding_completed: true } : u)}
        onSkip={() => setUser((u) => u ? { ...u, onboarding_completed: true } : u)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MuiXProvider>
          <SeoProvider>
            <View style={styles.root}>
              <StatusBar barStyle={Platform.OS === 'ios' ? 'default' : 'light-content'} />
              <RootNavigator />
            </View>
          </SeoProvider>
        </MuiXProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },

});