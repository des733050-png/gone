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

  const Stars = ({ n }) => (
    <View style={{ flexDirection: 'row' }}>
      {[1,2,3,4,5].map((i) => (
        <Icon key={i} name="star" lib="mc" size={16} color={i <= n ? C.warning : C.border} style={{ marginRight: 1 }} />
      ))}
    </View>
  );

  return (
    <ScreenContainer scroll>
      {/* Hero card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroInner}>
          <Avatar name={`${user.first_name} ${user.last_name}`} size={72} />
          <Text style={[styles.name, { color: C.text }]}>{user.first_name} {user.last_name}</Text>
          <Text style={[styles.email, { color: C.textMuted }]}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <Badge label="Rider" color="warning" />
            <Badge label={user.status === 'active' ? '🟢 Online' : '🔴 Offline'} color={user.status === 'active' ? 'success' : 'danger'} />
            <Badge label={`${user.total_trips} Trips`} color="primary" />
          </View>
          <View style={styles.ratingRow}>
            <Stars n={Math.round(user.rating)} />
            <Text style={[styles.ratingVal, { color: C.textSec }]}>{user.rating} / 5.0</Text>
          </View>
        </View>
        <Btn label={editing ? 'Cancel' : '✏️ Edit Profile'} onPress={() => setEditing((e) => !e)}
          variant={editing ? 'ghost' : 'secondary'} size="sm" style={{ alignSelf: 'center', marginTop: 12 }} />
      </Card>

      {editing ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Edit Profile</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Input label="First Name" value={form.first_name} onChangeText={(v) => setForm((f) => ({ ...f, first_name: v }))} />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Last Name"  value={form.last_name}  onChangeText={(v) => setForm((f) => ({ ...f, last_name: v }))} />
            </View>
          </View>
          <Input label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} icon="phone" />
          <Input label="Vehicle" value={form.vehicle} onChangeText={(v) => setForm((f) => ({ ...f, vehicle: v }))} icon="truck" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Save Changes" onPress={save} style={{ flex: 1 }} />
            <Btn label="Cancel" onPress={() => setEditing(false)} variant="ghost" />
          </View>
        </Card>
      ) : (
        <Card>
          {[
            { icon: 'phone',      lib: 'feather', label: 'Phone',    value: user.phone },
            { icon: 'bike',       lib: 'mc',      label: 'Vehicle',  value: user.vehicle },
            { icon: 'map-pin',    lib: 'feather', label: 'Zone',     value: user.zone },
            { icon: 'credit-card',lib: 'feather', label: 'Bank',     value: user.bank },
            { icon: 'calendar',   lib: 'feather', label: 'Joined',   value: user.joined },
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

const styles = StyleSheet.create({
  heroCard: { alignItems: 'center', marginBottom: 14 },
  heroInner: { alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingVal: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  fieldValue: { fontSize: 14, fontWeight: '600' },
});
