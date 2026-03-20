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

export function ProfileScreen({ user, onUpdateUser }) {
  const { C } = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...user });

  const save = () => { if (onUpdateUser) onUpdateUser(form); setEditing(false); };

  return (
    <ScreenContainer scroll>
      <Card style={styles.heroCard}>
        <Avatar name={`${user.first_name} ${user.last_name}`} size={68} />
        <Text style={[styles.name, { color: C.text }]}>{user.first_name} {user.last_name}</Text>
        <Text style={[styles.email, { color: C.textMuted }]}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <Badge label="Provider" color="primary" />
          <Badge label={user.specialty} color="cyan" />
          <Badge label="Verified ✓" color="success" />
        </View>
        <Btn label={editing ? 'Cancel' : '✏️ Edit Profile'} onPress={() => setEditing((e) => !e)}
          variant={editing ? 'ghost' : 'secondary'} size="sm" style={{ marginTop: 12 }} />
      </Card>

      {editing ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Edit Profile</Text>
          <Input label="First Name" value={form.first_name} onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))} />
          <Input label="Last Name"  value={form.last_name}  onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))} />
          <Input label="Phone"      value={form.phone}      onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} icon="phone" />
          <Input label="Specialty"  value={form.specialty}  onChangeText={(v) => setForm((f) => ({ ...f, specialty: v }))} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Save Changes" onPress={save} style={{ flex: 1 }} />
            <Btn label="Cancel" onPress={() => setEditing(false)} variant="ghost" />
          </View>
        </Card>
      ) : (
        <Card>
          {[
            { icon: 'phone',     lib: 'feather', label: 'Phone',      value: user.phone },
            { icon: 'stethoscope',lib:'mc',      label: 'Specialty',  value: user.specialty },
            { icon: 'hospital-building',lib:'mc',label: 'Facility',   value: user.facility },
            { icon: 'shield',    lib: 'feather', label: 'License No.', value: user.license },
          ].map((f, i, arr) => (
            <View key={f.label} style={[styles.fieldRow, { borderBottomColor: C.divider, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
              <Icon name={f.icon} lib={f.lib} size={18} color={C.primary} style={{ marginRight: 12, marginTop: 1 }} />
              <View>
                <Text style={[styles.fieldLabel, { color: C.textMuted }]}>{f.label}</Text>
                <Text style={[styles.fieldValue, { color: C.text }]}>{f.value}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}

const sStyles = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  settingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingDesc: { fontSize: 12 },
});

const styles = StyleSheet.create({
  heroCard: { alignItems: 'center', marginBottom: 14 },
  name: { fontSize: 20, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  fieldValue: { fontSize: 14, fontWeight: '600' },
});
