import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { T } from '../../../atoms/T';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Avatar } from '../../../atoms/Avatar';
import { Badge } from '../../../atoms/Badge';
import { Input } from '../../../atoms/Input';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { ROLE_LABELS, ROLE_COLORS } from '../../../config/roles';
import { updateCurrentUser } from '../../../api';

export function ProfileScreen({ user, onUpdateUser }) {
  const { C } = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...user });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    try {
      setSaving(true);
      setError('');
      const updated = await updateCurrentUser({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || '',
        specialty: form.specialty || '',
      });
      if (onUpdateUser) onUpdateUser(updated || form);
      setEditing(false);
    } catch (err) {
      setError(err?.message || 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const roleColorKey = ROLE_COLORS[user.role] || 'primary';
  const roleColorMap = {
    primary: C.primary, purple: C.purple || '#8B5CF6',
    warning: C.warning, success: C.success, accent: C.accent || C.secondary,
  };
  const roleColor = roleColorMap[roleColorKey] || C.primary;

  return (
    <ScreenContainer scroll>

      {/* Hero card */}
      <Card style={[styles.heroCard, { borderColor: C.border }]}>
        <Avatar name={`${user.first_name} ${user.last_name}`} size={72} />
        <T style={[styles.name, { color: C.text }]}>{user.first_name} {user.last_name}</T>
        <T style={[styles.email, { color: C.textMuted }]}>{user.email}</T>
        <View style={styles.badgeRow}>
          <View style={[styles.rolePill, { backgroundColor: `${roleColor}18` }]}>
            <T style={{ color: roleColor, fontSize: 12, fontWeight: '700' }}>{ROLE_LABELS[user.role]}</T>
          </View>
          {user.specialty && <Badge label={user.specialty} color="primary" />}
          <Badge label="Verified ✓" color="success" />
        </View>
        <T style={[styles.facility, { color: C.textSec }]}>{user.facility}</T>
        <Btn
          label={editing ? 'Cancel' : 'Edit profile'}
          onPress={() => { setEditing(e => !e); setForm({ ...user }); }}
          variant={editing ? 'ghost' : 'secondary'}
          size="sm"
          style={{ marginTop: 14 }}
        />
      </Card>

      {/* Info grid */}
      {!!error && (
        <Card style={styles.infoCard}>
          <T style={{ color: C.danger, fontSize: 12 }}>{error}</T>
        </Card>
      )}
      {!editing && (
        <Card style={styles.infoCard}>
          <T style={[styles.sectionTitle, { color: C.text }]}>Account details</T>
          {[
            { icon: 'mail',      label: 'Email',     value: user.email },
            { icon: 'phone',     label: 'Phone',     value: user.phone || '—' },
            { icon: 'home',      label: 'Facility',  value: user.facility },
            ...(user.specialty ? [{ icon: 'activity', label: 'Specialty', value: user.specialty }] : []),
            ...(user.license    ? [{ icon: 'award',    label: 'License',   value: user.license }]   : []),
          ].map(row => (
            <View key={row.label} style={[styles.infoRow, { borderBottomColor: C.divider }]}>
              <Icon name={row.icon} lib="feather" size={14} color={C.textMuted} style={{ marginRight: 10, marginTop: 1 }} />
              <T style={[styles.infoLabel, { color: C.textMuted }]}>{row.label}</T>
              <T style={[styles.infoValue, { color: C.text }]} numberOfLines={1}>{row.value}</T>
            </View>
          ))}
        </Card>
      )}

      {/* Multi-hospital affiliations (doctors only) */}
      {!editing && user.affiliated_hospitals && user.affiliated_hospitals.length > 1 && (
        <Card style={styles.infoCard}>
          <T style={[styles.sectionTitle, { color: C.text }]}>Hospital affiliations</T>
          <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
            <Icon name="home" lib="feather" size={14} color={C.textMuted} style={{ marginRight: 10 }} />
            <T style={[styles.infoValue, { color: C.textSec }]}>
              Affiliated with {user.affiliated_hospitals.length} hospitals. Your data scope is limited to whichever hospital you're currently signed into.
            </T>
          </View>
        </Card>
      )}

      {/* Edit form */}
      {editing && (
        <Card style={styles.infoCard}>
          <T style={[styles.sectionTitle, { color: C.text }]}>Edit profile</T>
          <Input label="First name"  value={form.first_name} onChangeText={v => set('first_name', v)} icon="user" />
          <Input label="Last name"   value={form.last_name}  onChangeText={v => set('last_name', v)} />
          <Input label="Phone"       value={form.phone || ''} onChangeText={v => set('phone', v)} icon="phone" keyboardType="phone-pad" />
          {user.specialty !== null && (
            <Input label="Specialty" value={form.specialty || ''} onChangeText={v => set('specialty', v)} icon="activity" />
          )}
          <View style={styles.editActions}>
            <Btn label={saving ? 'Saving...' : 'Save changes'} onPress={save} loading={saving} full />
          </View>
        </Card>
      )}

      {/* Role permissions summary */}
      <Card style={styles.infoCard}>
        <View style={styles.permHeader}>
          <Icon name="shield" lib="feather" size={15} color={C.primary} style={{ marginRight: 8 }} />
          <T style={[styles.sectionTitle, { color: C.text, marginBottom: 0 }]}>Your access level</T>
        </View>
        <T style={[styles.permDesc, { color: C.textMuted }]}>
          {ROLE_DESC[user.role] || 'Standard access'}
        </T>
      </Card>
    </ScreenContainer>
  );
}

const ROLE_DESC = {
  hospital_admin:  'Full access to all modules — clinical, billing, inventory, staff management, and settings. You can create and manage all team member accounts.',
  doctor:          'Access to your own patients, appointments, EMR records, prescriptions, and lab results only. Billing, settings, and other doctors\' data are not visible.',
  billing_manager: 'Access to the Billing module only. All clinical records, inventory, and staff management are hidden.',
  lab_manager:     'Access to Lab results, Inventory management, and Pharmacy. Clinical records and billing are not visible.',
  receptionist:    'Access to Appointments for scheduling and managing unassigned visits. No clinical or financial data is visible.',
};

const styles = StyleSheet.create({
  heroCard:   { alignItems: 'center', padding: 24, marginBottom: 14 },
  name:       { fontSize: 22, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  email:      { fontSize: 13, marginBottom: 10 },
  badgeRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6 },
  rolePill:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  facility:   { fontSize: 13 },
  infoCard:   { padding: 16, marginBottom: 14 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', marginBottom: 14 },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel:  { fontSize: 13, width: 72, flexShrink: 0 },
  infoValue:  { fontSize: 14, flex: 1, fontWeight: '500' },
  editActions:{ marginTop: 16 },
  permHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  permDesc:   { fontSize: 14, lineHeight: 20 },
});
