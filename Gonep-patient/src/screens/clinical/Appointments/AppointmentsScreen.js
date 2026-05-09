import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { SectionLoader } from '../../../atoms/SectionLoader';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getDoctorSlots, getMeetingRoom, rescheduleAppointment, updateAppointment } from '../../../api';
import { BookingDateGrid } from '../../../molecules/BookingDateGrid';
import { PaginationControls } from '../../../molecules/PaginationControls';

// ── display-status helper ──────────────────────────────────────────────────────
// Canonical 5 statuses: pending | rejected | cancelled | confirmed | in_progress | completed
function getDisplayStatus(appt) {
  const { status, scheduled_for } = appt;
  if (status === 'cancelled' || status === 'rejected')
    return { label: 'Rejected / Cancelled', color: 'danger', isMissed: false };
  if (status === 'completed')    return { label: 'Completed',        color: 'success', isMissed: false };
  if (status === 'in_progress')  return { label: 'In Progress',      color: 'warning', isMissed: false };
  if (status === 'pending')
    return { label: 'Pending Approval', color: 'warning', isMissed: false };
  if (status === 'confirmed' && scheduled_for) {
    const dt = new Date(scheduled_for);
    if (!Number.isNaN(dt.getTime()) && dt < new Date())
      return { label: 'Missed', color: 'danger', isMissed: true };
  }
  return { label: 'Confirmed', color: 'success', isMissed: false };
}

// ── CancelModal ────────────────────────────────────────────────────────────────
function CancelModal({ visible, onClose, onConfirm, loading }) {
  const { C } = useTheme();
  const [reason, setReason] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cm.backdrop}>
        <View style={[cm.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[cm.title, { color: C.text }]}>Cancel appointment?</Text>
          <Text style={[cm.body, { color: C.textMuted }]}>
            Cancellation is only allowed at least 24 h before the appointment.
          </Text>
          <Text style={[cm.lbl, { color: C.text }]}>Reason (optional)</Text>
          <TextInput value={reason} onChangeText={setReason}
            placeholder="Add a reason…" placeholderTextColor={C.textMuted}
            style={[cm.input, { color: C.text, borderColor: C.border, backgroundColor: C.inputBg }]} />
          <View style={cm.row}>
            <TouchableOpacity onPress={onClose} style={[cm.btn, { borderColor: C.border }]}>
              <Text style={{ color: C.text }}>Keep it</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(reason)} disabled={loading}
              style={[cm.btn, { backgroundColor: C.danger, borderColor: C.danger }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {loading ? 'Cancelling…' : 'Yes, cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const cm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card:     { width: '100%', maxWidth: 400, borderWidth: 1, borderRadius: 14, padding: 20 },
  title:    { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  body:     { fontSize: 13, marginBottom: 14, lineHeight: 20 },
  lbl:      { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input:    { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, marginBottom: 16 },
  row:      { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn:      { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center', minWidth: 80 },
});

// ── RescheduleModal (centered, compact, loads real doctor slots — no fallback) ─
const APPT_TYPES = [
  { key: 'In Facility', label: 'In Facility' },
  { key: 'Home Visit',  label: 'Home Visit'  },
  { key: 'Virtual',     label: 'Virtual'     },
];

function RescheduleModal({ visible, apt, onClose, onSuccess }) {
  const { C } = useTheme();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedType, setSelectedType] = useState('In Facility');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [slots,        setSlots]        = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loadError,    setLoadError]    = useState('');

  useEffect(() => {
    if (!visible || !apt) return;
    setSelectedType(apt.type || 'In Facility');
    setSelectedDate(null);
    setSelectedTime('');
    setError('');
  }, [visible, apt?.id]);

  // Re-fetch availability whenever the type or modal visibility changes.
  useEffect(() => {
    if (!visible || !apt) return;
    setSlots([]);
    setSelectedDate(null);
    setSelectedTime('');
    setLoadError('');
    const code = apt.provider_code;
    if (!code) {
      setLoadError('No doctor assigned. Cannot show availability.');
      return;
    }
    setSlotsLoading(true);
    getDoctorSlots(code, selectedType || '')
      .then((res) => {
        const raw = Array.isArray(res?.slots) ? res.slots : [];
        setSlots(raw);
        if (raw.length === 0) {
          setLoadError(`No ${selectedType || 'this type of'} availability for this doctor. Try a different type.`);
        }
      })
      .catch((e) => {
        setSlots([]);
        setLoadError(e?.message || 'Failed to load availability.');
      })
      .finally(() => setSlotsLoading(false));
  }, [visible, apt?.id, selectedType]);

  const availableDates = useMemo(
    () => [...new Set(slots.map((s) => s.date).filter(Boolean))].sort(),
    [slots]
  );

  const timeOptions = useMemo(() => {
    if (!selectedDate) return [];
    return slots
      .filter((s) => s.date === selectedDate)
      .map((s) => s.display_time || s.time || s.datetime?.split('T')[1]?.slice(0,5))
      .filter(Boolean);
  }, [selectedDate, slots]);

  const handleSave = useCallback(async () => {
    if (!selectedDate || !selectedTime) { setError('Pick a date and time.'); return; }
    setError(''); setSaving(true);
    try {
      let iso;
      if (/AM|PM/i.test(selectedTime)) {
        const [tp, period] = selectedTime.split(' ');
        let [hh, mm] = tp.split(':').map(Number);
        if (/PM/i.test(period) && hh < 12) hh += 12;
        if (/AM/i.test(period) && hh === 12) hh = 0;
        iso = `${selectedDate}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
      } else { iso = `${selectedDate}T${selectedTime}:00`; }
      await rescheduleAppointment(apt.booking_ref || apt.reference || apt.id, iso, selectedType);
      onSuccess?.('Reschedule request sent. Awaiting clinic confirmation.');
      onClose();
    } catch (e) { setError(e?.message || 'Failed to reschedule.'); }
    finally { setSaving(false); }
  }, [selectedDate, selectedTime, apt, onSuccess, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rm.backdrop}>
        <ScrollView contentContainerStyle={rm.scrollWrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[rm.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[rm.title, { color: C.text }]}>Reschedule</Text>
          {apt ? (
            <Text style={[rm.sub, { color: C.textMuted }]}>
              {apt.doctor || 'Doctor TBD'} · {apt.date}{apt.time ? ` at ${apt.time}` : ''}
            </Text>
          ) : null}

          {/* Type selector */}
          <Text style={[rm.sLabel, { color: C.textMuted }]}>Consultation type</Text>
          <View style={rm.typeRow}>
            {APPT_TYPES.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setSelectedType(t.key)}
                style={[rm.typePill, {
                  borderColor: selectedType===t.key ? C.primary : C.border,
                  backgroundColor: selectedType===t.key ? C.primary : C.surface,
                }]}>
                <Text style={{ color: selectedType===t.key ? '#fff' : C.text, fontSize: 11, fontWeight: '600' }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {slotsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={C.primary} />
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>Loading availability…</Text>
            </View>
          ) : loadError ? (
            <View style={{ paddingVertical: 16 }}>
              <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>{loadError}</Text>
            </View>
          ) : (
            <>
              <Text style={[rm.sLabel, { color: C.textMuted }]}>New date</Text>
              <BookingDateGrid
                availableDates={availableDates}
                value={selectedDate}
                onChange={(d) => { setSelectedDate(d); setSelectedTime(''); }}
                minDateIso={new Date(Date.now() + 3600000).toISOString().split('T')[0]}
              />
              {selectedDate && (
                <>
                  <Text style={[rm.sLabel, { color: C.textMuted }]}>Time</Text>
                  {timeOptions.length === 0 ? (
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>No slots available on this day.</Text>
                  ) : (
                    <View style={rm.timeGrid}>
                      {timeOptions.map((t) => (
                        <TouchableOpacity key={t} onPress={() => setSelectedTime(t)}
                          style={[rm.chip, { borderColor: selectedTime===t ? C.primary : C.border, backgroundColor: selectedTime===t ? C.primary+'18' : C.surface }]}>
                          <Text style={{ color: selectedTime===t ? C.primary : C.text, fontSize: 12, fontWeight: '600' }}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {error ? <Text style={{ color: C.danger, fontSize: 12, marginTop: 6 }}>{error}</Text> : null}

          <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>
            ℹ Your reschedule request will be sent to the clinic for confirmation.
          </Text>

          <View style={rm.btnRow}>
            <Btn label="Back" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Btn label={saving ? 'Sending…' : 'Send Request'}
              disabled={saving || !selectedDate || !selectedTime}
              onPress={handleSave} style={{ flex: 1, marginLeft: 8 }} />
          </View>
        </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  scrollWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  card:       { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 16, padding: 18 },
  title:      { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  sub:        { fontSize: 12, marginBottom: 8 },
  typeRow:    { flexDirection: 'row', gap: 6, marginBottom: 6 },
  typePill:   { flex: 1, borderWidth: 1.5, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 8, alignItems: 'center' },
  sLabel:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 8 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip:     { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnRow:   { flexDirection: 'row', marginTop: 12 },
});

// ── FILTERS ────────────────────────────────────────────────────────────────────
// "rejected" and "cancelled" merged — same UX as provider
const FILTERS = [
  { key: 'upcoming',    label: 'Upcoming' },
  { key: 'pending',     label: 'Pending Approval' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'past',        label: 'Past' },
  { key: 'rejected',    label: 'Rejected / Cancelled' },
];

const EMPTY_LABELS = {
  upcoming:    'No upcoming appointments.',
  pending:     'No pending approvals.',
  in_progress: 'No appointments in progress.',
  past:        'No past appointments.',
  rejected:    'No rejected or cancelled appointments.',
};

function matchesFilter(item, key) {
  const now = new Date();
  const dt  = item.scheduled_for ? new Date(item.scheduled_for) : null;
  const ds  = getDisplayStatus(item);
  switch (key) {
    case 'upcoming':    return item.status === 'confirmed' && dt && dt >= now;
    case 'pending':     return item.status === 'pending';
    case 'in_progress': return item.status === 'in_progress';
    case 'past':        return item.status === 'completed' || ds.isMissed;
    case 'rejected':    return item.status === 'rejected' || item.status === 'cancelled';
    default:            return false;
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AppointmentsScreen({ appointments = [], loading = false, onOpenDetails, onBookAppointment, onRefresh }) {
  const { C } = useTheme();
  const [activeFilter,     setActiveFilter]    = useState('upcoming');
  const [search,           setSearch]          = useState('');
  const [cancelTarget,     setCancelTarget]    = useState(null);
  const [cancelLoading,    setCancelLoading]   = useState(false);
  const [cancelError,      setCancelError]     = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [successToast,     setSuccessToast]    = useState('');
  const [refreshing,       setRefreshing]      = useState(false);
  const [pageSize,         setPageSize]        = useState(10);
  const [currentPage,      setCurrentPage]     = useState(1);

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(''), 3000);
    return () => clearTimeout(t);
  }, [successToast]);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await onRefresh?.(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  const counts = useMemo(() => {
    const obj = {};
    FILTERS.forEach((f) => { obj[f.key] = (appointments||[]).filter((a) => matchesFilter(a, f.key)).length; });
    return obj;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (appointments||[]).filter((item) => {
      if (!matchesFilter(item, activeFilter)) return false;
      if (!q) return true;
      const hay = [item.doctor, item.specialty, item.type, item.facility, item.date, item.time, item.booking_ref, item.reference].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [appointments, activeFilter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, search, pageSize]);

  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, currentPage, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [filteredAppointments.length, pageSize, currentPage]);

  const handleCancel = async (reason) => {
    if (!cancelTarget) return;
    setCancelLoading(true); setCancelError('');
    try {
      await updateAppointment(cancelTarget.id || cancelTarget.booking_ref, { status: 'cancelled', cancellation_reason: reason });
      setCancelTarget(null);
      onRefresh?.();
    } catch (e) { setCancelError(e?.message || 'Unable to cancel. Try again.'); }
    finally { setCancelLoading(false); }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={st.header}>
        <Text style={[st.pageTitle, { color: C.text }]}>Appointments</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* Refresh button */}
          <TouchableOpacity onPress={handleManualRefresh} disabled={refreshing}
            style={[st.iconBtn, { borderColor: C.border, backgroundColor: C.card }]}>
            {refreshing
              ? <ActivityIndicator size="small" color={C.primary} />
              : <Icon name="refresh-cw" lib="feather" size={14} color={C.textMuted} />}
          </TouchableOpacity>
          <Btn label="Book" icon="plus" size="sm" onPress={onBookAppointment} />
        </View>
      </View>

      {/* ── Success toast ───────────────────────────────────────────────── */}
      {!!successToast && (
        <View style={[st.toast, { backgroundColor: C.successLight, borderColor: C.success }]}>
          <Icon name="check-circle" lib="feather" size={13} color={C.success} style={{ marginRight: 6 }} />
          <Text style={{ color: C.success, fontSize: 12 }}>{successToast}</Text>
        </View>
      )}

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <View style={[st.searchWrap, { backgroundColor: C.card, borderColor: C.border }]}>
        <Icon name="search" lib="feather" size={15} color={C.textMuted} />
        <TextInput value={search} onChangeText={setSearch}
          placeholder="Search doctor, date, type…"
          placeholderTextColor={C.textMuted}
          style={[st.searchInput, { color: C.text }]}
          clearButtonMode="while-editing" />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Icon name="x" lib="feather" size={14} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter tabs ────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          const cnt    = counts[f.key];
          return (
            <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)}
              style={[st.filterTab, { backgroundColor: active ? C.primary : C.card, borderColor: active ? C.primary : C.border, marginRight: 6 }]}>
              <Text style={{ color: active ? '#fff' : C.text, fontSize: 12, fontWeight: '600' }}>{f.label}</Text>
              {cnt > 0 && (
                <View style={[st.countBadge, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : C.primaryLight }]}>
                  <Text style={{ color: active ? '#fff' : C.primary, fontSize: 10, fontWeight: '700' }}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? <SectionLoader label="Loading appointments…" /> : null}

      {!loading && filteredAppointments.length === 0 && (
        <Card>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 4 }}>
            {search ? `No results for "${search}"` : EMPTY_LABELS[activeFilter]}
          </Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            {activeFilter === 'upcoming' ? 'Book an appointment using the button above.' : 'Switch filter to view other groups.'}
          </Text>
        </Card>
      )}

      {cancelError ? <Text style={{ color: C.danger, fontSize: 12, marginBottom: 10 }}>{cancelError}</Text> : null}

      {filteredAppointments.length > 0 && (
        <PaginationControls
          totalItems={filteredAppointments.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel="appointments"
        />
      )}

      {paginatedAppointments.map((a) => {
        const ds           = getDisplayStatus(a);
        const isRejCan     = a.status === 'rejected' || a.status === 'cancelled';
        const isPending    = a.status === 'pending';
        const isConfirmed  = a.status === 'confirmed';
        const isInProgress = a.status === 'in_progress';
        const isCompleted  = a.status === 'completed';
        const isVirtual    = String(a.type||'').toLowerCase() === 'virtual';
        const canReschedule = !isCompleted && !isInProgress && (isRejCan || isPending || isConfirmed);
        const showCancel    = a.can_cancel === true && !ds.isMissed && !isRejCan && !isInProgress;

        const handleJoin = async () => {
          try {
            const res = await getMeetingRoom(a.booking_ref || a.reference || a.id);
            const url = res?.room_url;
            if (url && typeof window !== 'undefined' && window.open) {
              window.open(url, '_blank', 'noopener,noreferrer');
            } else {
              setSuccessToast('Meeting link not yet available.');
            }
          } catch (e) {
            setSuccessToast(e?.message || 'Could not open meeting.');
          }
        };

        return (
          <Card key={a.id || a.booking_ref} hover style={st.card}>
            <View style={st.row}>
              <View style={st.left}>
                <View style={[st.avatar, { backgroundColor: isRejCan ? C.dangerLight : C.primaryLight }]}>
                  <Icon name="stethoscope" lib="mc" size={20} color={isRejCan ? C.danger : C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.docName, { color: C.text }]}>{a.doctor || 'Doctor TBD'}</Text>
                  <Text style={[st.sub, { color: C.textMuted }]}>{[a.specialty, a.type].filter(Boolean).join(' · ')}</Text>
                  <Text style={[st.time, { color: C.primary }]}>{a.date}{a.time ? ` at ${a.time}` : ''}</Text>
                  {a.facility ? <Text style={[st.facility, { color: C.textMuted }]}>{a.facility}</Text> : null}
                </View>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={ds.label} color={ds.color} />
                {isPending && <Text style={{ color: C.warning, fontSize: 10, fontWeight: '600' }}>Awaiting clinic</Text>}
                {isRejCan  && <Text style={{ color: C.danger,  fontSize: 10, fontWeight: '600' }}>
                  {a.status === 'rejected' ? 'You may reschedule' : 'Cancelled'}
                </Text>}
                {isConfirmed && (a.source==='provider'||a.source==='doctor') && (
                  <Text style={{ color: C.success, fontSize: 10, fontWeight: '600' }}>Confirmed by clinic</Text>
                )}
                {isInProgress && <Text style={{ color: C.warning, fontSize: 10, fontWeight: '600' }}>Live now</Text>}
                {isCompleted && <Text style={{ color: C.success, fontSize: 10, fontWeight: '600' }}>Visit done</Text>}
              </View>
            </View>

            <View style={st.actions}>
              <Btn label="Details" variant="ghost" size="sm"
                onPress={() => onOpenDetails?.(a.id || a.booking_ref)} />

              {/* Live virtual visit → join meeting */}
              {isInProgress && isVirtual && (
                <Btn label="Join Meeting" size="sm"
                  icon={<Icon name="video" lib="feather" size={14} color="#fff" />}
                  onPress={handleJoin} />
              )}

              {/* Live in-facility / home visit → read-only badge (no edit allowed) */}
              {isInProgress && !isVirtual && (
                <Text style={{ color: C.textMuted, fontSize: 11, fontStyle: 'italic', marginLeft: 6 }}>
                  Doctor is with you · view only
                </Text>
              )}

              {canReschedule && (
                <Btn label="Reschedule"
                  variant={isRejCan ? 'secondary' : 'ghost'}
                  size="sm"
                  style={{ borderColor: isRejCan ? C.primary : C.border }}
                  onPress={() => { setCancelError(''); setRescheduleTarget(a); }} />
              )}
              {showCancel && (
                <Btn label="Cancel" variant="ghost" size="sm"
                  style={{ borderColor: C.danger }}
                  onPress={() => { setCancelError(''); setCancelTarget(a); }} />
              )}
            </View>
          </Card>
        );
      })}

      {filteredAppointments.length > 0 && (
        <PaginationControls
          totalItems={filteredAppointments.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel="appointments"
        />
      )}

      <CancelModal visible={!!cancelTarget} onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel} loading={cancelLoading} />

      <RescheduleModal visible={!!rescheduleTarget} apt={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={(msg) => {
          setSuccessToast(msg || 'Reschedule request sent ✓');
          setRescheduleTarget(null);
          onRefresh?.();
        }} />
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pageTitle:   { fontSize: 18, fontWeight: '700' },
  iconBtn:     { borderWidth: 1.5, borderRadius: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  toast:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterTab:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  countBadge:  { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  card:        { marginBottom: 10 },
  row:         { flexDirection: 'row', justifyContent: 'space-between' },
  left:        { flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 8, gap: 10 },
  avatar:      { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docName:     { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  sub:         { fontSize: 12, marginBottom: 2 },
  time:        { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  facility:    { fontSize: 11 },
  actions:     { flexDirection: 'row', marginTop: 10, justifyContent: 'flex-end', gap: 8 },
});
