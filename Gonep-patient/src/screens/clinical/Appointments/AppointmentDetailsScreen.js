import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { getAppointmentById, updateAppointment } from '../../../api';
import { ScreenContainer } from '../../../organisms/ScreenContainer';

export function AppointmentDetailsScreen({ appointmentId, onBack }) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!appointmentId) {
        setLoading(false);
        return;
      }
      const data = await getAppointmentById(appointmentId);
      if (mounted) {
        setAppointment(data);
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [appointmentId]);

  if (!appointment) {
    return (
      <View style={[styles.center, { flex: 1 }]}>
        <Text style={{ color: C.textMuted, fontSize: 14 }}>
          {loading ? 'Loading appointment…' : 'Appointment not found.'}
        </Text>
        {onBack && (
          <Btn
            label="Back to Appointments"
            variant="ghost"
            size="sm"
            style={{ marginTop: 12 }}
            onPress={onBack}
          />
        )}
      </View>
    );
  }

  const reschedule = async () => {
    const updated = await updateAppointment(appointment.id, {
      status: 'pending',
    });
    if (updated) {
      setAppointment(updated);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenContainer
        scroll
        contentContainerStyle={{
          paddingBottom:
            Platform.OS === 'web' ? 24 : 24 + 64 + insets.bottom,
        }}
      >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.docAvatar, { backgroundColor: C.primaryLight }]}>
              <Icon name="stethoscope" lib="mc" size={22} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.docName, { color: C.text }]}>{appointment.doctor}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>
                {appointment.specialty} · {appointment.type}
              </Text>
            </View>
          </View>
          <Badge
            label={appointment.status}
            color={appointment.status === 'confirmed' ? 'success' : 'warning'}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: C.textMuted }]}>Date & Time</Text>
          <Text style={[styles.value, { color: C.text }]}>
            {appointment.date} at {appointment.time}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: C.textMuted }]}>Facility</Text>
          <Text style={[styles.value, { color: C.text }]}>{appointment.facility}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: C.textMuted }]}>Visit Type</Text>
          <Text style={[styles.value, { color: C.text }]}>{appointment.type}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: C.textMuted }]}>Reason</Text>
          <Text style={[styles.value, { color: C.text }]}>{appointment.reason}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: C.textMuted }]}>Address / Location</Text>
          <Text style={[styles.value, { color: C.text }]}>{appointment.address}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: C.textMuted }]}>Consultation Fee</Text>
          <Text style={[styles.value, { color: C.text }]}>{appointment.fee}</Text>
        </View>

        <View style={styles.actions}>
          {onBack && (
            <Btn
              label="Back"
              variant="ghost"
              size="sm"
              onPress={onBack}
            />
          )}
          {appointment.can_reschedule && (
            <Btn
              label={appointment.status === 'pending' ? 'Rescheduled' : 'Reschedule'}
              variant="secondary"
              size="sm"
              style={{ marginLeft: 8 }}
              onPress={reschedule}
            />
          )}
        </View>
      </Card>
      </ScreenContainer>

      {/* Mobile bottom actions */}
      {Platform.OS !== 'web' && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: C.navBg,
              borderTopColor: C.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <Btn label="Back" variant="ghost" size="lg" onPress={onBack} style={{ flex: 1 }} />
          {appointment.can_reschedule ? (
            <Btn
              label={appointment.status === 'pending' ? 'Rescheduled' : 'Reschedule'}
              variant="primary"
              size="lg"
              onPress={reschedule}
              style={{ flex: 1, marginLeft: 10 }}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 16,
    marginBottom: 2,
  },
  row: {
    marginTop: 8,
  },
  label: {
    fontSize: 11,
    marginBottom: 2,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: 'row',
  },
});
