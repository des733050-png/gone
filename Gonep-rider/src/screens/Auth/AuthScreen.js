import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Btn } from '../../atoms/Btn';
import { Input } from '../../atoms/Input';
import { Icon } from '../../atoms/Icon';
import { APP_CONFIG } from '../../config/env';
import { MOCK_RIDER } from '../../mock/data';

export function AuthScreen({ onAuth, appName }) {
  const { C, isDark, toggle } = useTheme();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState('');

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true); setGlobalErr('');
    await new Promise((r) => setTimeout(r, 800));
    if (form.email.toLowerCase() === APP_CONFIG.DEMO_EMAIL && form.password === APP_CONFIG.DEMO_PASSWORD) {
      onAuth(MOCK_RIDER);
    } else {
      setGlobalErr('Invalid credentials. Use the demo button below.');
    }
    setLoading(false);
  };

  const fillDemo = () => { setForm({ email: APP_CONFIG.DEMO_EMAIL, password: APP_CONFIG.DEMO_PASSWORD }); setErrors({}); setGlobalErr(''); };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={[styles.decorTop, { backgroundColor: `${C.warning}18` }]} />
      <View style={[styles.decorBottom, { backgroundColor: `${C.primary}12` }]} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cardWrapper}>
          <View style={styles.logoWrap}>
            <View style={[styles.logo, { backgroundColor: C.warning }]}>
              <Icon name="bike" lib="mc" size={32} color="#fff" />
            </View>
            <Text style={[styles.appTitle, { color: C.text }]}>{appName}</Text>
            <Text style={[styles.appSubtitle, { color: C.warning }]}>Rider Portal</Text>
          </View>

          <View style={[styles.authCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.modeToggle, { backgroundColor: C.bg }]}>
              <View style={[styles.modeBtn, { backgroundColor: C.surface }]}>
                <Icon name="lock" lib="feather" size={14} color={C.warning} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.warning }}>Rider Sign In</Text>
              </View>
            </View>

            <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.heading, { color: C.text }]}>Welcome back!</Text>
              <Text style={[styles.subheading, { color: C.textMuted }]}>Sign in to start accepting deliveries.</Text>

              {globalErr ? (
                <View style={[styles.alert, { backgroundColor: C.dangerLight, borderColor: C.danger }]}>
                  <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginRight: 6 }} />
                  <Text style={{ color: C.danger, fontSize: 13 }}>{globalErr}</Text>
                </View>
              ) : null}

              <Input label="Email Address" placeholder="rider@Gonep.co.ke" value={form.email} onChangeText={(v) => set('email', v)} error={errors.email} keyboardType="email-address" icon="mail" />
              <Input label="Password" placeholder="••••••••" value={form.password} onChangeText={(v) => set('password', v)} error={errors.password} secureTextEntry icon="lock" />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: C.border }]}>
              <Btn label={loading ? 'Signing in…' : 'Sign In'} onPress={submit} full size="lg" loading={loading} />
              <View style={styles.orRow}>
                <View style={[styles.orLine, { backgroundColor: C.divider }]} />
                <Text style={{ color: C.textMuted, fontSize: 12 }}>or</Text>
                <View style={[styles.orLine, { backgroundColor: C.divider }]} />
              </View>
              <TouchableOpacity onPress={fillDemo} style={[styles.demoBtn, { borderColor: C.warning, backgroundColor: C.bg }]}>
                <Icon name="flask-outline" lib="mc" size={14} color={C.warning} style={{ marginRight: 6 }} />
                <Text style={{ color: C.warning, fontWeight: '600', fontSize: 13 }}>Fill Demo Credentials</Text>
              </TouchableOpacity>
              <Text style={{ textAlign: 'center', color: C.textMuted, fontSize: 11 }}>{APP_CONFIG.DEMO_EMAIL} · {APP_CONFIG.DEMO_PASSWORD}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={toggle} style={[styles.themeToggle, { borderColor: C.border }]}>
            <Icon name={isDark ? 'sun' : 'moon'} lib="feather" size={12} color={C.textMuted} style={{ marginRight: 6 }} />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  decorTop: { position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: 130 },
  decorBottom: { position: 'absolute', bottom: -70, left: -70, width: 220, height: 220, borderRadius: 110 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30, justifyContent: 'center' },
  cardWrapper: { maxWidth: 460, width: '100%', alignSelf: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  appTitle: { fontSize: 24, fontWeight: '800' },
  appSubtitle: { fontSize: 13, fontWeight: '600' },
  authCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  modeToggle: { flexDirection: 'row', padding: 6 },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, flexDirection: 'row', justifyContent: 'center' },
  formScroll: { maxHeight: 300, paddingHorizontal: 18, paddingTop: 12 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subheading: { fontSize: 13, marginBottom: 16 },
  alert: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  footer: { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  orLine: { flex: 1, height: 1, marginHorizontal: 8 },
  demoBtn: { borderRadius: 10, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center', marginBottom: 6, flexDirection: 'row', justifyContent: 'center' },
  themeToggle: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
});
