import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Btn } from '../../atoms/Btn';
import { Avatar } from '../../atoms/Avatar';
import { Badge } from '../../atoms/Badge';
import { Input } from '../../atoms/Input';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { ROLE_LABELS, ROLE_COLORS } from '../../config/roles';

export function ProfileScreen({ user, onUpdateUser }) {
  const { C } = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...user });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = () => { if (onUpdateUser) onUpdateUser(form); setEditing(false); };

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
        <Text style={[styles.name, { color: C.text }]}>{user.first_name} {user.last_name}</Text>
        <Text style={[styles.email, { color: C.textMuted }]}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.rolePill, { backgroundColor: `${roleColor}18` }]}>
            <Text style={{ color: roleColor, fontSize: 12, fontWeight: '700' }}>{ROLE_LABELS[user.role]}</Text>
          </View>
          {user.specialty && <Badge label={user.specialty} color="primary" />}
          <Badge label="Verified ✓" color="success" />
        </View>
        <Text style={[styles.facility, { color: C.textSec }]}>{user.facility}</Text>
        <Btn
          label={editing ? 'Cancel' : 'Edit profile'}
          onPress={() => { setEditing(e => !e); setForm({ ...user }); }}
          variant={editing ? 'ghost' : 'secondary'}
          size="sm"
          style={{ marginTop: 14 }}
        />
      </Card>

      {/* Info grid */}
      {!editing && (
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Account details</Text>
          {[
            { icon: 'mail',      label: 'Email',     value: user.email },
            { icon: 'phone',     label: 'Phone',     value: user.phone || '—' },
            { icon: 'home',      label: 'Facility',  value: user.facility },
            ...(user.specialty ? [{ icon: 'activity', label: 'Specialty', value: user.specialty }] : []),
            ...(user.license    ? [{ icon: 'award',    label: 'License',   value: user.license }]   : []),
          ].map(row => (
            <View key={row.label} style={[styles.infoRow, { borderBottomColor: C.divider }]}>
              <Icon name={row.icon} lib="feather" size={14} color={C.textMuted} style={{ marginRight: 10, marginTop: 1 }} />
              <Text style={[styles.infoLabel, { color: C.textMuted }]}>{row.label}</Text>
              <Text style={[styles.infoValue, { color: C.text }]} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Multi-hospital affiliations (doctors only) */}
      {!editing && user.affiliated_hospitals && user.affiliated_hospitals.length > 1 && (
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Hospital affiliations</Text>
          <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
            <Icon name="home" lib="feather" size={14} color={C.textMuted} style={{ marginRight: 10 }} />
            <Text style={[styles.infoValue, { color: C.textSec }]}>
              Affiliated with {user.affiliated_hospitals.length} hospitals. Your data scope is limited to whichever hospital you're currently signed into.
            </Text>
          </View>
        </Card>
      )}

      {/* Edit form */}
      {editing && (
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Edit profile</Text>
          <Input label="First name"  value={form.first_name} onChangeText={v => set('first_name', v)} icon="user" />
          <Input label="Last name"   value={form.last_name}  onChangeText={v => set('last_name', v)} />
          <Input label="Phone"       value={form.phone || ''} onChangeText={v => set('phone', v)} icon="phone" keyboardType="phone-pad" />
          {user.specialty !== null && (
            <Input label="Specialty" value={form.specialty || ''} onChangeText={v => set('specialty', v)} icon="activity" />
          )}
          <View style={styles.editActions}>
            <Btn label="Save changes" onPress={save} full />
          </View>
        </Card>
      )}

      {/* Role permissions summary */}
      <Card style={styles.infoCard}>
        <View style={styles.permHeader}>
          <Icon name="shield" lib="feather" size={15} color={C.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 0 }]}>Your access level</Text>
        </View>
        <Text style={[styles.permDesc, { color: C.textMuted }]}>
          {ROLE_DESC[user.role] || 'Standard access'}
        </Text>
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
  name:       { fontSize: 20, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  email:      { fontSize: 13, marginBottom: 10 },
  badgeRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6 },
  rolePill:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  facility:   { fontSize: 12 },
  infoCard:   { padding: 16, marginBottom: 14 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 14 },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel:  { fontSize: 12, width: 72, flexShrink: 0 },
  infoValue:  { fontSize: 13, flex: 1, fontWeight: '500' },
  editActions:{ marginTop: 16 },
  permHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  permDesc:   { fontSize: 13, lineHeight: 19 },
});
