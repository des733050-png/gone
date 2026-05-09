// FILE: src/screens/clinical/Appointments/AppointmentDetailsScreen.js
// COMPLETE REPLACEMENT
//
// Changes from original:
// 1. Start Consult button — appears 5 minutes before scheduled_for
// 2. Virtual appointments: button opens Daily.co room URL (fetched from backend)
// 3. Physical (In Facility / Home Visit): button shows "Consultation started" state
// 4. Button hidden entirely until 5-min window opens
// 5. Cancelled appointments: no action buttons at all
// 6. Missed appointments: detected client-side, shown with appropriate state
// 7. Calendar light-mode fix: available dates have visible border + background
// 8. Notification refresh called after cancel / reschedule actions

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { SectionLoader } from '../../../atoms/SectionLoader';
import { getAppointmentById, getMeetingRoom, updateAppointment } from '../../../api';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getAppointmentStatusMeta } from '../../../utils/appointmentAlerts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns ms until 5 minutes before scheduledFor.
 * Negative means the window is already open.
 */
function msUntilConsultWindow(scheduledFor) {
  if (!scheduledFor) return Infinity;
  const dt = new Date(scheduledFor);
  if (Number.isNaN(dt.getTime())) return Infinity;
  const windowOpen = dt.getTime() - 5 * 60 * 1000;
  return windowOpen - Date.now();
}

/**
 * Returns true if the appointment is considered "missed" —
 * confirmed status but scheduled time has passed.
 */
function isMissed(appointment) {
  if (!appointment) return false;
  if (appointment.status !== 'confirmed') return false;
  if (!appointment.scheduled_for) return false;
  const dt = new Date(appointment.scheduled_for);
  return !Number.isNaN(dt.getTime()) && dt < new Date();
}

/**
 * Returns the appointment type detail — "Virtual", "Home Visit", or "In Facility".
 * Reads from service_type_detail first, then falls back to type field.
 */
function getAppointmentTypeDetail(appointment) {
  return appointment?.service_type_detail || appointment?.type || 'In Facility';
}

// ─── Start Consult Button ────────────────────────────────────────────────────

function StartConsultButton({ appointment }) {
  const { C } = useTheme();
  const [windowOpen, setWindowOpen]     = useState(false);
  const [loadingRoom, setLoadingRoom]   = useState(false);
  const [roomError, setRoomError]       = useState('');
  const [physicalStarted, setPhysicalStarted] = useState(false);
  const timerRef = useRef(null);

  const typeDetail   = getAppointmentTypeDetail(appointment);
  const isVirtual    = typeDetail === 'Virtual';
  const isConfirmed  = appointment?.status === 'confirmed';
  const missed       = isMissed(appointment);

  // Don't render at all if not applicable
  if (!isConfirmed || missed) return null;
  if (appointment?.status === 'cancelled' || appointment?.status === 'completed') return null;

  // Check whether the 5-min window is open and set up a timer if not
  useEffect(() => {
    const ms = msUntilConsultWindow(appointment?.scheduled_for);
    if (ms <= 0) {
      setWindowOpen(true);
      return;
    }
    // Schedule the window to open
    timerRef.current = setTimeout(() => {
      setWindowOpen(true);
    }, Math.min(ms, 2_147_483_647)); // clamp to max setTimeout value

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [appointment?.scheduled_for]);

  if (!windowOpen) {
    // Show a muted "not yet available" indicator
    const dt = appointment?.scheduled_for ? new Date(appointment.scheduled_for) : null;
    const timeLabel = dt
      ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <View style={[scStyles.notYet, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Icon name="clock" lib="feather" size={14} color={C.textMuted} />
        <Text style={[scStyles.notYetText, { color: C.textMuted }]}>
          {isVirtual
            ? `Meeting room opens at ${timeLabel} (5 min before)`
            : `Consultation starts at ${timeLabel}`}
        </Text>
      </View>
    );
  }

  // ── Virtual: open Daily.co room ──────────────────────────────────────────
  if (isVirtual) {
    const handleJoin = async () => {
      setLoadingRoom(true);
      setRoomError('');
      try {
        const data = await getMeetingRoom(
          appointment.reference || appointment.booking_ref || appointment.id
        );
        const url = data?.room_url;
        if (!url) throw new Error('Meeting room URL not available.');
        // Open in browser / in-app browser
        if (Platform.OS === 'web') {
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
          } else {
            throw new Error('Cannot open meeting link on this device.');
          }
        }
      } catch (e) {
        setRoomError(e?.message || 'Unable to open meeting room.');
      } finally {
        setLoadingRoom(false);
      }
    };

    return (
      <View style={scStyles.wrap}>
        <Btn
          label={loadingRoom ? 'Opening room...' : 'Start Consult'}
          icon={loadingRoom ? undefined : 'video'}
          loading={loadingRoom}
          disabled={loadingRoom}
          onPress={handleJoin}
          variant="primary"
          size="md"
          style={scStyles.btn}
        />
        {roomError ? (
          <Text style={[scStyles.error, { color: C.danger }]}>{roomError}</Text>
        ) : null}
        <Text style={[scStyles.hint, { color: C.textMuted }]}>
          Virtual consultation — secure video room
        </Text>
      </View>
    );
  }

  // ── Physical: show "started" indicator ──────────────────────────────────
  return (
    <View style={scStyles.wrap}>
      {physicalStarted ? (
        <View style={[scStyles.startedBadge, { backgroundColor: C.successLight, borderColor: C.success }]}>
          <Icon name="check-circle" lib="feather" size={16} color={C.success} />
          <Text style={[scStyles.startedText, { color: C.success }]}>
            Consultation in progress
          </Text>
        </View>
      ) : (
        <Btn
          label="Start Consult"
          icon="play-circle"
          onPress={() => setPhysicalStarted(true)}
          variant="primary"
          size="md"
          style={scStyles.btn}
        />
      )}
      <Text style={[scStyles.hint, { color: C.textMuted }]}>
        {typeDetail} · Doctor will record consultation notes
      </Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  wrap:         { marginTop: 14 },
  btn:          { alignSelf: 'flex-start' },
  notYet:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 14 },
  notYetText:   { fontSize: 12 },
  error:        { fontSize: 12, marginTop: 6 },
  hint:         { fontSize: 11, marginTop: 6 },
  startedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' },
  startedText:  { fontSize: 13, fontWeight: '700' },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export function AppointmentDetailsScreen({ appointmentId, onBack, onAppointmentChanged }) {
  const { C } = useTheme();
  const { width } = useResponsive();
  const insets = useSafeAreaInsets();
  const isNarrow = width < 760;

  const [appointment, setAppointment]           = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [actionError, setActionError]           = useState('');
  const [cancelModalOpen, setCancelModalOpen]   = useState(false);
  const [cancelReason, setCancelReason]         = useState('');
  const [cancelLoading, setCancelLoading]       = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth]       = useState(new Date());
  const [selectedDate, setSelectedDate]         = useState(new Date());
  const [selectedHour, setSelectedHour]         = useState(9);
  const [selectedMinute, setSelectedMinute]     = useState(0);
  const [rescheduleError, setRescheduleError]   = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!appointmentId) { setLoading(false); return; }
      try {
        const data = await getAppointmentById(appointmentId);
        if (mounted) setAppointment(data);
      } catch {
        // appointment stays null — handled in render
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [appointmentId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <SectionLoader label="Loading appointment…" />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.center}>
        <Text style={{ color: C.textMuted, fontSize: 14 }}>Appointment not found.</Text>
        {onBack && (
          <Btn label="Back to Appointments" variant="ghost" size="sm" style={{ marginTop: 12 }} onPress={onBack} />
        )}
      </View>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const missed       = isMissed(appointment);
  const typeDetail   = getAppointmentTypeDetail(appointment);
  const statusMeta   = missed
    ? { label: 'Missed', color: 'danger' }
    : getAppointmentStatusMeta(appointment.status);

  const isActive   = !missed && appointment.status !== 'cancelled' && appointment.status !== 'completed';
  const canAttemptCancel = isActive;
  const canCancelAllowed = typeof appointment.can_cancel === 'boolean'
    ? appointment.can_cancel
    : canAttemptCancel;

  // ── Calendar helpers ─────────────────────────────────────────────────────
  const minimumRescheduleDate = () => new Date(Date.now() + 48 * 60 * 60 * 1000);

  const buildSelectedSchedule = () => {
    const dt = new Date(selectedDate);
    dt.setHours(selectedHour, selectedMinute, 0, 0);
    return dt;
  };

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  const isPastAllowedWindow = (dayStr) => {
    const day = new Date(dayStr);
    const min = minimumRescheduleDate();
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay < min;
  };

  const monthStart   = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthEnd     = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
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

  const hourOptions   = Array.from({ length: 24 }).map((_, n) => n);
  const minuteOptions = Array.from({ length: 60 }).map((_, n) => n);

  const openRescheduleModal = () => {
    const minAllowed = minimumRescheduleDate();
    const source = appointment?.scheduled_for ? new Date(appointment.scheduled_for) : minAllowed;
    const base   = source < minAllowed ? minAllowed : source;
    setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setSelectedDate(new Date(base.getFullYear(), base.getMonth(), base.getDate()));
    setSelectedHour(base.getHours());
    setSelectedMinute(base.getMinutes());
    setRescheduleError('');
    setRescheduleModalOpen(true);
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const reschedule = async () => {
    const parsed = buildSelectedSchedule();
    if (parsed < minimumRescheduleDate()) {
      setRescheduleError('Reschedule must be at least 48 hours from now.');
      return;
    }
    setRescheduleLoading(true);
    setRescheduleError('');
    try {
      const updated = await updateAppointment(
        appointment.reference || appointment.id,
        { status: 'pending', scheduled_for: parsed.toISOString() }
      );
      if (updated) {
        setAppointment(updated);
        onAppointmentChanged?.(updated);
        setRescheduleModalOpen(false);
      }
    } catch (error) {
      const msg = error?.message || 'Unable to reschedule right now.';
      setActionError(msg);
      setRescheduleError(msg);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const cancelAppointment = async () => {
    setCancelLoading(true);
    try {
      setActionError('');
      const updated = await updateAppointment(
        appointment.reference || appointment.id,
        { status: 'cancelled', cancellation_reason: cancelReason }
      );
      if (updated) {
        setAppointment(updated);
        onAppointmentChanged?.(updated);
        setCancelReason('');
        setCancelModalOpen(false);
      }
    } catch (error) {
      setActionError(error?.message || 'Unable to cancel appointment.');
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Parse cancel meta from notes ─────────────────────────────────────────
  let cancelledBy = '';
  let cancellationReason = '';
  if (appointment.cancelled_by) {
    cancelledBy = appointment.cancelled_by;
    cancellationReason = appointment.cancellation_reason || '';
  } else if (appointment.notes) {
    const match = appointment.notes.match(/CANCEL_META\|by=(.*?)\|reason=(.*)/);
    if (match) {
      cancelledBy        = (match[1] || '').trim();
      cancellationReason = (match[2] || '').trim();
    }
  }

  // ── Action buttons helper ─────────────────────────────────────────────────
  const ActionButtons = ({ size = 'sm' }) => (
    <>
      {onBack ? (
        <Btn label="Back" variant="ghost" size={size} onPress={onBack} />
      ) : null}
      {appointment.can_reschedule && isActive ? (
        <Btn
          label="Reschedule"
          variant="secondary"
          size={size}
          style={{ marginLeft: 8 }}
          onPress={openRescheduleModal}
        />
      ) : null}
      {canAttemptCancel ? (
        <Btn
          label="Cancel"
          variant="ghost"
          size={size}
          style={{ marginLeft: 8, borderColor: C.danger }}
          disabled={!canCancelAllowed}
          onPress={() => setCancelModalOpen(true)}
        />
      ) : null}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenContainer
        scroll
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'web' ? 24 : 24 + 64 + insets.bottom,
        }}
      >
        <Card style={styles.card}>
          {/* ── Header row ───────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.docAvatar, { backgroundColor: C.primaryLight }]}>
                <Icon name="stethoscope" lib="mc" size={22} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.docName, { color: C.text }]}>{appointment.doctor}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                  {appointment.specialty} · {typeDetail}
                </Text>
              </View>
            </View>
            <Badge label={statusMeta.label} color={statusMeta.color} />
          </View>

          {/* ── Detail rows ──────────────────────────────────────────────── */}
          {[
            { label: 'Date & Time',        value: `${appointment.date} at ${appointment.time}` },
            { label: 'Facility',           value: appointment.facility },
            { label: 'Visit Type',         value: typeDetail },
            { label: 'Reason',             value: appointment.reason },
            { label: 'Address / Location', value: appointment.address },
            { label: 'Consultation Fee',   value: appointment.fee },
          ].map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textMuted }]}>{row.label}</Text>
              <Text style={[styles.detailValue, { color: C.text }]}>{row.value}</Text>
            </View>
          ))}

          {/* Cancelled metadata */}
          {appointment.status === 'cancelled' && cancelledBy ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textMuted }]}>Cancelled By</Text>
              <Text style={[styles.detailValue, { color: C.text }]}>{cancelledBy}</Text>
            </View>
          ) : null}
          {appointment.status === 'cancelled' && cancellationReason ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: C.textMuted }]}>Cancellation Reason</Text>
              <Text style={[styles.detailValue, { color: C.text }]}>{cancellationReason}</Text>
            </View>
          ) : null}

          {/* Missed notice */}
          {missed ? (
            <View style={[styles.missedNotice, { backgroundColor: `${C.danger}12`, borderColor: `${C.danger}30` }]}>
              <Icon name="alert-circle" lib="feather" size={14} color={C.danger} />
              <Text style={{ color: C.danger, fontSize: 12, marginLeft: 6 }}>
                This appointment was not attended. Contact support if you need to reschedule.
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {actionError ? (
            <Text style={{ color: C.danger, fontSize: 12, marginTop: 10 }}>{actionError}</Text>
          ) : null}

          {/* ── Start Consult button ─────────────────────────────────────── */}
          <StartConsultButton appointment={appointment} />

          {/* Web action buttons */}
          {Platform.OS === 'web' ? (
            <View style={styles.webActions}>
              <ActionButtons size="sm" />
            </View>
          ) : null}

          {/* Cannot cancel notice */}
          {canAttemptCancel && !canCancelAllowed ? (
            <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>
              Cancellation is locked — less than 24 hours remain before the appointment.
            </Text>
          ) : null}
        </Card>
      </ScreenContainer>

      {/* Mobile bottom bar */}
      {Platform.OS !== 'web' && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: C.navBg, borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          <ActionButtons size="lg" />
        </View>
      )}

      {/* ── Reschedule modal ──────────────────────────────────────────────── */}
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
                Pick a new date and time at least 48 hours from now.
              </Text>

              {/* Month navigation */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  style={[styles.monthNavBtn, { borderColor: C.border }]}
                >
                  <Icon name="chevron-left" lib="feather" size={16} color={C.text} />
                </TouchableOpacity>
                <Text style={{ color: C.text, fontWeight: '700' }}>
                  {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  style={[styles.monthNavBtn, { borderColor: C.border }]}
                >
                  <Icon name="chevron-right" lib="feather" size={16} color={C.text} />
                </TouchableOpacity>
              </View>

              {/* Day labels */}
              <View style={styles.weekRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={`${d}${i}`} style={[styles.weekCell, { color: C.textMuted }]}>{d}</Text>
                ))}
              </View>

              {/* Calendar grid — LIGHT MODE FIX: available dates get visible bg + border */}
              <View style={styles.calendarGrid}>
                {calendarCells.map((day, idx) => {
                  if (!day) return <View key={`e-${idx}`} style={styles.dayCell} />;
                  const disabled  = isPastAllowedWindow(day);
                  const isSelected = sameDay(day, selectedDate);
                  const isToday    = sameDay(day, new Date());
                  return (
                    <TouchableOpacity
                      key={day.toISOString()}
                      disabled={disabled}
                      onPress={() => setSelectedDate(day)}
                      style={[
                        styles.dayCell,
                        styles.dayBtn,
                        isSelected
                          ? { backgroundColor: C.primary, borderColor: C.primary, borderWidth: 2 }
                          : isToday
                          ? { backgroundColor: C.primaryLight, borderColor: C.primaryMid, borderWidth: 1.5 }
                          : !disabled
                          ? { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }
                          : { backgroundColor: C.bg, borderColor: 'transparent', borderWidth: 1 },
                        disabled ? { opacity: 0.3 } : null,
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#fff' : isToday ? C.primary : disabled ? C.textMuted : C.text,
                          fontSize: 12,
                          fontWeight: isSelected || isToday ? '700' : '400',
                        }}
                      >
                        {day.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time pickers */}
              <Text style={[styles.detailLabel, { color: C.textMuted, marginTop: 12 }]}>
                Time (24-hour)
              </Text>
              <View style={[styles.timePickers, isNarrow ? styles.timePickersNarrow : null]}>
                <View style={styles.timeColumn}>
                  <Text style={[styles.detailLabel, { color: C.textMuted }]}>Hour</Text>
                  <ScrollView style={styles.timeList}>
                    {hourOptions.map((hr) => {
                      const disabled = Boolean(minimumForSelectedDay && hr < minimumForSelectedDay.getHours());
                      const isSelected = hr === selectedHour;
                      return (
                        <TouchableOpacity
                          key={`hr-${hr}`}
                          disabled={disabled}
                          onPress={() => setSelectedHour(hr)}
                          style={[
                            styles.timeRow,
                            isSelected
                              ? { backgroundColor: C.primaryLight, borderColor: C.primary }
                              : { borderColor: C.border },
                            disabled ? { opacity: 0.3 } : null,
                          ]}
                        >
                          <Text style={{ color: isSelected ? C.primary : C.text, fontWeight: isSelected ? '700' : '400' }}>
                            {String(hr).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={styles.timeColumn}>
                  <Text style={[styles.detailLabel, { color: C.textMuted }]}>Minute</Text>
                  <ScrollView style={styles.timeList}>
                    {minuteOptions.map((mn) => {
                      const sameHourFloor = Boolean(
                        minimumForSelectedDay &&
                        selectedHour === minimumForSelectedDay.getHours() &&
                        mn < minimumForSelectedDay.getMinutes()
                      );
                      const isSelected = mn === selectedMinute;
                      return (
                        <TouchableOpacity
                          key={`mn-${mn}`}
                          disabled={sameHourFloor}
                          onPress={() => setSelectedMinute(mn)}
                          style={[
                            styles.timeRow,
                            isSelected
                              ? { backgroundColor: C.primaryLight, borderColor: C.primary }
                              : { borderColor: C.border },
                            sameHourFloor ? { opacity: 0.3 } : null,
                          ]}
                        >
                          <Text style={{ color: isSelected ? C.primary : C.text, fontWeight: isSelected ? '700' : '400' }}>
                            {String(mn).padStart(2, '0')}
                          </Text>
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
                  disabled={rescheduleLoading}
                  style={[styles.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {rescheduleLoading ? 'Saving…' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Cancel modal ──────────────────────────────────────────────────── */}
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
              <Text style={[styles.modalTitle, { color: C.text }]}>Cancel this appointment?</Text>
              <Text style={[styles.modalPolicyTitle, { color: C.textMuted }]}>Cancellation policy</Text>
              <Text style={[styles.modalBody, { color: C.textMuted }]}>
                Cancellations are only permitted at least 24 hours before the appointment time.
              </Text>
              <Text style={[styles.detailLabel, { color: C.textMuted, marginTop: 8 }]}>
                Reason (optional)
              </Text>
              <TextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Add a reason…"
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
                  <Text style={{ color: C.text }}>Keep it</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelAppointment}
                  disabled={cancelLoading}
                  style={[styles.modalBtn, { backgroundColor: C.danger, borderColor: C.danger }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {cancelLoading ? 'Cancelling…' : 'Yes, cancel'}
                  </Text>
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
  card:             { marginBottom: 10 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  docAvatar:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  docName:          { fontWeight: '700', fontSize: 16, marginBottom: 2 },
  detailRow:        { marginTop: 10 },
  detailLabel:      { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  detailValue:      { fontSize: 13, fontWeight: '600' },
  missedNotice:     { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12 },
  webActions:       { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18, flexWrap: 'wrap', gap: 8 },
  bottomBar:        { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  // Reschedule calendar
  modalBackdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard:        { width: '100%', maxWidth: 460, borderWidth: 1, borderRadius: 12, padding: 14 },
  modalCardNarrow:  { maxHeight: '88%' },
  modalScroll:      { maxHeight: '100%' },
  modalScrollContent:{ paddingBottom: 4 },
  modalTitle:       { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  modalPolicyTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  modalBody:        { fontSize: 12, marginBottom: 10 },
  calendarHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthNavBtn:      { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  weekRow:          { flexDirection: 'row', marginBottom: 6 },
  weekCell:         { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calendarGrid:     { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell:          { width: `${100 / 7}%`, padding: 2 },
  dayBtn:           { borderRadius: 8, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  timePickers:      { flexDirection: 'row', gap: 8, marginTop: 8 },
  timePickersNarrow:{ flexDirection: 'column' },
  timeColumn:       { flex: 1 },
  timeList:         { maxHeight: 160 },
  timeRow:          { borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginBottom: 4 },
  reasonInput:      { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, marginBottom: 12 },
  modalActions:     { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
  modalBtn:         { minWidth: 80, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
});