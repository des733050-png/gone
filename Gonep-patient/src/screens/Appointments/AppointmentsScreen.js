import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { useAppointments } from '../../hooks/useAppointments';
import { ScreenContainer } from '../../organisms/ScreenContainer';

export function AppointmentsScreen({ onOpenDetails }) {
  const { C } = useTheme();
  const { appointments } = useAppointments();

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.filtersRow}>
        <Btn label="Upcoming" variant="primary" size="sm" />
        <Btn label="Past" variant="ghost" size="sm" style={styles.filterBtn} />
        <Btn label="Cancelled" variant="ghost" size="sm" style={styles.filterBtn} />
      </View>

      {appointments.map((a) => (
        <Card key={a.id} hover style={styles.card}>
          <View style={styles.row}>
            <View style={styles.left}>
              <View style={[styles.docAvatar, { backgroundColor: C.primaryLight }]}>
                <Icon name="stethoscope" lib="mc" size={22} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.docName, { color: C.text }]}>{a.doctor}</Text>
                <Text style={[styles.sub, { color: C.textMuted }]}>
                  {a.specialty} · {a.type}
                </Text>
                <Text style={[styles.time, { color: C.primary }]}>
                  {a.date} at {a.time}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Badge
                label={a.status}
                color={a.status === 'confirmed' ? 'success' : 'warning'}
              />
              <Text style={[styles.fee, { color: C.text }]}>{a.fee}</Text>
              <Text style={{ color: C.textMuted, fontSize: 11 }}>{a.facility}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Btn
              label="View Details"
              variant="ghost"
              size="sm"
              onPress={() => onOpenDetails && onOpenDetails(a.id)}
            />
            <Btn
              label="Reschedule"
              variant="secondary"
              size="sm"
              style={styles.actionBtn}
              onPress={() => onOpenDetails && onOpenDetails(a.id)}
            />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterBtn: {
    marginLeft: 8,
  },
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  docAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docName: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
  },
  fee: {
    fontWeight: '700',
    fontSize: 13,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    marginLeft: 8,
  },
});

