import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { Input } from '../../atoms/Input';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { useAppointments } from '../../hooks/useAppointments';

export function AppointmentsScreen() {
  const { C } = useTheme();
  const { appointments } = useAppointments();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.date === 'Today');

  return (
    <ScreenContainer scroll>
      <View style={styles.filtersRow}>
        {['all', 'today'].map((f) => (
          <Btn key={f} label={f === 'all' ? 'All' : 'Today'} variant={filter === f ? 'primary' : 'ghost'} size="sm"
            onPress={() => setFilter(f)} style={{ marginRight: 8 }} />
        ))}
      </View>
      {filtered.map((a) => (
        <Card key={a.id} hover style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: C.primaryLight }]}>
              <Icon name="account" lib="mc" size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.patient, { color: C.text }]}>{a.patient}</Text>
              <Text style={[styles.sub, { color: C.textMuted }]}>Age {a.age} · {a.type}</Text>
              <Text style={[styles.time, { color: C.primary }]}>⏰ {a.date} at {a.time}</Text>
              <Text style={[styles.reason, { color: C.textSec }]}>{a.reason}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Badge label={a.status} color={a.status === 'confirmed' ? 'success' : 'warning'} />
              <Text style={[styles.phone, { color: C.textMuted }]}>{a.phone}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Btn label="Start Consult" size="sm" icon={<Icon name="video" lib="feather" size={14} color="#fff" />} />
            <Btn label="Write Rx" variant="secondary" size="sm" style={{ marginLeft: 8 }} />
            <Btn label="Cancel" variant="ghost" size="sm" style={{ marginLeft: 8 }} />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersRow: { flexDirection: 'row', marginBottom: 14 },
  card: { marginBottom: 12, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  patient: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 12, marginBottom: 2 },
  time: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  reason: { fontSize: 13 },
  phone: { fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
});
