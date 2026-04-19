import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Btn } from '../../atoms/Btn';
import { Input } from '../../atoms/Input';
import { Icon } from '../../atoms/Icon';
import { APP_CONFIG, IS_MOCK } from '../../config/env';
import { getCurrentUser, loginProvider } from '../../api';
import { DEMO_ACCOUNTS } from '../../mock/data';
import { ROLE_LABELS, ROLE_COLORS } from '../../config/roles';

export function AuthScreen({ onAuth, appName }) {
  const { C, isDark, toggle } = useTheme();
  const [form, setForm]         = useState({ email: '', password: '' });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [globalErr, setGlobalErr] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: '' })); };

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
        await new Promise((r) => setTimeout(r, 400));
        const match = DEMO_ACCOUNTS.find(a => a.user.email.toLowerCase() === form.email.toLowerCase());
        if (match && form.password === APP_CONFIG.DEMO_PASSWORD) {
          onAuth(match.user);
          return;
        }
        setGlobalErr('Invalid credentials. Use a demo account below.');
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

  const fillDemo = (account) => {
    setForm({ email: account.user.email, password: APP_CONFIG.DEMO_PASSWORD });
    setErrors({}); setGlobalErr(''); setShowDemo(false);
  };

  const roleColorMap = { primary: C.primary, purple: C.purple, warning: C.warning, success: C.success, accent: C.accent || C.secondary };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={[styles.decorTop,    { backgroundColor: `${C.accent}18` }]} />
      <View style={[styles.decorBottom, { backgroundColor: `${C.primary}12` }]} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cardWrapper}>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={[styles.logo, { backgroundColor: C.primary }]}>
              <Icon name="stethoscope" lib="mc" size={32} color="#fff" />
            </View>
            <Text style={[styles.appTitle,    { color: C.text }]}>{appName}</Text>
            <Text style={[styles.appSubtitle, { color: C.primary }]}>Provider Portal</Text>
          </View>

          {/* Card */}
          <View style={[styles.authCard, { backgroundColor: C.card, borderColor: C.border }]}>

            <View style={[styles.modeToggle, { backgroundColor: C.bg }]}>
              <View style={[styles.modeBtn, { backgroundColor: C.surface }]}>
                <Icon name="shield" lib="feather" size={14} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>Secure Sign In</Text>
              </View>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.heading,    { color: C.text }]}>Welcome back</Text>
              <Text style={[styles.subheading, { color: C.textMuted }]}>
                Sign in to your clinical dashboard. Your access level is determined by your assigned role.
              </Text>

              {globalErr ? (
                <View style={[styles.alert, { backgroundColor: C.dangerLight, borderColor: C.danger }]}>
                  <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginRight: 6 }} />
                  <Text style={{ color: C.danger, fontSize: 13, flex: 1 }}>{globalErr}</Text>
                </View>
              ) : null}

              <Input label="Email Address" placeholder="you@facility.co.ke" value={form.email}
                onChangeText={(v) => set('email', v)} error={errors.email} keyboardType="email-address" icon="mail" />
              <Input label="Password" placeholder="••••••••" value={form.password}
                onChangeText={(v) => set('password', v)} error={errors.password} secureTextEntry icon="lock" />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: C.border }]}>
              <Btn label={loading ? 'Signing in…' : 'Sign In'} onPress={submit} full size="lg" loading={loading} />

              {IS_MOCK && (
                <>
                  <View style={styles.orRow}>
                    <View style={[styles.orLine, { backgroundColor: C.divider }]} />
                    <Text style={{ color: C.textMuted, fontSize: 12, marginHorizontal: 8 }}>demo accounts</Text>
                    <View style={[styles.orLine, { backgroundColor: C.divider }]} />
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowDemo(v => !v)}
                    style={[styles.demoBtn, { borderColor: C.primary, backgroundColor: C.bg }]}
                  >
                    <Icon name="account-multiple" lib="mc" size={14} color={C.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>
                      {showDemo ? 'Hide demo accounts' : 'Choose a demo role'}
                    </Text>
                    <Icon name={showDemo ? 'chevron-up' : 'chevron-down'} lib="feather" size={14} color={C.primary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>

                  {showDemo && (
                    <View style={[styles.demoList, { borderColor: C.border, backgroundColor: C.surface }]}>
                      {DEMO_ACCOUNTS.map((account) => {
                        const color = roleColorMap[ROLE_COLORS[account.role]] || C.primary;
                        return (
                          <TouchableOpacity
                            key={account.role}
                            onPress={() => fillDemo(account)}
                            style={[styles.demoRow, { borderBottomColor: C.divider }]}
                          >
                            <View style={[styles.roleChip, { backgroundColor: `${color}18` }]}>
                              <Text style={{ color, fontSize: 11, fontWeight: '700' }}>
                                {account.label}
                              </Text>
                            </View>
                            <Text style={{ color: C.textMuted, fontSize: 11, flex: 1 }} numberOfLines={1}>
                              {account.user.email}
                            </Text>
                            <Icon name="chevron-right" lib="feather" size={13} color={C.textMuted} />
                          </TouchableOpacity>
                        );
                      })}
                      <Text style={{ color: C.textMuted, fontSize: 11, textAlign: 'center', padding: 8 }}>
                        Password for all: {APP_CONFIG.DEMO_PASSWORD}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={toggle} style={[styles.themeToggle, { borderColor: C.border }]}>
            <Icon name={isDark ? 'sun' : 'moon'} lib="feather" size={12} color={C.textMuted} style={{ marginRight: 6 }} />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>{isDark ? 'Light mode' : 'Dark mode'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  decorTop:     { position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: 130 },
  decorBottom:  { position: 'absolute', bottom: -70, left: -70, width: 220, height: 220, borderRadius: 110 },
  scroll:       { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30, justifyContent: 'center' },
  cardWrapper:  { maxWidth: 460, width: '100%', alignSelf: 'center' },
  logoWrap:     { alignItems: 'center', marginBottom: 20 },
  logo:         { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  appTitle:     { fontSize: 24, fontWeight: '800' },
  appSubtitle:  { fontSize: 13, fontWeight: '600' },
  authCard:     { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  modeToggle:   { flexDirection: 'row', padding: 6 },
  modeBtn:      { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, flexDirection: 'row', justifyContent: 'center' },
  formScroll:   { maxHeight: 300, paddingHorizontal: 18, paddingTop: 12 },
  heading:      { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subheading:   { fontSize: 13, marginBottom: 16, lineHeight: 19 },
  alert:        { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  footer:       { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1 },
  orRow:        { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  orLine:       { flex: 1, height: 1 },
  demoBtn:      { borderRadius: 10, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center', marginBottom: 8, flexDirection: 'row', justifyContent: 'center' },
  demoList:     { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
  demoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  roleChip:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  themeToggle:  { alignSelf: 'center', marginTop: 14, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
});
