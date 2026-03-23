import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Btn } from '../../../atoms/Btn';
import { Input } from '../../../atoms/Input';
import { Icon } from '../../../atoms/Icon';

// Try to load the GONEP logo; falls back to icon if missing
let GONEP_LOGO = null;
try { GONEP_LOGO = require('../../../../assets/GONEP Logo.png'); } catch {}

const STEPS = ['Hospital details', 'Documents', 'Under review'];

const DOC_TYPES = [
  { id: 'reg',     label: 'Registration certificate',    desc: 'Ministry of Health registration document',       icon: 'file-text', required: true  },
  { id: 'license', label: 'Facility operating licence',  desc: 'Current licence to operate as a health facility', icon: 'award',     required: true  },
  { id: 'tax',     label: 'Tax compliance certificate',  desc: 'KRA tax compliance certificate',                  icon: 'briefcase', required: true  },
  { id: 'accred',  label: 'Accreditation certificate',   desc: 'KENAS or relevant body accreditation (if any)',   icon: 'shield',    required: false },
];

// onBack   — returns to auth screen without losing any filled form data
//            (state lives here; parent just shows/hides this component)
// onComplete — called after the under-review step to return to sign-in
export function HospitalOnboardingScreen({ onComplete, onBack }) {
  const { C } = useTheme();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', location: '',
    registration_no: '', admin_name: '', admin_email: '',
  });
  const [docs,   setDocs]   = useState({});
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validateStep0 = () => {
    const e = {};
    if (!form.name)            e.name            = 'Hospital name is required';
    if (!form.email)           e.email           = 'Email is required';
    if (!form.phone)           e.phone           = 'Phone number is required';
    if (!form.location)        e.location        = 'Location is required';
    if (!form.registration_no) e.registration_no = 'Registration number is required';
    if (!form.admin_name)      e.admin_name      = 'Administrator name is required';
    if (!form.admin_email)     e.admin_email     = 'Administrator email is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () =>
    DOC_TYPES.filter(d => d.required).every(d => docs[d.id]);

  const fakeUpload = (docId) =>
    setDocs(d => ({ ...d, [docId]: { name: `${docId}_document.pdf`, size: '1.2 MB' } }));

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
            <Text style={[styles.logoTitle, { color: C.text }]}>GONEP</Text>
            <Text style={[styles.logoSub, { color: C.primary }]}>Hospital Registration</Text>
          </View>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {STEPS.map((stepLabel, i) => (
              <View key={stepLabel} style={styles.stepWrap}>
                <View style={[
                  styles.stepDot,
                  {
                    backgroundColor: i < step ? C.success : i === step ? C.primary : C.border,
                    borderColor:     i < step ? C.success : i === step ? C.primary : C.border,
                  },
                ]}>
                  {i < step
                    ? <Icon name="check" lib="feather" size={12} color="#fff" />
                    : <Text style={{ color: i === step ? '#fff' : C.textMuted, fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                  }
                </View>
                <Text style={[styles.stepLabel, { color: i === step ? C.text : C.textMuted }]}>{stepLabel}</Text>
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
                Provide accurate details. These are verified against government records by the Gonep team before approval.
              </Text>
              <Input label="Hospital name"         placeholder="Nairobi General Hospital" value={form.name}            onChangeText={v => set('name', v)}            error={errors.name}            icon="home" />
              <Input label="Official email"        placeholder="admin@hospital.co.ke"      value={form.email}           onChangeText={v => set('email', v)}           error={errors.email}           icon="mail" keyboardType="email-address" />
              <Input label="Phone number"          placeholder="+254 20 XXX XXXX"          value={form.phone}           onChangeText={v => set('phone', v)}           error={errors.phone}           icon="phone" keyboardType="phone-pad" />
              <Input label="Physical location"     placeholder="Upper Hill, Nairobi"       value={form.location}        onChangeText={v => set('location', v)}        error={errors.location}        icon="map-pin" />
              <Input label="MoH registration no."  placeholder="MoH-KE-XXXX-XXXX"         value={form.registration_no} onChangeText={v => set('registration_no', v)} error={errors.registration_no} icon="hash" />

              <View style={[styles.divider, { backgroundColor: C.divider }]} />
              <Text style={[styles.subLabel, { color: C.text }]}>Administrator account</Text>
              <Text style={[styles.subDesc, { color: C.textMuted }]}>
                This person will have full hospital admin access on Gonep. They can create doctor and manager accounts after approval.
              </Text>
              <Input label="Full name" placeholder="Grace Muthoni"       value={form.admin_name}  onChangeText={v => set('admin_name', v)}  error={errors.admin_name}  icon="user" />
              <Input label="Email"     placeholder="admin@hospital.co.ke" value={form.admin_email} onChangeText={v => set('admin_email', v)} error={errors.admin_email} icon="mail" keyboardType="email-address" />

              <Btn label="Continue to documents" full style={{ marginTop: 16 }}
                onPress={() => { if (validateStep0()) setStep(1); }} />

              {onBack && (
                <TouchableOpacity
                  onPress={onBack}
                  style={[styles.registerBackBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                >
                  <Icon name="arrow-left" lib="feather" size={15} color={C.primary} />
                  <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13, marginLeft: 6 }}>
                    Back to sign in
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Step 1: Documents ── */}
          {step === 1 && (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>Upload documents</Text>
              <Text style={[styles.cardDesc, { color: C.textMuted }]}>
                All documents are reviewed by the Gonep compliance team within 2–3 business days. Required documents are marked with *.
              </Text>

              {DOC_TYPES.map(doc => {
                const uploaded = docs[doc.id];
                return (
                  <View key={doc.id} style={[styles.docRow, { borderColor: uploaded ? C.success : C.border, backgroundColor: uploaded ? C.successLight : C.surface }]}>
                    <View style={[styles.docIcon, { backgroundColor: uploaded ? `${C.success}20` : C.bg }]}>
                      <Icon name={doc.icon} lib="feather" size={18} color={uploaded ? C.success : C.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docLabel, { color: C.text }]}>{doc.label}{doc.required ? ' *' : ''}</Text>
                      <Text style={[styles.docDesc, { color: C.textMuted }]}>{uploaded ? `Uploaded: ${uploaded.name}` : doc.desc}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => fakeUpload(doc.id)}
                      style={[styles.uploadBtn, { borderColor: uploaded ? C.success : C.primary, backgroundColor: uploaded ? `${C.success}12` : C.primaryLight }]}
                    >
                      <Icon name={uploaded ? 'check' : 'upload'} lib="feather" size={13} color={uploaded ? C.success : C.primary} style={{ marginRight: 4 }} />
                      <Text style={{ color: uploaded ? C.success : C.primary, fontSize: 12, fontWeight: '600' }}>{uploaded ? 'Uploaded' : 'Upload'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {!validateStep1() && (
                <View style={[styles.warningBox, { backgroundColor: C.warningLight, borderColor: C.warning }]}>
                  <Icon name="alert-circle" lib="feather" size={14} color={C.warning} style={{ marginRight: 8 }} />
                  <Text style={{ color: C.warning, fontSize: 12, flex: 1 }}>Please upload all required documents before submitting.</Text>
                </View>
              )}

              <View style={styles.btnRow}>
                <Btn label="Back" variant="ghost" onPress={() => setStep(0)} style={{ marginRight: 8 }} />
                <Btn label="Submit for review" style={{ flex: 1 }} disabled={!validateStep1()} onPress={() => setStep(2)} />
              </View>
            </View>
          )}

          {/* ── Step 2: Under review ── */}
          {step === 2 && (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.successWrap}>
                <View style={[styles.successIcon, { backgroundColor: C.primaryLight }]}>
                  <Icon name="clock" lib="feather" size={36} color={C.primary} />
                </View>
                <Text style={[styles.successTitle, { color: C.text }]}>Application submitted</Text>
                <Text style={[styles.successDesc, { color: C.textMuted }]}>
                  Your hospital registration is now under review by the Gonep compliance team. This takes 2–3 business days.
                </Text>

                <View style={[styles.timelineBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                  {[
                    { icon: 'check-circle', color: C.success, label: 'Application received',         done: true  },
                    { icon: 'search',       color: C.primary, label: 'Document verification',        done: false },
                    { icon: 'shield',       color: C.primary, label: 'MoH registration check',       done: false },
                    { icon: 'mail',         color: C.primary, label: 'Approval email sent to admin', done: false },
                  ].map(t => (
                    <View key={t.label} style={styles.timelineRow}>
                      <Icon name={t.icon} lib="feather" size={16} color={t.done ? t.color : C.textMuted} />
                      <Text style={[styles.timelineLabel, { color: t.done ? C.text : C.textMuted }]}>{t.label}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.successNote, { color: C.textMuted }]}>
                  Once approved, your administrator ({form.admin_email || 'admin'}) will receive login credentials.
                </Text>

                {onComplete && (
                  <Btn label="Return to sign in" full onPress={onComplete} style={{ marginTop: 16 }} variant="secondary" />
                )}
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
  divider:      { height: 1, marginVertical: 16 },
  subLabel:     { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  subDesc:      { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  docRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 10 },
  docIcon:      { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docLabel:     { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  docDesc:      { fontSize: 11, lineHeight: 15 },
  uploadBtn:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  warningBox:   { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 12 },
  registerBackBtn: {
    marginTop: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnRow:       { flexDirection: 'row', marginTop: 8 },
  successWrap:  { alignItems: 'center', paddingVertical: 8 },
  successIcon:  { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  successDesc:  { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  timelineBox:  { width: '100%', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16, gap: 12 },
  timelineRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineLabel:{ fontSize: 13 },
  successNote:  { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
