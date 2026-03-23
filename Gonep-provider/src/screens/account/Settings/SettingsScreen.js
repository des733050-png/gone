// ─── SettingsScreen.js ────────────────────────────────────────────────────────
// Visible to: hospital_admin only.
// Sections: Appearance, Notifications, Security, Clinical Settings, About.
//
// Clinical Settings → edit_window_hours is the admin-configurable consultation
//   edit window. Changes are logged to the activity log.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Badge } from '../../../atoms/Badge';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getClinicalSettings, setClinicalSettings, appendLog } from '../../../api';
import { MOCK_CLINICAL_SETTINGS } from '../../../mock/data';

export function SettingsScreen({ user }) {
  const { C, isDark, toggle } = useTheme();
  const [pushNotifs,     setPushNotifs]    = useState(true);
  const [emailReports,   setEmailReports]  = useState(true);
  const [critAlerts,     setCritAlerts]    = useState(true);
  const [twoFA,          setTwoFA]         = useState(false);
  const [editWindowHrs,  setEditWindowHrs] = useState(24);
  const [savingWindow,   setSavingWindow]  = useState(false);
  const [windowSaved,    setWindowSaved]   = useState(false);

  const WINDOW_OPTIONS = MOCK_CLINICAL_SETTINGS.allowed_values; // [1,6,12,24,48,72]

  useEffect(() => {
    getClinicalSettings().then(s => {
      if (s?.edit_window_hours) setEditWindowHrs(s.edit_window_hours);
    }).catch(() => {});
  }, []);

  const saveEditWindow = async (hrs) => {
    setEditWindowHrs(hrs);
    setSavingWindow(true);
    await setClinicalSettings({ edit_window_hours: hrs });
    appendLog({
      staff: user ? `${user.first_name} ${user.last_name}` : 'Admin',
      staff_id: user?.id, role: user?.role || 'hospital_admin',
      module: 'Settings',
      action: 'Edit window changed',
      detail: `Consultation edit window set to ${hrs} hour${hrs !== 1 ? 's' : ''}`,
      type: 'settings',
    });
    setSavingWindow(false);
    setWindowSaved(true);
    setTimeout(() => setWindowSaved(false), 2000);
  };

  return (
    <ScreenContainer scroll>

      {/* ── Appearance ── */}
      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>APPEARANCE</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <View style={[styles.settingRow, { borderBottomColor: C.divider, borderBottomWidth: 1 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: C.text }]}>Dark Mode</Text>
            <Text style={[styles.settingDesc, { color: C.textMuted }]}>Switch between light and dark theme</Text>
          </View>
          <Switch
            value={isDark} onValueChange={toggle}
            trackColor={{ false: C.border, true: `${C.primary}80` }}
            thumbColor={isDark ? C.primary : '#fff'}
          />
        </View>
      </Card>

      {/* ── Notifications ── */}
      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>NOTIFICATIONS</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {[
          { label: 'Push Notifications', desc: 'Appointment and order alerts', val: pushNotifs, set: setPushNotifs, color: C.primary },
          { label: 'Critical Lab Alerts', desc: 'Immediate alerts for critical results', val: critAlerts, set: setCritAlerts, color: C.danger },
          { label: 'Email Reports', desc: 'Weekly clinical summary via email', val: emailReports, set: setEmailReports, color: C.primary },
        ].map((item, i, arr) => (
          <View key={item.label} style={[styles.settingRow, { borderBottomColor: C.divider, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>{item.label}</Text>
              <Text style={[styles.settingDesc, { color: C.textMuted }]}>{item.desc}</Text>
            </View>
            <Switch value={item.val} onValueChange={item.set} trackColor={{ false: C.border, true: `${item.color}80` }} thumbColor={item.val ? item.color : '#fff'} />
          </View>
        ))}
      </Card>

      {/* ── Clinical settings (admin only) ── */}
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

        {/* Hour selector pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {WINDOW_OPTIONS.map(hrs => (
            <TouchableOpacity
              key={hrs}
              onPress={() => saveEditWindow(hrs)}
              style={[styles.hourPill, {
                backgroundColor: editWindowHrs === hrs ? C.primary : C.surface,
                borderColor:     editWindowHrs === hrs ? C.primary : C.border,
                marginRight: 8,
              }]}
            >
              <Text style={{ color: editWindowHrs === hrs ? '#fff' : C.textSec, fontWeight: '700', fontSize: 13 }}>
                {hrs < 24 ? `${hrs}h` : `${hrs / 24}d`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {savingWindow ? (
          <Text style={{ color: C.textMuted, fontSize: 12 }}>Saving…</Text>
        ) : windowSaved ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="check-circle" lib="feather" size={13} color={C.success} />
            <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>Saved — edit window is now {editWindowHrs < 24 ? `${editWindowHrs} hour${editWindowHrs !== 1 ? 's' : ''}` : `${editWindowHrs/24} day${editWindowHrs !== 24 ? 's' : ''}`}</Text>
          </View>
        ) : (
          <Text style={{ color: C.textMuted, fontSize: 11 }}>
            Current: {editWindowHrs < 24 ? `${editWindowHrs} hour${editWindowHrs !== 1 ? 's' : ''}` : `${editWindowHrs/24} day${editWindowHrs !== 24 ? 's' : ''}`} · Tap to change
          </Text>
        )}
      </Card>

      {/* ── Security ── */}
      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>SECURITY</Text>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {[
          { label: 'Two-Factor Auth', desc: 'Extra login security via SMS or app', val: twoFA, set: setTwoFA, color: C.success, type: 'switch' },
          { label: 'Change Password', desc: 'Update your account password', type: 'button' },
        ].map((item, i) => (
          <View key={item.label} style={[styles.settingRow, { borderBottomColor: C.divider, borderBottomWidth: i === 0 ? 1 : 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>{item.label}</Text>
              <Text style={[styles.settingDesc, { color: C.textMuted }]}>{item.desc}</Text>
            </View>
            {item.type === 'switch' ? (
              <Switch value={item.val} onValueChange={item.set} trackColor={{ false: C.border, true: `${item.color}80` }} thumbColor={item.val ? item.color : '#fff'} />
            ) : (
              <Btn label="Change" variant="ghost" size="sm" />
            )}
          </View>
        ))}
      </Card>

      {/* ── About ── */}
      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>ABOUT</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {[
          { label: 'App Version', desc: 'GONEP Provider v1.0.0', ctrl: <Badge label="Up to date" color="success" /> },
          { label: 'Environment', desc: process.env.EXPO_PUBLIC_API_MODE || 'mock', ctrl: <Badge label={process.env.EXPO_PUBLIC_API_MODE || 'mock'} color="primary" /> },
        ].map((item, i, arr) => (
          <View key={item.label} style={[styles.settingRow, { borderBottomColor: C.divider, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: C.text }]}>{item.label}</Text>
              <Text style={[styles.settingDesc, { color: C.textMuted }]}>{item.desc}</Text>
            </View>
            {item.ctrl}
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  settingRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  settingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingDesc:  { fontSize: 12 },
  settingIcon:  { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hourPill:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
});
