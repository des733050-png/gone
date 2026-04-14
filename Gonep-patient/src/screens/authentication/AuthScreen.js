import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Btn } from '../../atoms/Btn';
import { Input } from '../../atoms/Input';
import { Icon } from '../../atoms/Icon';
import { APP_CONFIG, IS_MOCK } from '../../config/env';
import { loginPatient, registerPatient } from '../../api';

export function AuthScreen({ onAuth, appName }) {
  const { C, isDark, toggle } = useTheme();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState('');

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (mode === 'register') {
      if (!form.first_name.trim()) e.first_name = 'Required';
      if (!form.last_name.trim()) e.last_name = 'Required';
      if (!form.phone.trim()) e.phone = 'Phone number is required';
      else if (!/^\+?[\d\s\-]{9,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
      if (!form.confirm_password) e.confirm_password = 'Please confirm your password';
      else if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    }
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setLoading(true);
    setGlobalErr('');
    try {
      if (mode === 'login') {
        const user = await loginPatient({
          email: form.email.trim(),
          password: form.password,
        });
        onAuth(user);
      } else {
        const user = await registerPatient({
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
        });
        onAuth(user);
      }
    } catch (err) {
      setGlobalErr(err?.message || 'Unable to complete authentication request.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setForm((f) => ({
      ...f,
      email: APP_CONFIG.DEMO_EMAIL,
      password: APP_CONFIG.DEMO_PASSWORD,
    }));
    setErrors({});
    setGlobalErr('');
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cardWrapper}>
          <View style={styles.logoWrap}>
            <View style={[styles.logo, { backgroundColor: C.primary }]}>
              <Image
                source={require('../../../assets/logo.png')}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.appTitle, { color: C.text }]}>{appName}</Text>
            <Text style={[styles.appSubtitle, { color: C.primary }]}>Patient Portal</Text>
          </View>

          <View style={[styles.authCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.modeToggle, { backgroundColor: C.bg }]}>
              {['login', 'register'].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setErrors({});
                    setGlobalErr('');
                    setForm({
                      email: '',
                      password: '',
                      confirm_password: '',
                      first_name: '',
                      last_name: '',
                      phone: '',
                    });
                  }}
                  style={[
                    styles.modeBtn,
                    { backgroundColor: mode === m ? C.surface : 'transparent' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon
                      name={m === 'login' ? 'lock' : 'user-plus'}
                      lib="feather"
                      size={14}
                      color={mode === m ? C.primary : C.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: mode === m ? '700' : '500',
                        color: mode === m ? C.primary : C.textMuted,
                      }}
                    >
                      {m === 'login' ? 'Sign In' : 'Register'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.heading, { color: C.text }]}>
                {mode === 'login' ? 'Welcome back!' : 'Create your account'}
              </Text>
              <Text style={[styles.subheading, { color: C.textMuted }]}>
                {mode === 'login'
                  ? 'Sign in to access your GONEP health dashboard.'
                  : 'Join GONEP Patient Portal for healthcare at your fingertips.'}
              </Text>

              {globalErr ? (
                <View style={[styles.alert, { backgroundColor: C.dangerLight, borderColor: C.danger, flexDirection: 'row', alignItems: 'center' }]}>
                  <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginRight: 6 }} />
                  <Text style={{ color: C.danger, fontSize: 13 }}>{globalErr}</Text>
                </View>
              ) : null}

              {mode === 'register' && (
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Input label="First Name" placeholder="Faith" value={form.first_name} onChangeText={(v) => set('first_name', v)} error={errors.first_name} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Input label="Last Name" placeholder="Njoroge" value={form.last_name} onChangeText={(v) => set('last_name', v)} error={errors.last_name} />
                  </View>
                </View>
              )}

              <Input label="Email Address" placeholder="you@example.com" value={form.email} onChangeText={(v) => set('email', v)} error={errors.email} keyboardType="email-address" icon="mail" />

              {mode === 'register' && (
                <Input label="Phone Number" placeholder="+254 712 345 678" value={form.phone} onChangeText={(v) => set('phone', v)} error={errors.phone} keyboardType="phone-pad" icon="phone" />
              )}

              <Input label="Password" placeholder="••••••••" value={form.password} onChangeText={(v) => set('password', v)} error={errors.password} secureTextEntry icon="lock" hint={mode === 'register' ? 'Minimum 6 characters' : undefined} />

              {mode === 'register' && (
                <Input label="Confirm Password" placeholder="Re-enter your password" value={form.confirm_password} onChangeText={(v) => set('confirm_password', v)} error={errors.confirm_password} secureTextEntry icon="lock" />
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Btn
                label={loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                onPress={submit}
                full
                size="lg"
                loading={loading}
              />

              {mode === 'login' && IS_MOCK && (
                <>
                  <View style={styles.orRow}>
                    <View style={[styles.orLine, { backgroundColor: C.divider }]} />
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>or</Text>
                    <View style={[styles.orLine, { backgroundColor: C.divider }]} />
                  </View>
                  <TouchableOpacity
                    onPress={fillDemo}
                    style={[
                      styles.demoBtn,
                      { borderColor: C.primary, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
                    ]}
                  >
                    <Icon name="flask-outline" lib="mc" size={14} color={C.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Fill Demo Credentials</Text>
                  </TouchableOpacity>
                  <Text style={{ textAlign: 'center', color: C.textMuted, fontSize: 11 }}>
                    {APP_CONFIG.DEMO_EMAIL} · {APP_CONFIG.DEMO_PASSWORD}
                  </Text>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={toggle} style={[styles.themeToggle, { borderColor: C.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name={isDark ? 'sun' : 'moon'} lib="feather" size={12} color={C.textMuted} style={{ marginRight: 6 }} />
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  decorTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(26,111,232,0.08)',
  },
  decorBottom: {
    position: 'absolute',
    bottom: -70,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(14,165,233,0.08)',
  },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30, justifyContent: 'center' },
  cardWrapper: { maxWidth: 460, width: '100%', alignSelf: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appTitle: { fontSize: 24, fontWeight: '800' },
  appSubtitle: { fontSize: 13, fontWeight: '600' },
  authCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  modeToggle: { flexDirection: 'row', padding: 6 },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  formScroll: { maxHeight: 420, paddingHorizontal: 18, paddingTop: 12 },
  heading: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subheading: { fontSize: 13, marginBottom: 16 },
  alert: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  row: { flexDirection: 'row' },
  footer: { paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: 1 },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, justifyContent: 'center' },
  orLine: { flex: 1, height: 1, marginHorizontal: 8 },
  demoBtn: { borderRadius: 10, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center', marginBottom: 6 },
  themeToggle: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});
