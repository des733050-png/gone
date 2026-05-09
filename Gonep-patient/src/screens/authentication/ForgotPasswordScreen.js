import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Btn } from '../../atoms/Btn';
import { Input } from '../../atoms/Input';
import { Icon } from '../../atoms/Icon';
import { IS_MOCK } from '../../config/env';
import { requestPasswordReset, verifyPasswordReset } from '../../api';

export function ForgotPasswordScreen({ onBack, onComplete }) {
  const { C } = useTheme();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizeEmail = (s) => String(s || '').trim().toLowerCase();

  const validateEmail = () => {
    const e = normalizeEmail(email);
    if (!e) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(e)) return 'Enter a valid email address.';
    return '';
  };

  const sendCode = async () => {
    const v = validateEmail();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      if (IS_MOCK) {
        await new Promise((r) => setTimeout(r, 350));
        setInfo('If that email is registered, an OTP has been sent.');
      } else {
        await requestPasswordReset({ email: normalizeEmail(email) });
        setInfo('If that email is registered, an OTP has been sent.');
      }
      setStep('otp');
    } catch (err) {
      setError(err?.message || 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    const code = String(otp || '').trim();
    if (!code) {
      setError('Enter the code from your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await verifyPasswordReset({
        email: normalizeEmail(email),
        otp: code,
      });
      const pw = res?.temp_password;
      if (!pw) {
        setError('Unexpected response from server.');
        return;
      }
      setTempPassword(pw);
      setStep('done');
    } catch (err) {
      setError(err?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          <TouchableOpacity onPress={onBack} style={styles.backRow}>
            <Icon name="arrow-left" lib="feather" size={18} color={C.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: C.primary, fontWeight: '600', fontSize: 14 }}>Back to sign in</Text>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>Forgot password</Text>
            <Text style={[styles.sub, { color: C.textMuted }]}>
              {step === 'email' && 'Enter your account email. We will send a one-time code if it is registered.'}
              {step === 'otp' && 'Enter the 6-digit code from your email.'}
              {step === 'done' && 'Sign in with this temporary password, then update it from your profile.'}
            </Text>

            {error ? (
              <View style={[styles.banner, { backgroundColor: C.dangerLight, borderColor: C.danger }]}>
                <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginRight: 8 }} />
                <Text style={{ color: C.danger, fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            {info && step === 'otp' ? (
              <View style={[styles.banner, { backgroundColor: `${C.primary}14`, borderColor: `${C.primary}40` }]}>
                <Icon name="mail" lib="feather" size={14} color={C.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: C.text, fontSize: 13, flex: 1 }}>{info}</Text>
              </View>
            ) : null}

            {step === 'email' && (
              <Input
                label="Email Address"
                value={email}
                onChangeText={(v) => {
                  setEmail(typeof v === 'string' ? v.trimStart() : v);
                  if (error) setError('');
                }}
                keyboardType="email-address"
                icon="mail"
              />
            )}

            {step === 'otp' && (
              <>
                <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>
                  Sent to <Text style={{ color: C.text, fontWeight: '600' }}>{normalizeEmail(email)}</Text>
                </Text>
                <Input
                  label="One-time code"
                  value={otp}
                  onChangeText={(v) => {
                    setOtp(String(v).replace(/\s/g, ''));
                    if (error) setError('');
                  }}
                  keyboardType="number-pad"
                  icon="key"
                  placeholder="000000"
                />
              </>
            )}

            {step === 'done' && (
              <View style={[styles.pwBox, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Temporary password</Text>
                <Text selectable style={[styles.pwText, { color: C.text }]}>{tempPassword}</Text>
              </View>
            )}

            {step === 'email' && (
              <Btn label={loading ? 'Sending…' : 'Send code'} onPress={sendCode} loading={loading} full />
            )}
            {step === 'otp' && (
              <Btn label={loading ? 'Verifying…' : 'Verify code'} onPress={verifyCode} loading={loading} full />
            )}
            {step === 'done' && (
              <Btn
                label="Continue to sign in"
                onPress={() =>
                  onComplete?.({
                    email: normalizeEmail(email),
                    tempPassword,
                  })
                }
                full
              />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  cardWrapper: { maxWidth: 460, width: '100%', alignSelf: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  pwBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  pwText: { fontSize: 17, fontWeight: '700', letterSpacing: 1 },
});
