// ─── SettingsScreen.js ────────────────────────────────────────────────────────
// Visible to: hospital_admin (facility admin) via nav.
// Clinical / facility settings: confirm + 20-minute edit lock + activity log.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Badge } from '../../../atoms/Badge';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { ResponsiveModal } from '../../../molecules/ResponsiveModal';
import { getClinicalSettings, setClinicalSettings, appendLog } from '../../../api';
import { useCountdown } from '../../../hooks/useCountdown';
import { ChangePasswordModal } from './molecules/ChangePasswordModal';

const CLINICAL_LOCK_KEY = 'settings_lock_until';
const LOCK_MS = 20 * 60 * 1000;

async function readLockUntilMs() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const v = Number(localStorage.getItem(CLINICAL_LOCK_KEY) || 0);
      return v > Date.now() ? v : 0;
    }
    const AS = require('@react-native-async-storage/async-storage').default;
    const raw = await AS.getItem(CLINICAL_LOCK_KEY);
    const v = Number(raw || 0);
    return v > Date.now() ? v : 0;
  } catch {
    return 0;
  }
}

async function persistLockUntilMs(ts) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(CLINICAL_LOCK_KEY, String(ts));
      return;
    }
    const AS = require('@react-native-async-storage/async-storage').default;
    await AS.setItem(CLINICAL_LOCK_KEY, String(ts));
  } catch (_) {}
}

async function clearLockStorage() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(CLINICAL_LOCK_KEY);
      return;
    }
    const AS = require('@react-native-async-storage/async-storage').default;
    await AS.removeItem(CLINICAL_LOCK_KEY);
  } catch (_) {}
}

export function SettingsScreen({ user, onLogout }) {
  const { C, isDark, toggle } = useTheme();
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailReports, setEmailReports] = useState(true);
  const [critAlerts, setCritAlerts] = useState(true);
  const [twoFA, setTwoFA] = useState(false);
  const [editWindowHrs, setEditWindowHrs] = useState(24);
  const [savingClinical, setSavingClinical] = useState(false);
  const [windowSaved, setWindowSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [windowOptions, setWindowOptions] = useState([1, 6, 12, 24, 48, 72]);
  const WINDOW_OPTIONS = windowOptions;

  const [lockUntil, setLockUntil] = useState(null);
  const { minutes, seconds, isExpired } = useCountdown(lockUntil);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPatch, setPendingPatch] = useState(null);
  const [revertSnapshot, setRevertSnapshot] = useState(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [toast, setToast] = useState('');

  const clinicalLocked = lockUntil != null && lockUntil > Date.now();

  useEffect(() => {
    let alive = true;
    readLockUntilMs().then((v) => {
      if (alive && v) setLockUntil(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!lockUntil || !isExpired) return;
    clearLockStorage().then(() => setLockUntil(null));
  }, [lockUntil, isExpired]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    getClinicalSettings()
      .then((s) => {
        if (!mounted || !s) return;
        if (s.edit_window_hours) setEditWindowHrs(s.edit_window_hours);
        if (Array.isArray(s.allowed_values) && s.allowed_values.length > 0) setWindowOptions(s.allowed_values);
        if (typeof s.push_notifications === 'boolean') setPushNotifs(s.push_notifications);
        if (typeof s.email_reports === 'boolean') setEmailReports(s.email_reports);
        if (typeof s.critical_lab_alerts === 'boolean') setCritAlerts(s.critical_lab_alerts);
        if (typeof s.two_factor_enabled === 'boolean') setTwoFA(s.two_factor_enabled);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Unable to load settings.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const snapshotClinical = useCallback(
    () => ({
      editWindowHrs,
      pushNotifs,
      emailReports,
      critAlerts,
      twoFA,
    }),
    [editWindowHrs, pushNotifs, emailReports, critAlerts, twoFA]
  );

  const restoreSnapshot = useCallback((snap) => {
    if (!snap) return;
    setEditWindowHrs(snap.editWindowHrs);
    setPushNotifs(snap.pushNotifs);
    setEmailReports(snap.emailReports);
    setCritAlerts(snap.critAlerts);
    setTwoFA(snap.twoFA);
  }, []);

  const openClinicalConfirm = useCallback(
    (patch) => {
      if (clinicalLocked) return;
      setPendingPatch(patch);
      setRevertSnapshot(snapshotClinical());
      setConfirmOpen(true);
    },
    [clinicalLocked, snapshotClinical]
  );

  const applyClinicalSave = useCallback(async () => {
    if (!pendingPatch) return;
    setSavingClinical(true);
    setError('');
    try {
      const updated = await setClinicalSettings(pendingPatch);
      if (updated?.edit_window_hours != null) setEditWindowHrs(updated.edit_window_hours);
      if (typeof updated?.push_notifications === 'boolean') setPushNotifs(updated.push_notifications);
      if (typeof updated?.critical_lab_alerts === 'boolean') setCritAlerts(updated.critical_lab_alerts);
      if (typeof updated?.email_reports === 'boolean') setEmailReports(updated.email_reports);
      if (typeof updated?.two_factor_enabled === 'boolean') setTwoFA(updated.two_factor_enabled);

      const until = Date.now() + LOCK_MS;
      setLockUntil(until);
      await persistLockUntilMs(until);

      const meta = { patch: pendingPatch, previous: revertSnapshot };
      appendLog({
        staff: user ? `${user.first_name} ${user.last_name}`.trim() : 'Admin',
        staff_id: user?.id,
        role: user?.role || 'hospital_admin',
        module: 'Settings',
        action: 'settings_changed',
        detail: JSON.stringify(meta),
        type: 'settings',
      });

      setWindowSaved(true);
      setTimeout(() => setWindowSaved(false), 2000);
      setToast('Clinical settings saved.');
    } catch (err) {
      setError(err?.message || 'Unable to save settings.');
      restoreSnapshot(revertSnapshot);
    } finally {
      setSavingClinical(false);
      setConfirmOpen(false);
      setPendingPatch(null);
      setRevertSnapshot(null);
    }
  }, [pendingPatch, revertSnapshot, restoreSnapshot, user]);

  const cancelClinicalConfirm = useCallback(() => {
    restoreSnapshot(revertSnapshot);
    setConfirmOpen(false);
    setPendingPatch(null);
    setRevertSnapshot(null);
  }, [revertSnapshot, restoreSnapshot]);

  const lockBanner = useMemo(() => {
    if (!clinicalLocked) return null;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return (
      <View style={[styles.lockBanner, { backgroundColor: C.warningLight, borderColor: C.warning }]}>
        <Icon name="lock" lib="feather" size={14} color={C.warning} style={{ marginRight: 8 }} />
        <Text style={{ color: C.text, fontSize: 13, flex: 1 }}>
          {`Settings locked — next edit available in ${mm}:${ss}`}
        </Text>
      </View>
    );
  }, [clinicalLocked, minutes, seconds, C]);

  return (
    <ScreenContainer scroll>
      {lockBanner}
      {!!toast && (
        <View style={[styles.lockBanner, { backgroundColor: C.successLight, borderColor: C.success }]}>
          <Icon name="check-circle" lib="feather" size={14} color={C.success} style={{ marginRight: 8 }} />
          <Text style={{ color: C.success, fontSize: 13 }}>{toast}</Text>
        </View>
      )}

      {loading && <Text style={{ color: C.textMuted, marginBottom: 12 }}>Loading settings...</Text>}
      {!!error && <Text style={{ color: C.danger, marginBottom: 12 }}>{error}</Text>}

      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>APPEARANCE</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <View style={[styles.settingRow, { borderBottomColor: C.divider, borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: C.text }]}>Dark Mode</Text>
            <Text style={[styles.settingDesc, { color: C.textMuted }]}>Switch between light and dark theme</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggle}
            trackColor={{ false: C.border, true: `${C.primary}80` }}
            thumbColor={isDark ? C.primary : '#fff'}
          />
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>NOTIFICATIONS</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {[
          {
            label: 'Push Notifications',
            desc: 'Appointment and order alerts',
            val: pushNotifs,
            key: 'push_notifications',
          },
          {
            label: 'Critical Lab Alerts',
            desc: 'Immediate alerts for critical results',
            val: critAlerts,
            key: 'critical_lab_alerts',
          },
          {
            label: 'Email Reports',
            desc: 'Weekly clinical summary via email',
            val: emailReports,
            key: 'email_reports',
          },
        ].map((item, i, arr) => (
          <View
            key={item.label}
            style={[
              styles.settingRow,
              { borderBottomColor: C.divider, borderBottomWidth: i < arr.length - 1 ? 1 : 0 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>{item.label}</Text>
              <Text style={[styles.settingDesc, { color: C.textMuted }]}>{item.desc}</Text>
            </View>
            <Switch
              value={item.val}
              disabled={clinicalLocked}
              onValueChange={(value) => {
                openClinicalConfirm({ [item.key]: value });
              }}
              trackColor={{
                false: C.border,
                true: `${item.label === 'Critical Lab Alerts' ? C.danger : C.primary}80`,
              }}
              thumbColor={
                item.val ? (item.label === 'Critical Lab Alerts' ? C.danger : C.primary) : '#fff'
              }
            />
          </View>
        ))}
      </Card>

      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>CLINICAL SETTINGS</Text>
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <View style={[styles.settingIcon, { backgroundColor: C.primaryLight }]}>
            <Icon name="clock" lib="feather" size={16} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: C.text }]}>Consultation edit window</Text>
            <Text style={[styles.settingDesc, { color: C.textMuted }]}>
              Maximum time after a consultation is saved that a doctor can edit it.
              After this window, notes become read-only. All changes are logged.
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {WINDOW_OPTIONS.map((hrs) => (
            <TouchableOpacity
              key={hrs}
              disabled={clinicalLocked}
              onPress={() => openClinicalConfirm({ edit_window_hours: hrs })}
              style={[
                styles.hourPill,
                {
                  backgroundColor: editWindowHrs === hrs ? C.primary : C.surface,
                  borderColor: editWindowHrs === hrs ? C.primary : C.border,
                  marginRight: 8,
                  opacity: clinicalLocked ? 0.45 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: editWindowHrs === hrs ? '#fff' : C.textSec,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {hrs < 24 ? `${hrs}h` : `${hrs / 24}d`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {savingClinical ? (
          <Text style={{ color: C.textMuted, fontSize: 12 }}>Saving…</Text>
        ) : windowSaved ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="check-circle" lib="feather" size={13} color={C.success} />
            <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>
              Saved — edit window is now{' '}
              {editWindowHrs < 24
                ? `${editWindowHrs} hour${editWindowHrs !== 1 ? 's' : ''}`
                : `${editWindowHrs / 24} day${editWindowHrs !== 24 ? 's' : ''}`}
            </Text>
          </View>
        ) : (
          <Text style={{ color: C.textMuted, fontSize: 11 }}>
            Current:{' '}
            {editWindowHrs < 24
              ? `${editWindowHrs} hour${editWindowHrs !== 1 ? 's' : ''}`
              : `${editWindowHrs / 24} day${editWindowHrs !== 24 ? 's' : ''}`}{' '}
            · Tap to change
          </Text>
        )}
      </Card>

      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>SECURITY</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <View style={[styles.settingRow, { borderBottomColor: C.divider, borderBottomWidth: 1 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: C.text }]}>Two-Factor Auth</Text>
            <Text style={[styles.settingDesc, { color: C.textMuted }]}>Extra login security via SMS or app</Text>
          </View>
          <Switch
            value={twoFA}
            disabled={clinicalLocked}
            onValueChange={(value) => openClinicalConfirm({ two_factor_enabled: value })}
            trackColor={{ false: C.border, true: `${C.success}80` }}
            thumbColor={twoFA ? C.success : '#fff'}
          />
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: C.text }]}>Change Password</Text>
            <Text style={[styles.settingDesc, { color: C.textMuted }]}>Update your account password</Text>
          </View>
          <Btn label="Change" variant="ghost" size="sm" onPress={() => setPasswordModal(true)} />
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>ABOUT</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {[
          { label: 'App Version', desc: 'GONEP Provider v1.0.0', ctrl: <Badge label="Up to date" color="success" /> },
          {
            label: 'Environment',
            desc: process.env.EXPO_PUBLIC_API_MODE || 'mock',
            ctrl: <Badge label={process.env.EXPO_PUBLIC_API_MODE || 'mock'} color="primary" />,
          },
        ].map((item, i, arr) => (
          <View
            key={item.label}
            style={[
              styles.settingRow,
              { borderBottomColor: C.divider, borderBottomWidth: i < arr.length - 1 ? 1 : 0 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>{item.label}</Text>
              <Text style={[styles.settingDesc, { color: C.textMuted }]}>{item.desc}</Text>
            </View>
            {item.ctrl}
          </View>
        ))}
      </Card>

      <ResponsiveModal visible={confirmOpen} onClose={cancelClinicalConfirm}>
        <Text style={[styles.confirmTitle, { color: C.text }]}>Confirm Change</Text>
        <Text style={{ color: C.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
          Are you sure? You will not be able to edit settings again for 20 minutes.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label="Cancel" variant="ghost" onPress={cancelClinicalConfirm} style={{ flex: 1 }} />
          <Btn label="Confirm" onPress={applyClinicalSave} style={{ flex: 1 }} loading={savingClinical} />
        </View>
      </ResponsiveModal>

      <ChangePasswordModal
        visible={passwordModal}
        onClose={() => setPasswordModal(false)}
        onSessionEnded={onLogout}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  settingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingDesc: { fontSize: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hourPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  confirmTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
});
