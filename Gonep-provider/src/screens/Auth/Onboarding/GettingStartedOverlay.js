// ─── screens/Auth/Onboarding/GettingStartedOverlay.js ────────────────────────
// One-time "Getting started" overlay shown ONLY to facility_admin users on
// their very first login (onboarding_completed === false).
// All other roles (doctor, receptionist, lab, billing, etc.) never see this.
// Dismissal is persisted server-side so it never reappears.

import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { setOnboardingCompleted } from '../../../api';

const STEPS = [
  { icon: 'users',    title: 'Add your team',
    desc: 'Create accounts for doctors, receptionists, lab and billing managers. Each gets a one-time password they change on first sign-in.' },
  { icon: 'tag',      title: 'Set up specializations',
    desc: 'Add the medical specialties offered at your facility so doctors can be grouped correctly.' },
  { icon: 'calendar', title: 'Configure availability',
    desc: 'Doctors set their weekly availability windows by appointment type (In Facility, Home Visit, Virtual).' },
  { icon: 'package',  title: 'Stock your inventory',
    desc: 'Load drugs and supplies once, then track stock as it moves.' },
  { icon: 'sliders',  title: 'Tune clinical settings',
    desc: 'Set the EMR edit window and other policies that match how your team works.' },
];

// ─── Guard helper ─────────────────────────────────────────────────────────────
// Returns true only for the facility admin on their first login.
// Every other role (doctor, receptionist, lab, billing, superuser, etc.) gets false.
function shouldShowOnboarding(user) {
  if (!user) return false;
  // normalizeRole() maps 'facility_admin' → 'hospital_admin', so check both
  if (user.role !== 'hospital_admin' && user.role !== 'facility_admin') return false;
  if (user.onboarding_completed === true) return false;
  return true;
}

// ─── Overlay ──────────────────────────────────────────────────────────────────
export function GettingStartedOverlay({ user, onDone, onSkip }) {
  const { C } = useTheme();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  // Derive visibility entirely from user data — no external `visible` prop needed.
  // This prevents any risk of the overlay being force-shown by a parent for a
  // non-admin role, and keeps the guard logic in one place.
  const visible = shouldShowOnboarding(user);

  if (!visible) return null;

  const persist = async (action) => {
    setError('');
    setBusy(true);
    try {
      await setOnboardingCompleted(true);
      if (action === 'skip') onSkip?.();
      else onDone?.();
    } catch (e) {
      setError(e?.message || 'Could not save your preference. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => persist('skip')}>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>

          {/* Header */}
          <View style={s.header}>
            <View style={[s.headerIcon, { backgroundColor: C.successLight }]}>
              <Icon name="check-circle" lib="feather" size={26} color={C.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.title, { color: C.text }]}>
                Welcome to Gonep, {user.full_name?.split(' ')[0] || 'Admin'}!
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                {user.active_facility_name} is verified. Here's what to set up first.
              </Text>
            </View>
            <TouchableOpacity onPress={() => persist('skip')} disabled={busy} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Icon name="x" lib="feather" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {STEPS.map((step) => (
              <View key={step.title} style={[s.row, { borderColor: C.border, backgroundColor: C.surface }]}>
                <View style={[s.stepIcon, { backgroundColor: C.primaryLight }]}>
                  <Icon name={step.icon} lib="feather" size={16} color={C.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{step.title}</Text>
                  <Text style={{ color: C.textSec, fontSize: 11, marginTop: 2, lineHeight: 16 }}>
                    {step.desc}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {error ? (
            <Text style={{ color: C.danger, fontSize: 12, marginTop: 8 }}>{error}</Text>
          ) : null}

          {/* Footer */}
          <View style={s.footer}>
            <Btn
              label="Skip for now"
              variant="ghost"
              onPress={() => persist('skip')}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <Btn
              label={busy ? 'Saving…' : 'Got it, let me start'}
              onPress={() => persist('done')}
              loading={busy}
              disabled={busy}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 8, textAlign: 'center' }}>
            Shown once on first login. Revisit anytime via Help → Getting Started.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card:       { width: '100%', maxWidth: 520, borderWidth: 1, borderRadius: 16, padding: 18 },
  header:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 16, fontWeight: '800' },
  row:        { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  stepIcon:   { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footer:     { flexDirection: 'row', marginTop: 12 },
});