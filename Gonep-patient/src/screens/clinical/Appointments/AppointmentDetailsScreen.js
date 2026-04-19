import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Modal, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { getAppointmentById, updateAppointment } from '../../../api';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getAppointmentStatusMeta } from '../../../utils/appointmentAlerts';

export function AppointmentDetailsScreen({ appointmentId, onBack, onAppointmentChanged }) {
  const { C } = useTheme();
  const { width } = useResponsive();
  const insets = useSafeAreaInsets();
  const isNarrow = width < 760;
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [rescheduleError, setRescheduleError] = useState('');

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

  const minimumRescheduleDate = () => new Date(Date.now() + 48 * 60 * 60 * 1000);

  const buildSelectedSchedule = () => {
    const dt = new Date(selectedDate);
    dt.setHours(selectedHour, selectedMinute, 0, 0);
    return dt;
  };

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

  const isPastAllowedWindow = (day) => {
    const min = minimumRescheduleDate();
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay < min;
  };

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const leadingEmpty = monthStart.getDay();
  const calendarCells = [
    ...Array.from({ length: leadingEmpty }).map(() => null),
    ...Array.from({ length: monthEnd.getDate() }).map((_, idx) =>
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), idx + 1)
    ),
  ];

  const minimumForSelectedDay = (() => {
    const min = minimumRescheduleDate();
    return sameDay(selectedDate, min) ? min : null;
  })();

  const minuteOptions = Array.from({ length: 60 }).map((_, n) => n);
  const hourOptions = Array.from({ length: 24 }).map((_, n) => n);

  const openRescheduleModal = () => {
    const minAllowed = minimumRescheduleDate();
    const source = appointment?.scheduled_for ? new Date(appointment.scheduled_for) : minAllowed;
    const base = source < minAllowed ? minAllowed : source;
    setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setSelectedDate(new Date(base.getFullYear(), base.getMonth(), base.getDate()));
    setSelectedHour(base.getHours());
    setSelectedMinute(base.getMinutes());
    setRescheduleError('');
    setRescheduleModalOpen(true);
  };

  const reschedule = async () => {
    const parsed = buildSelectedSchedule();
    if (parsed < minimumRescheduleDate()) {
      setRescheduleError('Reschedule must be at least 48 hours from now.');
      return;
    }
    try {
      setActionError('');
      setRescheduleError('');
      const updated = await updateAppointment(appointment.id, {
        status: 'pending',
        scheduled_for: parsed.toISOString(),
      });
      if (updated) {
        setAppointment(updated);
        onAppointmentChanged?.(updated);
        setRescheduleModalOpen(false);
      }
    } catch (error) {
      const msg = error?.message || 'Unable to reschedule right now.';
      setActionError(msg);
      setRescheduleError(msg);
    }
  };

  const cancelAppointment = async () => {
    try {
      setActionError('');
      const updated = await updateAppointment(appointment.id, {
        status: 'cancelled',
        cancellation_reason: cancelReason,
      });
      if (updated) {
        setAppointment(updated);
        onAppointmentChanged?.(updated);
        setCancelReason('');
        setCancelModalOpen(false);
      }
    } catch (error) {
      setActionError(error?.message || 'Unable to cancel appointment.');
    }
  };
  const statusMeta = getAppointmentStatusMeta(appointment.status);
  const canAttemptCancel =
    appointment.status !== 'cancelled' && appointment.status !== 'completed';
  const canCancelAllowed =
    typeof appointment.can_cancel === 'boolean'
      ? appointment.can_cancel
      : canAttemptCancel;

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
            label={statusMeta.label}
            color={statusMeta.color}
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
        {appointment.status === 'cancelled' && appointment.cancelled_by ? (
          <View style={styles.row}>
            <Text style={[styles.label, { color: C.textMuted }]}>Cancelled By</Text>
            <Text style={[styles.value, { color: C.text }]}>{appointment.cancelled_by}</Text>
          </View>
        ) : null}
        {appointment.status === 'cancelled' && appointment.cancellation_reason ? (
          <View style={styles.row}>
            <Text style={[styles.label, { color: C.textMuted }]}>Cancellation Reason</Text>
            <Text style={[styles.value, { color: C.text }]}>{appointment.cancellation_reason}</Text>
          </View>
        ) : null}
        {actionError ? (
          <Text style={{ color: C.danger, fontSize: 12, marginTop: 10 }}>{actionError}</Text>
        ) : null}

        {Platform.OS === 'web' ? (
          <View style={styles.actions}>
            {onBack ? (
              <Btn
                label="Back"
                variant="ghost"
                size="sm"
                onPress={onBack}
              />
            ) : null}
            {appointment.can_reschedule ? (
              <Btn
                label={appointment.status === 'pending' ? 'Rescheduled' : 'Reschedule'}
                variant="secondary"
                size="sm"
                style={{ marginLeft: 8 }}
                onPress={openRescheduleModal}
              />
            ) : null}
            {canAttemptCancel ? (
              <Btn
                label="Cancel"
                variant="ghost"
                size="sm"
                style={{ marginLeft: 8 }}
                disabled={!canCancelAllowed}
                onPress={() => setCancelModalOpen(true)}
              />
            ) : null}
          </View>
        ) : null}

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
              onPress={openRescheduleModal}
              style={{ flex: 1, marginLeft: 10 }}
            />
          ) : null}
          {canAttemptCancel ? (
            <Btn
              label="Cancel"
              variant="ghost"
              size="lg"
              disabled={!canCancelAllowed}
              onPress={() => setCancelModalOpen(true)}
              style={{ flex: 1, marginLeft: 10 }}
            />
          ) : null}
        </View>
      )}
      {canAttemptCancel && !canCancelAllowed ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 10) }}>
          <Text style={{ color: C.textMuted, fontSize: 11 }}>
            Cancellation is locked because less than 24 hours remain.
          </Text>
        </View>
      ) : null}
      <Modal
        visible={rescheduleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRescheduleModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              isNarrow ? styles.modalCardNarrow : null,
              { backgroundColor: C.card, borderColor: C.border },
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
            <Text style={[styles.modalTitle, { color: C.text }]}>Reschedule Appointment</Text>
            <Text style={[styles.modalBody, { color: C.textMuted }]}>
              Pick a new date and time. Times earlier than 48 hours from now are not allowed.
            </Text>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                style={[styles.monthNavBtn, { borderColor: C.border }]}
              >
                <Text style={{ color: C.text }}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={{ color: C.text, fontWeight: '700' }}>
                {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                style={[styles.monthNavBtn, { borderColor: C.border }]}
              >
                <Text style={{ color: C.text }}>{'>'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                <Text key={d} style={[styles.weekCell, { color: C.textMuted }]}>{d}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, idx) => {
                if (!day) return <View key={`e-${idx}`} style={styles.dayCell} />;
                const disabled = isPastAllowedWindow(day);
                const selected = sameDay(day, selectedDate);
                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    disabled={disabled}
                    onPress={() => setSelectedDate(day)}
                    style={[
                      styles.dayCell,
                      styles.dayBtn,
                      selected ? { backgroundColor: C.primary } : { borderColor: C.border },
                      disabled ? { opacity: 0.35 } : null,
                    ]}
                  >
                    <Text style={{ color: selected ? '#fff' : C.text, fontSize: 12 }}>{day.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: C.textMuted, marginTop: 8 }]}>Time (24-hour)</Text>
            <View style={[styles.timePickers, isNarrow ? styles.timePickersNarrow : null]}>
              <View style={styles.timeColumn}>
                <Text style={[styles.label, { color: C.textMuted }]}>Hour</Text>
                <ScrollView style={styles.timeList}>
                  {hourOptions.map((hr) => {
                    const disabled = Boolean(minimumForSelectedDay && hr < minimumForSelectedDay.getHours());
                    const selected = hr === selectedHour;
                    return (
                      <TouchableOpacity
                        key={`hr-${hr}`}
                        disabled={disabled}
                        onPress={() => setSelectedHour(hr)}
                        style={[
                          styles.timeRow,
                          selected ? { backgroundColor: C.primaryLight, borderColor: C.primary } : { borderColor: C.border },
                          disabled ? { opacity: 0.35 } : null,
                        ]}
                      >
                        <Text style={{ color: C.text }}>{String(hr).padStart(2, '0')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.timeColumn}>
                <Text style={[styles.label, { color: C.textMuted }]}>Minute</Text>
                <ScrollView style={styles.timeList}>
                  {minuteOptions.map((mn) => {
                    const sameHourFloor = Boolean(
                      minimumForSelectedDay
                      && selectedHour === minimumForSelectedDay.getHours()
                      && mn < minimumForSelectedDay.getMinutes()
                    );
                    const disabled = sameHourFloor;
                    const selected = mn === selectedMinute;
                    return (
                      <TouchableOpacity
                        key={`mn-${mn}`}
                        disabled={disabled}
                        onPress={() => setSelectedMinute(mn)}
                        style={[
                          styles.timeRow,
                          selected ? { backgroundColor: C.primaryLight, borderColor: C.primary } : { borderColor: C.border },
                          disabled ? { opacity: 0.35 } : null,
                        ]}
                      >
                        <Text style={{ color: C.text }}>{String(mn).padStart(2, '0')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            {rescheduleError ? (
              <Text style={{ color: C.danger, fontSize: 12, marginTop: 8 }}>{rescheduleError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setRescheduleModalOpen(false)}
                style={[styles.modalBtn, { borderColor: C.border }]}
              >
                <Text style={{ color: C.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={reschedule}
                style={[styles.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cancelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              isNarrow ? styles.modalCardNarrow : null,
              { backgroundColor: C.card, borderColor: C.border },
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
            <Text style={[styles.modalTitle, { color: C.text }]}>Are you sure?</Text>
            <Text style={[styles.modalPolicyTitle, { color: C.textMuted }]}>Cancellation Policy</Text>
            <Text style={[styles.modalBody, { color: C.textMuted }]}>
              Cancellation is allowed only when at least 24 hours remain before appointment time.
            </Text>
            <Text style={[styles.label, { color: C.textMuted, marginTop: 8 }]}>
              Cancellation reason (optional)
            </Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Add reason..."
              placeholderTextColor={C.textMuted}
              style={[
                styles.reasonInput,
                { color: C.text, borderColor: C.border, backgroundColor: C.surface },
              ]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setCancelModalOpen(false)}
                style={[styles.modalBtn, { borderColor: C.border }]}
              >
                <Text style={{ color: C.text }}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={cancelAppointment}
                style={[styles.modalBtn, { backgroundColor: C.danger }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Yes</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  modalCardNarrow: {
    maxHeight: '88%',
  },
  modalScroll: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalPolicyTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalBody: {
    fontSize: 12,
    marginBottom: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthNavBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekCell: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    padding: 2,
  },
  dayBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickers: {
    flexDirection: 'row',
    gap: 8,
  },
  timePickersNarrow: {
    flexDirection: 'column',
  },
  timeColumn: {
    flex: 1,
  },
  timeList: {
    maxHeight: 160,
  },
  timeRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalBtn: {
    minWidth: 72,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
});
