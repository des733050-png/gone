// ─── screens/Auth/Onboarding/HospitalOnboardingScreen.js ─────────────────────
// 2-step facility onboarding:
//   Step 1 — Hospital details (name, email, phone, location, registration_no)
//   Step 2 — Administrator account (full name, email, password)
// On submit we POST /api/v1/auth/register/facility-pending/. The admin can
// then sign in immediately. Document verification happens AFTER first login,
// from the in-portal verification screen — so we no longer block onboarding
// on document upload.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Btn } from '../../../atoms/Btn';
import { Input } from '../../../atoms/Input';
import { Icon } from '../../../atoms/Icon';
import { registerFacilityPending } from '../../../api';

let GONEP_LOGO = null;
try { GONEP_LOGO = require('../../../../assets/GONEP Logo.png'); } catch {}

const STEPS = ['Hospital details', 'Administrator account', 'Sign in'];

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

export function HospitalOnboardingScreen({ onComplete, onBack }) {
  const { C } = useTheme();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});

  // Eye-toggle visibility for the two password inputs
  const [showPw,        setShowPw]        = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Hospital details
  const [hospital, setHospital] = useState({
    name: '', email: '', phone: '', location: '', registration_no: '',
  });
  // Admin account
  const [admin, setAdmin] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    password: '', confirm_password: '',
  });

  // Result + helpful state for the final "Sign in" step
  const [result, setResult] = useState(null);

  const setH = (k, v) => {
    const next = typeof v === 'string' ? v.trimStart() : v;
    setHospital((h) => ({ ...h, [k]: next }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };
  const setA = (k, v) => {
    let next = v;
    if (typeof v === 'string') {
      // Passwords get full-strip — most password mistakes are leading or
      // accidental spaces from browser autofill. Other fields just trimStart.
      if (k === 'password' || k === 'confirm_password') {
        next = v.replace(/\s+/g, '');
      } else {
        next = v.trimStart();
      }
    }
    setAdmin((a) => ({ ...a, [k]: next }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep0 = () => {
    const e = {};
    if (!hospital.name.trim())            e.name            = 'Hospital name is required';
    if (!hospital.email.trim())           e.email           = 'Email is required';
    else if (!isEmail(hospital.email))    e.email           = 'Enter a valid email';
    if (!hospital.phone.trim())           e.phone           = 'Phone number is required';
    if (!hospital.location.trim())        e.location        = 'Location is required';
    if (!hospital.registration_no.trim()) e.registration_no = 'Registration number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () => {
    const e = {};
    if (!admin.first_name.trim()) e.first_name = 'First name is required';
    if (!admin.last_name.trim())  e.last_name  = 'Last name is required';
    if (!admin.email.trim())      e.email      = 'Administrator email is required';
    else if (!isEmail(admin.email)) e.email    = 'Enter a valid email';
    if (!admin.password)          e.password   = 'Password is required';
    else if (admin.password.length < 8)
      e.password = 'Password must be at least 8 characters';
    if (admin.password !== admin.confirm_password)
      e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!validateStep1()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        name:             hospital.name.trim(),
        email:            hospital.email.trim().toLowerCase(),
        phone:            hospital.phone.trim(),
        location:         hospital.location.trim(),
        registration_no:  hospital.registration_no.trim(),
        admin_first_name: admin.first_name.trim(),
        admin_last_name:  admin.last_name.trim(),
        admin_email:      admin.email.trim().toLowerCase(),
        admin_phone:      admin.phone.trim(),
        admin_password:   admin.password,
      };
      const res = await registerFacilityPending(payload);
      setResult(res);
      setStep(2);
    } catch (e) {
      setSubmitError(
        e?.message || 'Unable to create your facility account. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            {GONEP_LOGO ? (
              <Image source={GONEP_LOGO} style={styles.logoImg} resizeMode="contain" />
            ) : (
              <View style={[styles.logoIcon, { backgroundColor: C.primary }]}>
                <Icon name="hospital-building" lib="mc" size={28} color="#fff" />
              </View>
            )}
            <Text style={[styles.logoTitle, { color: C.text }]}>Gonep Healthcare</Text>
            <Text style={[styles.logoSub, { color: C.primary }]}>Facility Registration</Text>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {STEPS.map((label, i) => (
              <View key={label} style={styles.stepWrap}>
                <View style={[styles.stepDot, {
                  backgroundColor: i < step ? C.success : i === step ? C.primary : C.border,
                  borderColor:     i < step ? C.success : i === step ? C.primary : C.border,
                }]}>
                  {i < step ? (
                    <Icon name="check" lib="feather" size={12} color="#fff" />
                  ) : (
                    <Text style={{
                      color: i === step ? '#fff' : C.textMuted,
                      fontSize: 11, fontWeight: '700',
                    }}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, { color: i === step ? C.text : C.textMuted }]}>
                  {label}
                </Text>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, { backgroundColor: i < step ? C.success : C.border }]} />
                )}
              </View>
            ))}
          </View>

          {/* ── Step 0: Hospital details ── */}
          {step === 0 && (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>Hospital details</Text>
              <Text style={[styles.cardDesc, { color: C.textMuted }]}>
                Tell us about your facility. You'll upload supporting documents
                after creating your administrator account.
              </Text>
              <Input label="Hospital name"        placeholder="Nairobi General Hospital" value={hospital.name}            onChangeText={(v) => setH('name', v)}            error={errors.name}            icon="home" />
              <Input label="Official email"       placeholder="hospital@example.co.ke"   value={hospital.email}           onChangeText={(v) => setH('email', v)}           error={errors.email}           icon="mail" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Phone number"         placeholder="+254 20 XXX XXXX"         value={hospital.phone}           onChangeText={(v) => setH('phone', v)}           error={errors.phone}           icon="phone" keyboardType="phone-pad" />
              <Input label="Physical location"    placeholder="Upper Hill, Nairobi"      value={hospital.location}        onChangeText={(v) => setH('location', v)}        error={errors.location}        icon="map-pin" />
              <Input label="MoH registration no." placeholder="MoH-KE-XXXX-XXXX"        value={hospital.registration_no} onChangeText={(v) => setH('registration_no', v)} error={errors.registration_no} icon="hash" />

              <Btn label="Continue" full style={{ marginTop: 12 }}
                onPress={() => { if (validateStep0()) setStep(1); }} />

              {onBack && (
                <TouchableOpacity
                  onPress={onBack}
                  style={[styles.linkBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                >
                  <Icon name="arrow-left" lib="feather" size={15} color={C.primary} />
                  <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13, marginLeft: 6 }}>
                    Back to sign in
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Step 1: Administrator account ── */}
          {step === 1 && (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>Administrator account</Text>
              <Text style={[styles.cardDesc, { color: C.textMuted }]}>
                This account will own the facility on Gonep. You can add doctors
                and other staff after signing in.
              </Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Input label="First name" placeholder="Grace" value={admin.first_name}
                    onChangeText={(v) => setA('first_name', v)} error={errors.first_name} icon="user" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Last name" placeholder="Muthoni" value={admin.last_name}
                    onChangeText={(v) => setA('last_name', v)} error={errors.last_name} />
                </View>
              </View>

              <Input label="Email" placeholder="admin@hospital.co.ke" value={admin.email}
                onChangeText={(v) => setA('email', v)} error={errors.email}
                icon="mail" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Phone (optional)" placeholder="0712 345 678" value={admin.phone}
                onChangeText={(v) => setA('phone', v)} icon="phone" keyboardType="phone-pad" />
              <Input
                label="Password"
                placeholder="At least 8 characters"
                value={admin.password}
                onChangeText={(v) => setA('password', v)}
                error={errors.password}
                icon="lock"
                secureTextEntry={!showPw}
                onToggleSecure={() => setShowPw((p) => !p)}
                isSecureVisible={showPw}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />
              <Input
                label="Confirm password"
                placeholder="Re-enter password"
                value={admin.confirm_password}
                onChangeText={(v) => setA('confirm_password', v)}
                error={errors.confirm_password}
                icon="lock"
                secureTextEntry={!showConfirmPw}
                onToggleSecure={() => setShowConfirmPw((p) => !p)}
                isSecureVisible={showConfirmPw}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />

              {submitError ? (
                <View style={[styles.warningBox, { backgroundColor: C.dangerLight, borderColor: C.danger }]}>
                  <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginRight: 8 }} />
                  <Text style={{ color: C.danger, fontSize: 12, flex: 1 }}>{submitError}</Text>
                </View>
              ) : null}

              <View style={styles.btnRow}>
                <Btn label="Back" variant="ghost" onPress={() => setStep(0)} style={{ marginRight: 8 }} disabled={submitting} />
                <Btn
                  label={submitting ? 'Creating account…' : 'Create account'}
                  style={{ flex: 1 }}
                  onPress={submit}
                  loading={submitting}
                  disabled={submitting}
                />
              </View>
            </View>
          )}

          {/* ── Step 2: Done — go sign in ── */}
          {step === 2 && (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.successWrap}>
                <View style={[styles.successIcon, { backgroundColor: C.successLight }]}>
                  <Icon name="check-circle" lib="feather" size={40} color={C.success} />
                </View>
                <Text style={[styles.successTitle, { color: C.text }]}>Account created</Text>
                <Text style={[styles.successDesc, { color: C.textMuted }]}>
                  Sign in with{' '}
                  <Text style={{ color: C.text, fontWeight: '700' }}>
                    {result?.admin_email || admin.email}
                  </Text>{' '}
                  to upload your verification documents and start using Gonep.
                </Text>

                <View style={[styles.timelineBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                  {[
                    { icon: 'check-circle', label: 'Facility account created', done: true  },
                    { icon: 'log-in',       label: 'Sign in to your account',  done: false },
                    { icon: 'upload',       label: 'Upload verification documents', done: false },
                    { icon: 'shield',       label: 'Gonep reviews and approves', done: false },
                    { icon: 'unlock',       label: 'Full portal access unlocked', done: false },
                  ].map((t) => (
                    <View key={t.label} style={styles.timelineRow}>
                      <Icon name={t.icon} lib="feather" size={16}
                        color={t.done ? C.success : C.textMuted} />
                      <Text style={[styles.timelineLabel, { color: t.done ? C.text : C.textMuted }]}>
                        {t.label}
                      </Text>
                    </View>
                  ))}
                </View>

                <Btn
                  label="Go to sign in"
                  full
                  onPress={() => onComplete?.({ adminEmail: result?.admin_email || admin.email })}
                  style={{ marginTop: 8 }}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  scroll:       { flexGrow: 1, padding: 20, justifyContent: 'center' },
  inner:        { maxWidth: 520, width: '100%', alignSelf: 'center' },
  logoWrap:     { alignItems: 'center', marginBottom: 24 },
  logoImg:      { width: 80, height: 80, marginBottom: 8 },
  logoIcon:     { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoTitle:    { fontSize: 22, fontWeight: '800' },
  logoSub:      { fontSize: 13, fontWeight: '600' },
  stepRow:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  stepWrap:     { flexDirection: 'row', alignItems: 'center' },
  stepDot:      { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLabel:    { fontSize: 11, marginLeft: 6, marginRight: 4, fontWeight: '500' },
  stepLine:     { width: 24, height: 2, marginHorizontal: 4 },
  card:         { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 20 },
  cardTitle:    { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  cardDesc:     { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  warningBox:   { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 4 },
  btnRow:       { flexDirection: 'row', marginTop: 12 },
  linkBtn:      { marginTop: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  successWrap:  { alignItems: 'center', paddingVertical: 8 },
  successIcon:  { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  successDesc:  { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 16 },
  timelineBox:  { width: '100%', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16, gap: 12 },
  timelineRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineLabel:{ fontSize: 13 },
});
