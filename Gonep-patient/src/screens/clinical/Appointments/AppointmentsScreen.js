import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { SectionLoader } from '../../../atoms/SectionLoader';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getAppointmentStatusMeta } from '../../../utils/appointmentAlerts';
import { useMemo, useState } from 'react';

export function AppointmentsScreen({ appointments = [], loading = false, onOpenDetails }) {
  const { C } = useTheme();
  const [activeFilter, setActiveFilter] = useState('upcoming');

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const parseSchedule = (item) => {
      if (!item?.scheduled_for) return null;
      const dt = new Date(item.scheduled_for);
      return Number.isNaN(dt.getTime()) ? null : dt;
    };
    return (appointments || []).filter((item) => {
      const schedule = parseSchedule(item);
      if (activeFilter === 'in_progress') return item.status === 'in_progress';
      if (activeFilter === 'pending') return item.status === 'pending';
      if (activeFilter === 'past') {
        if (item.status === 'completed') return true;
        return schedule ? schedule < now && item.status !== 'in_progress' : false;
      }
      if (activeFilter === 'cancelled') return item.status === 'cancelled';
      // Default: upcoming
      if (item.status !== 'confirmed') return false;
      return schedule ? schedule >= now : true;
    });
  }, [appointments, activeFilter]);

  const emptyByFilter = {
    upcoming: 'No upcoming appointments.',
    in_progress: 'No appointments in progress.',
    pending: 'No appointments pending confirmation.',
    past: 'No past appointments yet.',
    cancelled: 'No cancelled appointments.',
  };

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.filtersRow}>
        <Btn
          label="Upcoming"
          variant={activeFilter === 'upcoming' ? 'primary' : 'ghost'}
          size="sm"
          onPress={() => setActiveFilter('upcoming')}
        />
        <Btn
          label="In Progress"
          variant={activeFilter === 'in_progress' ? 'primary' : 'ghost'}
          size="sm"
          style={styles.filterBtn}
          onPress={() => setActiveFilter('in_progress')}
        />
        <Btn
          label="Pending"
          variant={activeFilter === 'pending' ? 'primary' : 'ghost'}
          size="sm"
          style={styles.filterBtn}
          onPress={() => setActiveFilter('pending')}
        />
        <Btn
          label="Past"
          variant={activeFilter === 'past' ? 'primary' : 'ghost'}
          size="sm"
          style={styles.filterBtn}
          onPress={() => setActiveFilter('past')}
        />
        <Btn
          label="Cancelled"
          variant={activeFilter === 'cancelled' ? 'primary' : 'ghost'}
          size="sm"
          style={styles.filterBtn}
          onPress={() => setActiveFilter('cancelled')}
        />
      </View>
      <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>
        Showing {filteredAppointments.length} appointment{filteredAppointments.length === 1 ? '' : 's'}.
      </Text>

      {loading ? <SectionLoader label="Loading appointments..." /> : null}
      {!loading && filteredAppointments.length === 0 ? (
        <Card>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 4 }}>
            {emptyByFilter[activeFilter]}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            Change the filter to view other appointment groups.
          </Text>
        </Card>
      ) : null}
      {filteredAppointments.map((a) => {
        const statusMeta = getAppointmentStatusMeta(a.status);
        return (
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
                label={statusMeta.label}
                color={statusMeta.color}
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
            {a.can_reschedule ? (
              <Btn
                label="Reschedule"
                variant="secondary"
                size="sm"
                style={styles.actionBtn}
                onPress={() => onOpenDetails && onOpenDetails(a.id)}
              />
            ) : null}
          </View>
        </Card>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  filterBtn: {
    marginLeft: 8,
    marginBottom: 8,
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
