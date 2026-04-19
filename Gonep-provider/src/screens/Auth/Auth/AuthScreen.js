// ─── AuthScreen.js ────────────────────────────────────────────────────────────
// Login screen.
// - Uses GONEP logo image where available, falls back to stethoscope icon.
// - Register facility link sits below forgot password, same card.
// - Demo autofill panel ONLY rendered when IS_MOCK === true (tree-shaken in prod).
// - All form values persist via useState for the session.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Btn } from '../../../atoms/Btn';
import { Input } from '../../../atoms/Input';
import { Icon } from '../../../atoms/Icon';
import { APP_CONFIG, IS_MOCK } from '../../../config/env';
import { getCurrentUser, loginProvider } from '../../../api';
import { DEMO_ACCOUNTS } from '../../../mock/data';
import { ROLE_LABELS, ROLE_COLORS } from '../../../config/roles';

// Try to load the GONEP logo; falls back gracefully if missing
let GONEP_LOGO = null;
try { GONEP_LOGO = require('../../../../assets/GONEP Logo.png'); } catch {}

export function AuthScreen({ onAuth, appName, onRegister }) {
  const { C, isDark, toggle } = useTheme();
  const [form,      setForm]      = useState({ email: '', password: '' });
  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [globalErr, setGlobalErr] = useState('');
  const [showDemo,  setShowDemo]  = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password || form.password.length < 6) e.password = 'Minimum 6 characters';
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setGlobalErr('');
    try {
      if (IS_MOCK) {
        await new Promise(r => setTimeout(r, 400));
        const match = DEMO_ACCOUNTS.find(
          a => a.user.email.toLowerCase() === form.email.toLowerCase()
        );
        if (match && form.password === APP_CONFIG.DEMO_PASSWORD) {
          onAuth(match.user);
          return;
        }
        setGlobalErr('Invalid credentials. Use a demo account to sign in.');
      } else {
        const user = await loginProvider({
          email: form.email.trim(),
          password: form.password,
        });
        const hydratedUser = await getCurrentUser().catch(() => null);
        onAuth(hydratedUser || user);
      }
    } catch (error) {
      setGlobalErr(error?.message || 'Unable to complete authentication request.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = account => {
    setForm({ email: account.user.email, password: APP_CONFIG.DEMO_PASSWORD });
    setErrors({}); setGlobalErr(''); setShowDemo(false);
  };

  const roleColorMap = {
    primary: C.primary, purple: C.purple || '#8B5CF6',
    warning: C.warning, success: C.success, accent: C.accent || C.secondary,
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={[styles.decorTop,    { backgroundColor: `${C.accent}18`  }]} />
      <View style={[styles.decorBottom, { backgroundColor: `${C.primary}12` }]} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.cardWrapper}>

          {/* ── Logo + branding ── */}
          <View style={styles.logoWrap}>
            {GONEP_LOGO ? (
              <Image source={GONEP_LOGO} style={styles.logoImg} resizeMode="contain" />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: C.primary }]}>
                <Icon name="stethoscope" lib="mc" size={32} color="#fff" />
              </View>
            )}
            <Text style={[styles.appTitle,    { color: C.text }]}>{appName}</Text>
            <Text style={[styles.appSubtitle, { color: C.primary }]}>Provider Portal</Text>
          </View>

          {/* ── Auth card ── */}
          <View style={[styles.authCard, { backgroundColor: C.card, borderColor: C.border }]}>

            <View style={[styles.modeToggle, { backgroundColor: C.bg }]}>
              <View style={[styles.modeBtn, { backgroundColor: C.surface }]}>
                <Icon name="shield" lib="feather" size={14} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>Secure Sign In</Text>
              </View>
            </View>

            <View style={styles.formPad}>
              <Text style={[styles.heading,    { color: C.text }]}>Welcome back</Text>
              <Text style={[styles.subheading, { color: C.textMuted }]}>
                Sign in to your provider account
              </Text>

              <Input
                label="Work email"
                value={form.email}
                onChangeText={v => set('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail"
                error={errors.email}
              />
              <Input
                label="Password"
                value={form.password}
                onChangeText={v => set('password', v)}
                secureTextEntry={!isPasswordVisible}
                icon="lock"
                error={errors.password}
                onToggleSecure={() => setIsPasswordVisible(v => !v)}
                isSecureVisible={isPasswordVisible}
              />

              {globalErr ? (
                <View style={[styles.errBox, { backgroundColor: `${C.danger}12`, borderColor: `${C.danger}40` }]}>
                  <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginRight: 8 }} />
                  <Text style={{ color: C.danger, fontSize: 12, flex: 1 }}>{globalErr}</Text>
                </View>
              ) : null}

              <Btn
                label={loading ? 'Signing in…' : 'Sign in'}
                onPress={submit}
                loading={loading}
                full
                style={{ marginBottom: 14 }}
              />

              {/* ── Forgot password ── */}
              <TouchableOpacity style={styles.forgotRow}>
                <Icon name="key" lib="feather" size={13} color={C.primary} style={{ marginRight: 5 }} />
                <Text style={[styles.linkText, { color: C.primary }]}>Forgot your password?</Text>
              </TouchableOpacity>

              {/* ── Register facility (below forgot, same card) ── */}
              <View style={[styles.registerRow, { borderTopColor: C.divider }]}>
                <Text style={{ fontSize: 13, color: C.textMuted }}>New to GONEP?</Text>
                <TouchableOpacity onPress={onRegister} style={styles.registerBtn}>
                  <Icon name="plus-circle" lib="feather" size={13} color={C.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.linkText, { color: C.primary }]}>Register your facility</Text>
                </TouchableOpacity>
              </View>

              {/* ── Mock-only demo panel (tree-shaken in prod) ── */}
              {IS_MOCK && (
                <View style={{ marginTop: 14 }}>
                  <View style={[styles.divider, { borderColor: C.border }]}>
                    <Text style={[styles.dividerText, { color: C.textMuted, backgroundColor: C.card }]}>
                      Mock mode — demo accounts
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.demoToggle, { borderColor: C.border, backgroundColor: C.surface }]}
                    onPress={() => setShowDemo(v => !v)}
                  >
                    <Icon name="users" lib="feather" size={14} color={C.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13, flex: 1 }}>
                      {showDemo ? 'Hide demo accounts' : 'Sign in as a demo role'}
                    </Text>
                    <Icon name={showDemo ? 'chevron-up' : 'chevron-down'} lib="feather" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                  {showDemo && (
                    <View style={[styles.demoList, { borderColor: C.border }]}>
                      {DEMO_ACCOUNTS.map(account => {
                        const colorKey = ROLE_COLORS[account.role] || 'primary';
                        const color = roleColorMap[colorKey] || C.primary;
                        return (
                          <TouchableOpacity
                            key={account.role}
                            onPress={() => fillDemo(account)}
                            style={[styles.demoItem, { borderBottomColor: C.divider }]}
                          >
                            <View style={[styles.demoAvatar, { backgroundColor: `${color}18` }]}>
                              <Text style={{ color, fontWeight: '800', fontSize: 13 }}>
                                {account.user.first_name[0]}{account.user.last_name[0]}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>
                                {account.user.first_name} {account.user.last_name}
                              </Text>
                              <Text style={{ color: C.textMuted, fontSize: 11 }}>{account.user.email}</Text>
                            </View>
                            <View style={[styles.rolePill, { backgroundColor: `${color}18` }]}>
                              <Text style={{ color, fontSize: 10, fontWeight: '700' }}>
                                {ROLE_LABELS[account.role]}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Theme toggle */}
          <TouchableOpacity style={styles.themeToggle} onPress={toggle}>
            <Icon name={isDark ? 'sun' : 'moon'} lib="feather" size={16} color={C.textMuted} style={{ marginRight: 6 }} />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>{isDark ? 'Light mode' : 'Dark mode'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  decorTop:     { position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150 },
  decorBottom:  { position: 'absolute', bottom: -80, left: -60, width: 250, height: 250, borderRadius: 125 },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: 20 },
  cardWrapper:  { maxWidth: 440, width: '100%', alignSelf: 'center' },
  logoWrap:     { alignItems: 'center', marginBottom: 24 },
  logoImg:      { width: 90, height: 90, marginBottom: 10 },
  logoFallback: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  appTitle:     { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  appSubtitle:  { fontSize: 13, fontWeight: '600', marginTop: 3 },
  authCard:     { borderWidth: 1, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  modeToggle:   { padding: 10 },
  modeBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, padding: 10 },
  formPad:      { padding: 20 },
  heading:      { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subheading:   { fontSize: 13, marginBottom: 20 },
  errBox:       { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 },
  forgotRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  linkText:     { fontSize: 13, fontWeight: '600' },
  registerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                  marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  registerBtn:  { flexDirection: 'row', alignItems: 'center' },
  divider:      { borderBottomWidth: 1, alignItems: 'center', marginBottom: 12 },
  dividerText:  { paddingHorizontal: 10, marginBottom: -9, fontSize: 11, fontWeight: '600' },
  demoToggle:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  demoList:     { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  demoItem:     { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, gap: 10 },
  demoAvatar:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rolePill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  themeToggle:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
});
