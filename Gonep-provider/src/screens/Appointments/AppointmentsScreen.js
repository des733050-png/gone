import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { useAppointments } from '../../hooks/useAppointments';
import { isOwnDataOnly } from '../../config/roles';

export function AppointmentsScreen({ user }) {
  const { C } = useTheme();
  const { appointments } = useAppointments();
  const [filter, setFilter] = useState('all');

  // Doctors only see their own appointments; receptionist sees all including unassigned
  const ownOnly = isOwnDataOnly(user?.role);
  const isReceptionist = user?.role === 'receptionist';

  const visible = appointments.filter(a => {
    if (ownOnly) return a.doctor_id === user?.id;
    return true;
  });

  const filtered = filter === 'all'        ? visible
    : filter === 'today'                   ? visible.filter(a => a.date === 'Today')
    : filter === 'unassigned'              ? visible.filter(a => a.status === 'unassigned')
    : visible;

  const unassignedCount = appointments.filter(a => a.status === 'unassigned').length;

  const statusColor = (s) => s === 'confirmed' ? 'success' : s === 'unassigned' ? 'danger' : 'warning';

  return (
    <ScreenContainer scroll>
      {ownOnly && (
        <View style={[styles.scopeNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
          <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.primary, fontSize: 12 }}>Showing your patients only</Text>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersRow}>
        {[
          { id: 'all',        label: 'All' },
          { id: 'today',      label: 'Today' },
          ...(isReceptionist ? [{ id: 'unassigned', label: `Unassigned (${unassignedCount})` }] : []),
        ].map((f) => (
          <Btn key={f.id} label={f.label} variant={filter === f.id ? 'primary' : 'ghost'}
            size="sm" onPress={() => setFilter(f.id)} style={{ marginRight: 8 }} />
        ))}
      </View>

      {filtered.length === 0 && (
        <View style={styles.empty}>
          <Icon name="calendar" lib="feather" size={36} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>No appointments to show</Text>
        </View>
      )}

      {filtered.map((a) => (
        <Card key={a.id} hover style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: a.status === 'unassigned' ? C.dangerLight : C.primaryLight }]}>
              <Icon name="account" lib="mc" size={22} color={a.status === 'unassigned' ? C.danger : C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.patient, { color: C.text }]}>{a.patient}</Text>
              <Text style={[styles.sub, { color: C.textMuted }]}>Age {a.age} · {a.type}</Text>
              <Text style={[styles.time, { color: C.primary }]}>⏰ {a.date} at {a.time}</Text>
              <Text style={[styles.reason, { color: C.textSec }]}>{a.reason}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge label={a.status === 'unassigned' ? 'Unassigned' : a.status} color={statusColor(a.status)} />
              <Text style={[styles.phone, { color: C.textMuted }]}>{a.phone}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            {a.status === 'unassigned' && isReceptionist ? (
              <>
                <Btn label="Assign doctor" size="sm"
                  icon={<Icon name="user-plus" lib="feather" size={14} color="#fff" />} />
                <Btn label="Reschedule" variant="secondary" size="sm" style={{ marginLeft: 8 }} />
              </>
            ) : (
              <>
                {!isReceptionist && (
                  <Btn label="Start Consult" size="sm"
                    icon={<Icon name="video" lib="feather" size={14} color="#fff" />} />
                )}
                {!isReceptionist && (
                  <Btn label="Write Rx" variant="secondary" size="sm" style={{ marginLeft: 8 }} />
                )}
                <Btn label={isReceptionist ? 'Reschedule' : 'Cancel'} variant="ghost" size="sm" style={{ marginLeft: 8 }} />
              </>
            )}
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scopeNote:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 },
  filtersRow: { flexDirection: 'row', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  card:       { marginBottom: 12, padding: 14 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatar:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  patient:    { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sub:        { fontSize: 12, color: '#888', marginBottom: 2 },
  time:       { fontSize: 12, marginBottom: 2 },
  reason:     { fontSize: 13 },
  phone:      { fontSize: 11 },
  actions:    { flexDirection: 'row', flexWrap: 'wrap' },
  empty:      { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText:  { fontSize: 14 },
});
