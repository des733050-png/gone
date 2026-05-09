import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { T } from '../../../atoms/T';
import { Avatar } from '../../../atoms/Avatar';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { SectionLoader } from '../../../atoms/SectionLoader';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useAppointments } from '../../../hooks/useAppointments';
import { isOwnDataOnly } from '../../../config/roles';
import { MOCK_STAFF } from '../../../mock/data';
import {
  appendLog, assignAppointmentDoctor, completeAppointment, confirmAppointment,
  getAppointmentMeetingRoom, getBookingDoctorSlots, getBookingDoctors, getStaff,
  rejectAppointment, rescheduleAppointment, restoreAppointment, softDeleteAppointment, startAppointment,
} from '../../../api';
import { CreateAppointmentModal } from './molecules/CreateAppointmentModal';
import { BookingDateGrid } from '../../../molecules/BookingDateGrid';
import { PaginationControls } from '../../../molecules/PaginationControls';
import { ActionFeedbackModal } from '../../../molecules/ActionFeedbackModal';

// ─── helpers ──────────────────────────────────────────────────────────────────
// CANONICAL STATUSES (5 only):
//   pending | rejected | cancelled | confirmed | in_progress | completed
// "rejected" and "cancelled" share a tab but are stored separately on the wire.
const STATUS_COLOR = {
  confirmed:    'success',
  completed:    'success',
  in_progress:  'warning',
  pending:      'warning',
  rejected:     'danger',
  cancelled:    'danger',
};
const statusColor  = (s) => STATUS_COLOR[String(s||'').toLowerCase()] || 'warning';
const statusLabel  = (s) => ({
  cancelled:    'Rejected / Cancelled',
  rejected:     'Rejected / Cancelled',
  completed:    'Completed',
  confirmed:    'Confirmed',
  in_progress:  'In Progress',
  pending:      'Pending Approval',
}[String(s||'').toLowerCase()] || 'Pending Approval');

const sourceInfo = (src) => {
  if (src === 'provider') return { label: 'Provider Created', color: 'success' };
  if (src === 'doctor')   return { label: 'Doctor Created',   color: 'success' };
  if (src === 'patient')  return { label: 'Patient Request',  color: 'warning' };
  return null;
};

// ─── STATUS TABS ──────────────────────────────────────────────────────────────
// Canonical 5 states + 'all'. Rejected and Cancelled share a tab on the UI.
const STATUS_TABS = [
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending Approval' },
  { key: 'confirmed',   label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'rejected',    label: 'Rejected / Cancelled' },
];
const LIST_MODE_TABS = [
  { key: 'active', label: 'Appointments' },
  { key: 'bin', label: 'Recycle Bin' },
];

function matchesTab(a, key) {
  const s = String(a.status || '').toLowerCase();
  switch (key) {
    case 'all':         return true;
    case 'pending':     return s === 'pending';
    case 'confirmed':   return s === 'confirmed';
    case 'in_progress': return s === 'in_progress';
    case 'completed':   return s === 'completed';
    case 'rejected':    return s === 'rejected' || s === 'cancelled';
    default:            return true;
  }
}

function matchesDate(a, dateMode) {
  if (!dateMode) return true;
  const now = new Date();
  const dt = a.scheduled_for ? new Date(a.scheduled_for) : null;
  if (!dt) return dateMode === 'upcoming';
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86400000);
  switch (dateMode) {
    case 'today':      return dt >= todayStart && dt < todayEnd;
    case 'upcoming':   return dt >= todayStart;
    case 'this_week':  { const wk = new Date(todayStart); wk.setDate(wk.getDate()+7); return dt >= todayStart && dt < wk; }
    case 'this_month': return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    default:           return true;
  }
}

function matchesType(a, typeKey) {
  if (!typeKey) return true;
  return String(a.type||'').toLowerCase().replace(/\s+/g,'_') === typeKey;
}

function getReadableReason(rawReason) {
  const lines = String(rawReason || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';
  const userFacing = lines.filter(
    (line) => !/^[A-Z_]+\|/.test(line)
  );
  return (userFacing[0] || '').trim();
}

// ─── Assign Doctor Modal ───────────────────────────────────────────────────────
function AssignModal({ visible, apt, onClose, onAssigned, user }) {
  const { C } = useTheme();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch real facility doctors via the booking-doctors endpoint
  useEffect(() => {
    if (!visible) return;
    setError('');
    setLoading(true);
    getBookingDoctors('') // empty specialty → all doctors in facility
      .then((rows) => setDoctors(Array.isArray(rows) ? rows : (rows?.doctors || [])))
      .catch((e) => setError(e?.message || 'Could not load doctors.'))
      .finally(() => setLoading(false));
  }, [visible]);

  const handleAssign = async (doc) => {
    if (!apt) return;
    setSaving(true);
    setError('');
    try {
      const ref = apt.appointment_ref || apt.reference || apt.id;
      const id = doc.doctor_id || doc.provider_code || doc.id;
      const result = await assignAppointmentDoctor(ref, id);
      try {
        appendLog({
          staff: `${user.first_name} ${user.last_name}`,
          staff_id: user.id, role: user.role,
          module: 'Appointments', action: 'Doctor assigned',
          detail: `${apt?.patient} → ${doc.full_name || doc.first_name + ' ' + doc.last_name}`,
          type: 'appointments',
        });
      } catch (_) {}
      onAssigned?.(result);
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to assign doctor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sh.backdrop}>
        <View style={[sh.sheet, { backgroundColor: C.card, borderColor: C.border, maxHeight: '85%' }]}>
          <View style={sh.handle} />
          <Text style={[sh.title, { color: C.text }]}>Assign doctor</Text>
          <Text style={[sh.sub, { color: C.textMuted }]}>
            Patient: {apt?.patient}{apt?.type ? ` · ${apt.type}` : ''}
          </Text>

          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {doctors.length === 0 ? (
                <Text style={{ color: C.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 14 }}>
                  No doctors available in this facility.
                </Text>
              ) : doctors.map((doc) => {
                const docId = doc.doctor_id || doc.provider_code || doc.id;
                const docName = doc.full_name || `${doc.first_name||''} ${doc.last_name||''}`.trim() || 'Dr.';
                return (
                  <TouchableOpacity
                    key={docId}
                    onPress={() => handleAssign(doc)}
                    disabled={saving}
                    style={[sh.docRow, { borderColor: C.border, backgroundColor: C.surface, opacity: saving ? 0.5 : 1 }]}
                  >
                    <Avatar name={docName} size={38} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{docName}</Text>
                      <Text style={{ fontSize: 11, color: C.textMuted }}>
                        {doc.specialty || 'General Care'}
                      </Text>
                    </View>
                    {doc.has_slots ? <Badge label="Available" color="success" /> : <Badge label="No slots" color="warning" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {error ? <Text style={{ color: C.danger, fontSize: 12, marginTop: 8 }}>{error}</Text> : null}
          {saving && <ActivityIndicator color={C.primary} style={{ marginTop: 6 }} />}

          <Btn label="Cancel" variant="ghost" onPress={onClose} full style={{ marginTop: 10 }} disabled={saving} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Reschedule Modal (centered, compact, loads real doctor slots) ─────────────
// NO fallback: a doctor must have availability set in order to reschedule.
// Type selector lets the provider switch between In Facility / Home Visit /
// Virtual and re-fetch the doctor's availability for that type.
const APPT_TYPES = [
  { key: 'In Facility', label: 'In Facility' },
  { key: 'Home Visit',  label: 'Home Visit'  },
  { key: 'Virtual',     label: 'Virtual'     },
];

function RescheduleModal({ visible, apt, onClose, onSuccess, onAssignDoctor }) {
  const { C } = useTheme();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedType, setSelectedType] = useState('In Facility');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [slots,        setSlots]        = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loadError,    setLoadError]    = useState('');

  // Initialise type from the appointment when the modal opens
  useEffect(() => {
    if (!visible || !apt) return;
    setSelectedType(apt.type || 'In Facility');
    setSelectedDate(null);
    setSelectedTime('');
    setError('');
  }, [visible, apt?.id]);

  // Re-fetch availability whenever modal opens OR the type changes
  useEffect(() => {
    if (!visible || !apt) return;
    setSlots([]);
    setSelectedDate(null);
    setSelectedTime('');
    setLoadError('');

    const code = apt.provider_code || apt.doctor_code;
    if (!code) {
      setLoadError(
        'No doctor assigned to this appointment yet. Assign a doctor first to view availability.'
      );
      return;
    }

    setSlotsLoading(true);
    getBookingDoctorSlots(code, selectedType || '')
      .then((res) => {
        const raw = Array.isArray(res?.slots) ? res.slots : [];
        setSlots(raw);
        if (raw.length === 0) {
          setLoadError(
            `No ${selectedType || 'this type of'} availability for this doctor. Try a different type.`
          );
        }
      })
      .catch((e) => {
        setSlots([]);
        setLoadError(e?.message || 'Failed to load doctor availability.');
      })
      .finally(() => setSlotsLoading(false));
  }, [visible, apt?.id, selectedType]);

  // Available dates strictly from doctor's availability — no fallback.
  const availableDates = useMemo(
    () => [...new Set(slots.map((s) => s.date).filter(Boolean))].sort(),
    [slots]
  );

  // Time options strictly from the doctor's availability for the selected day.
  const timeOptions = useMemo(() => {
    if (!selectedDate) return [];
    return slots
      .filter((s) => s.date === selectedDate)
      .map((s) => s.display_time || s.time || (s.datetime && s.datetime.split('T')[1]?.slice(0,5)))
      .filter(Boolean);
  }, [selectedDate, slots]);

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) { setError('Pick a date and time.'); return; }
    setError('');
    setSaving(true);
    try {
      let iso;
      if (/AM|PM/i.test(selectedTime)) {
        const [tp, period] = selectedTime.split(' ');
        let [hh, mm] = tp.split(':').map(Number);
        if (/PM/i.test(period) && hh < 12) hh += 12;
        if (/AM/i.test(period) && hh === 12) hh = 0;
        iso = `${selectedDate}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`;
      } else {
        iso = `${selectedDate}T${selectedTime}:00`;
      }
      const ref = apt?.appointment_ref || apt?.reference || apt?.id;
      await rescheduleAppointment(ref, iso, selectedType);
      onSuccess?.('Appointment rescheduled ✓');
    } catch (e) {
      setError(e?.message || 'Failed to reschedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Centered backdrop — not bottom sheet */}
      <View style={rm.backdrop}>
        <ScrollView
          contentContainerStyle={rm.scrollWrap}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={[rm.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[rm.title, { color: C.text }]}>Reschedule Appointment</Text>
          {apt ? (
            <Text style={[rm.sub, { color: C.textMuted }]}>
              {apt.patient} · {apt.date} at {apt.time}
            </Text>
          ) : null}

          {/* Type selector — switches the doctor's availability source */}
          <Text style={[rm.sLabel, { color: C.textMuted }]}>Consultation type</Text>
          <View style={rm.typeRow}>
            {APPT_TYPES.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => setSelectedType(t.key)}
                style={[rm.typePill, {
                  borderColor: selectedType===t.key ? C.primary : C.border,
                  backgroundColor: selectedType===t.key ? C.primary : C.surface,
                }]}>
                <Text style={{
                  color: selectedType===t.key ? '#fff' : C.text,
                  fontSize: 11, fontWeight: '600',
                }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {slotsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={C.primary} />
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>Loading doctor availability…</Text>
            </View>
          ) : loadError ? (
            <View style={{ paddingVertical: 16 }}>
              <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>{loadError}</Text>
              {!apt?.doctor_id && !apt?.provider_code && onAssignDoctor && (
                <Btn label="Assign Doctor Now" size="sm" variant="primary"
                  style={{ marginTop: 10 }}
                  onPress={() => { onAssignDoctor(apt); onClose(); }} />
              )}
            </View>
          ) : (
            <>
              <Text style={[rm.sLabel, { color: C.textMuted }]}>Available dates</Text>
              <BookingDateGrid
                availableDates={availableDates}
                value={selectedDate}
                onChange={(d) => { setSelectedDate(d); setSelectedTime(''); }}
                minDateIso={new Date(Date.now() + 3600000).toISOString().split('T')[0]}
              />

              {selectedDate && (
                <>
                  <Text style={[rm.sLabel, { color: C.textMuted }]}>Available times</Text>
                  {timeOptions.length === 0 ? (
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>No times available on this day.</Text>
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

          <View style={rm.btnRow}>
            <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Btn
              label={saving ? 'Saving…' : 'Confirm'}
              disabled={saving || !selectedDate || !selectedTime}
              onPress={handleSave}
              style={{ flex: 1, marginLeft: 8 }}
            />
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
  card:       { width: '100%', maxWidth: 480, borderWidth: 1, borderRadius: 16, padding: 18 },
  title:      { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  sub:        { fontSize: 12, marginBottom: 10 },
  sLabel:     { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 8, color: '#888' },
  typeRow:    { flexDirection: 'row', gap: 6, marginBottom: 6 },
  typePill:   { flex: 1, borderWidth: 1.5, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 8, alignItems: 'center' },
  timeGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip:       { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnRow:     { flexDirection: 'row', marginTop: 14 },
});

// ─── Advanced Filter Sheet ─────────────────────────────────────────────────────
const DATE_OPTS = [
  { key: 'today', label: 'Today' }, { key: 'upcoming', label: 'Upcoming' },
  { key: 'this_week', label: 'This Week' }, { key: 'this_month', label: 'This Month' },
];
const TYPE_OPTS = [
  { key: 'in_facility', label: 'In Facility' },
  { key: 'home_visit',  label: 'Home Visit' },
  { key: 'virtual',     label: 'Virtual' },
];

function FilterSheet({ visible, onClose, dateMode, setDateMode, typeMode, setTypeMode, doctorFilter, setDoctorFilter, doctorOptions }) {
  const { C } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.backdrop}>
        <View style={[sh.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={sh.handle} />
          <Text style={[sh.title, { color: C.text }]}>Advanced Filters</Text>
          <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 12 }}>These filters override the status tabs below.</Text>

          <Text style={[sh.sectionLabel, { color: C.textMuted }]}>DATE</Text>
          <View style={sh.chipRow}>
            {DATE_OPTS.map((o) => (
              <TouchableOpacity key={o.key}
                onPress={() => setDateMode((p) => p===o.key ? '' : o.key)}
                style={[sh.chip, { backgroundColor: dateMode===o.key ? C.primary : C.surface, borderColor: dateMode===o.key ? C.primary : C.border }]}>
                <Text style={{ color: dateMode===o.key ? '#fff' : C.text, fontSize: 12, fontWeight: '600' }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[sh.sectionLabel, { color: C.textMuted }]}>TYPE</Text>
          <View style={sh.chipRow}>
            {TYPE_OPTS.map((o) => (
              <TouchableOpacity key={o.key}
                onPress={() => setTypeMode((p) => p===o.key ? '' : o.key)}
                style={[sh.chip, { backgroundColor: typeMode===o.key ? C.primary : C.surface, borderColor: typeMode===o.key ? C.primary : C.border }]}>
                <Text style={{ color: typeMode===o.key ? '#fff' : C.text, fontSize: 12, fontWeight: '600' }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {doctorOptions.length > 0 && (
            <>
              <Text style={[sh.sectionLabel, { color: C.textMuted }]}>DOCTOR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[{ label: 'All', id: '' }, ...doctorOptions.map((d) => ({ label: `${d.first_name||''} ${d.last_name||''}`.trim() || 'Dr.', id: String(d.id) }))].map((doc) => (
                  <TouchableOpacity key={doc.id || 'all'}
                    onPress={() => setDoctorFilter((p) => p===doc.id ? '' : doc.id)}
                    style={[sh.chip, { backgroundColor: doctorFilter===doc.id ? C.primary : C.surface, borderColor: doctorFilter===doc.id ? C.primary : C.border, marginRight: 6 }]}>
                    <Text style={{ color: doctorFilter===doc.id ? '#fff' : C.text, fontSize: 12, fontWeight: '600' }}>{doc.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Btn label="Apply & Close" onPress={onClose} full style={{ marginTop: 12 }} />
          {(dateMode||typeMode||doctorFilter) ? (
            <Btn label="Clear all" variant="ghost" full
              onPress={() => { setDateMode(''); setTypeMode(''); setDoctorFilter(''); onClose(); }}
              style={{ marginTop: 6 }} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const sh = StyleSheet.create({
  backdrop:     { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 36 },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 14 },
  title:        { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  sub:          { fontSize: 12, marginBottom: 12, color: '#999' },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  docRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});

// ─── AppointmentsScreen ────────────────────────────────────────────────────────
export function AppointmentsScreen({ user, filter: propFilter, onOpenPatient }) {
  const { C } = useTheme();
  const { appointments, recycleBinAppointments, loading, reload } = useAppointments();

  const [listMode,        setListMode]        = useState('active');
  const [activeTab,       setActiveTab]       = useState('all');
  const [search,          setSearch]          = useState('');
  const [dateMode,        setDateMode]        = useState('');
  const [typeMode,        setTypeMode]        = useState('');
  const [doctorFilter,    setDoctorFilter]    = useState('');
  const [doctorOptions,   setDoctorOptions]   = useState([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [assignModal,     setAssignModal]     = useState({ visible: false, apt: null });
  const [createModal,     setCreateModal]     = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [successToast,    setSuccessToast]    = useState('');
  const [assignments,     setAssignments]     = useState({});
  const [actionLoading,   setActionLoading]   = useState({});
  const [refreshing,      setRefreshing]      = useState(false);
  const [pageSize,        setPageSize]        = useState(10);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [feedback,        setFeedback]        = useState({
    visible: false,
    type: 'loading',
    title: '',
    message: '',
  });

  const ownOnly    = isOwnDataOnly(user?.role);
  const isRec      = user?.role === 'receptionist';
  const canBook    = ['hospital_admin','facility_admin','doctor','receptionist'].includes(String(user?.role||''));
  const canApprove = ['hospital_admin','facility_admin','doctor','receptionist'].includes(String(user?.role||''));
  const canSoftDelete = ['hospital_admin', 'facility_admin', 'receptionist'].includes(String(user?.role || ''));
  const showDoctor = ['hospital_admin','facility_admin','receptionist'].includes(String(user?.role||''));

  const hasAdvancedFilters = Boolean(dateMode || typeMode || doctorFilter);
  const isRecycleBinMode = listMode === 'bin';

  // Sync prop filter from dashboard quick-links
  useEffect(() => {
    if (!propFilter || propFilter === 'all') { setActiveTab('all'); setDateMode(''); return; }
    if (propFilter === 'today')      { setActiveTab('all'); setDateMode('today'); }
    else if (propFilter === 'upcoming')   { setActiveTab('all'); setDateMode('upcoming'); }
    else if (propFilter === 'unassigned' || propFilter === 'pending') setActiveTab('pending');
    else if (propFilter === 'confirmed')  setActiveTab('confirmed');
  }, [propFilter]);

  useEffect(() => {
    if (!showDoctor) return;
    let done = false;
    getStaff().then((rows) => { if (!done) setDoctorOptions((rows||[]).filter((r)=>r.role==='doctor')); }).catch(()=>{});
    return () => { done = true; };
  }, [showDoctor]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await reload(); } finally { setRefreshing(false); }
  }, [reload]);

  // Enrich with local assignment overrides
  const visible = useMemo(() => {
    const sourceRows = isRecycleBinMode ? recycleBinAppointments : appointments;
    return sourceRows
      .map((a) => ({ ...a, doctor_id: assignments[a.id]||a.doctor_id, status: assignments[a.id] ? 'confirmed' : a.status }))
      .filter((a) => ownOnly ? a.doctor_id === user?.id : true);
  }, [appointments, recycleBinAppointments, assignments, ownOnly, user, isRecycleBinMode]);

  // Per-tab counts
  const tabCounts = useMemo(() => {
    const obj = {};
    STATUS_TABS.forEach((t) => { obj[t.key] = visible.filter((a) => matchesTab(a, t.key)).length; });
    return obj;
  }, [visible]);

  // Filtered list — advanced filters have priority; if active they override the tab
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visible.filter((a) => {
      // Advanced filters (date/type/doctor) are first-priority
      if (!matchesDate(a, dateMode)) return false;
      if (!matchesType(a, typeMode)) return false;
      if (doctorFilter && String(a.doctor_id) !== doctorFilter) return false;
      // Status tab is secondary — skip if advanced filters are active and tab is 'all'
      if (!isRecycleBinMode && (!hasAdvancedFilters || activeTab !== 'all')) {
        if (!matchesTab(a, activeTab)) return false;
      }
      if (!q) return true;
      const hay = [a.patient, a.type, a.date, a.time, a.reason, a.phone, a.email, a.reference].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [visible, activeTab, search, dateMode, typeMode, doctorFilter, hasAdvancedFilters, isRecycleBinMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [listMode, activeTab, search, dateMode, typeMode, doctorFilter, pageSize]);

  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [filtered.length, pageSize, currentPage]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(''), 2500);
    return () => clearTimeout(t);
  }, [successToast]);

  const handleConfirm = useCallback(async (apt) => {
    setActionLoading((p) => ({ ...p, [apt.id]: 'confirm' }));
    try {
      await confirmAppointment(apt.appointment_ref || apt.reference || apt.id);
      setSuccessToast('Appointment confirmed ✓');
      await reload();
    } catch (e) { setSuccessToast(e?.message || 'Failed to confirm.'); }
    finally { setActionLoading((p) => ({ ...p, [apt.id]: null })); }
  }, [reload]);

  const handleReject = useCallback(async (apt) => {
    setActionLoading((p) => ({ ...p, [apt.id]: 'reject' }));
    try {
      await rejectAppointment(apt.appointment_ref || apt.reference || apt.id);
      setSuccessToast('Appointment rejected.');
      await reload();
    } catch (e) { setSuccessToast(e?.message || 'Failed to reject.'); }
    finally { setActionLoading((p) => ({ ...p, [apt.id]: null })); }
  }, [reload]);

  // ── Start Consult ──────────────────────────────────────────────────────────
  // Server marks IN_PROGRESS; if Virtual it returns a meeting URL we open in
  // a new tab. For In-Facility / Home Visit, we open the patient's EMR.
  const handleStart = useCallback(async (apt) => {
    if (!apt.doctor_id) {
      setSuccessToast('Assign a doctor before starting the consult.');
      setAssignModal({ visible: true, apt });
      return;
    }
    setActionLoading((p) => ({ ...p, [apt.id]: 'start' }));
    try {
      const res = await startAppointment(apt.appointment_ref || apt.reference || apt.id);
      const isVirtual = String(apt.type || '').toLowerCase() === 'virtual';
      if (isVirtual) {
        const url = res?.room_url;
        if (url && typeof window !== 'undefined' && window.open) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        setSuccessToast(url ? 'Meeting opened in new tab.' : 'Consult started — link not ready.');
      } else {
        // In-facility / Home Visit → open patient EMR
        if (apt.patient_id && typeof onOpenPatient === 'function') {
          onOpenPatient(apt.patient_id);
        }
        setSuccessToast('Consultation started — patient EMR open for editing.');
      }
      await reload();
    } catch (e) {
      setSuccessToast(e?.message || 'Failed to start consult.');
    } finally {
      setActionLoading((p) => ({ ...p, [apt.id]: null }));
    }
  }, [reload, onOpenPatient]);

  const handleComplete = useCallback(async (apt) => {
    setActionLoading((p) => ({ ...p, [apt.id]: 'complete' }));
    try {
      await completeAppointment(apt.appointment_ref || apt.reference || apt.id);
      setSuccessToast('Consultation completed ✓');
      await reload();
    } catch (e) {
      setSuccessToast(e?.message || 'Failed to complete.');
    } finally {
      setActionLoading((p) => ({ ...p, [apt.id]: null }));
    }
  }, [reload]);

  const handleJoinMeeting = useCallback(async (apt) => {
    try {
      const res = await getAppointmentMeetingRoom(apt.appointment_ref || apt.reference || apt.id);
      const url = res?.room_url;
      if (url && typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setSuccessToast('Meeting link not yet available.');
      }
    } catch (e) {
      setSuccessToast(e?.message || 'Could not open meeting.');
    }
  }, []);

  const handleSoftDelete = useCallback(async (apt) => {
    setFeedback({
      visible: true,
      type: 'loading',
      title: 'Moving to recycle bin...',
      message: 'Please wait while we update this appointment.',
    });
    try {
      await softDeleteAppointment(apt.appointment_ref || apt.reference || apt.id);
      appendLog({
        staff: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Provider',
        staff_id: user?.id,
        role: user?.role,
        module: 'Appointments',
        action: 'appointment_soft_deleted',
        detail: JSON.stringify({ reference: apt.reference || apt.appointment_ref || apt.id, patient: apt.patient }),
        type: 'appointments',
      });
      setSuccessToast('Appointment moved to recycle bin.');
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Moved to recycle bin',
        message: 'The appointment is now available in Recycle Bin.',
      });
      await reload();
    } catch (e) {
      const msg = e?.message || 'Failed to move appointment to recycle bin.';
      setSuccessToast(msg);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Delete failed',
        message: msg,
      });
    }
  }, [reload, user]);

  const handleRestore = useCallback(async (apt) => {
    setFeedback({
      visible: true,
      type: 'loading',
      title: 'Restoring appointment...',
      message: 'Please wait while we restore this appointment.',
    });
    try {
      await restoreAppointment(apt.appointment_ref || apt.reference || apt.id);
      appendLog({
        staff: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Provider',
        staff_id: user?.id,
        role: user?.role,
        module: 'Appointments',
        action: 'appointment_restored',
        detail: JSON.stringify({ reference: apt.reference || apt.appointment_ref || apt.id, patient: apt.patient }),
        type: 'appointments',
      });
      setSuccessToast('Appointment restored from recycle bin.');
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Appointment restored',
        message: 'The appointment has been moved back to active appointments.',
      });
      await reload();
    } catch (e) {
      const msg = e?.message || 'Failed to restore appointment.';
      setSuccessToast(msg);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Restore failed',
        message: msg,
      });
    }
  }, [reload, user]);

  if (loading && appointments.length === 0) {
    return (
      <ScreenContainer>
        <SectionLoader label="Loading appointments…" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>

      {/* ── Own-data note ──────────────────────────────────────────────── */}
      {ownOnly && (
        <View style={s.infoBar}>
          <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.primary, fontSize: 12 }}>Showing your patients only</Text>
        </View>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {!!successToast && (
        <View style={[s.infoBar, { backgroundColor: C.successLight, borderColor: C.success }]}>
          <Icon name="check-circle" lib="feather" size={13} color={C.success} style={{ marginRight: 6 }} />
          <Text style={{ color: C.success, fontSize: 12 }}>{successToast}</Text>
        </View>
      )}

      {/* ── Top row: Book + Refresh + Filters ──────────────────────────── */}
      <View style={s.headerRow}>
        {canBook && (
          <Btn label="+ Book" onPress={() => setCreateModal(true)} size="sm"
            style={{ flex: 1, marginRight: 8 }} />
        )}
        {/* Refresh button */}
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}
          style={[s.iconBtn, { borderColor: C.border, backgroundColor: C.card }]}>
          {refreshing
            ? <ActivityIndicator size="small" color={C.primary} />
            : <Icon name="refresh-cw" lib="feather" size={15} color={C.textMuted} />}
        </TouchableOpacity>
        {/* Advanced Filters button */}
        <TouchableOpacity onPress={() => setShowFilterSheet(true)}
          style={[s.filterBtn, { borderColor: hasAdvancedFilters ? C.primary : C.border, backgroundColor: hasAdvancedFilters ? C.primaryLight : C.card, marginLeft: 6 }]}>
          <Icon name="sliders" lib="feather" size={14} color={hasAdvancedFilters ? C.primary : C.textMuted} />
          <Text style={{ color: hasAdvancedFilters ? C.primary : C.textMuted, fontSize: 12, fontWeight: '600', marginLeft: 5 }}>
            Filters{hasAdvancedFilters ? ' ●' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {LIST_MODE_TABS.map((tab) => {
          const active = listMode === tab.key;
          return (
            <TouchableOpacity key={tab.key} onPress={() => setListMode(tab.key)}
              style={[s.statusTab, { backgroundColor: active ? C.primary : C.card, borderColor: active ? C.primary : C.border, marginRight: 6 }]}>
              <Text style={{ color: active ? '#fff' : C.text, fontSize: 12, fontWeight: '700' }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <View style={[s.searchWrap, { backgroundColor: C.card, borderColor: C.border }]}>
        <Icon name="search" lib="feather" size={15} color={C.textMuted} />
        <TextInput value={search} onChangeText={setSearch}
          placeholder="Search patient, date, type, phone…"
          placeholderTextColor={C.textMuted}
          style={[s.searchInput, { color: C.text }]}
          clearButtonMode="while-editing" />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Icon name="x" lib="feather" size={14} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Status tabs (secondary to advanced filters) ────────────────── */}
      {!isRecycleBinMode && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {STATUS_TABS.map((tab) => {
          const active = activeTab === tab.key;
          const cnt = tab.key !== 'all' ? tabCounts[tab.key] : null;
          return (
            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)}
              style={[s.statusTab, { backgroundColor: active ? C.primary : C.card, borderColor: active ? C.primary : C.border, marginRight: 6 }]}>
              <Text style={{ color: active ? '#fff' : C.text, fontSize: 12, fontWeight: '600' }}>
                {tab.label}
              </Text>
              {cnt > 0 && (
                <View style={[s.tabCount, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : C.primaryLight }]}>
                  <Text style={{ color: active ? '#fff' : C.primary, fontSize: 10, fontWeight: '700' }}>{cnt}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      )}

      {/* Advanced filter active hint */}
      {!isRecycleBinMode && hasAdvancedFilters && (
        <View style={[s.filterHint, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
          <Text style={{ color: C.primary, fontSize: 11, fontWeight: '600' }}>
            ⚡ Advanced filters active — overriding status tab
          </Text>
          <TouchableOpacity onPress={() => { setDateMode(''); setTypeMode(''); setDoctorFilter(''); }}>
            <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700', marginLeft: 8 }}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Result count ───────────────────────────────────────────────── */}
      <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 8 }}>
        {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
        {loading ? '  (refreshing…)' : ''}
      </Text>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {filtered.length === 0 && !loading && (
        <View style={s.empty}>
          <Icon name="calendar" lib="feather" size={36} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 14 }}>
            {search ? `No results for "${search}"` : (isRecycleBinMode ? 'Recycle bin is empty' : 'No appointments to show')}
          </Text>
        </View>
      )}

      {filtered.length > 0 && (
        <PaginationControls
          totalItems={filtered.length}
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

      {/* ── Appointment cards ───────────────────────────────────────────── */}
      {paginatedAppointments.map((a) => {
        const s_lower   = String(a.status||'').toLowerCase();
        const isNotApproved = s_lower === 'pending';
        const isRejected    = s_lower === 'rejected' || s_lower === 'cancelled';
        const isCompleted   = s_lower === 'completed';
        const isInProgress  = s_lower === 'in_progress';
        const isConfirmed   = s_lower === 'confirmed';
        const isVirtual     = String(a.type||'').toLowerCase() === 'virtual';
        const hasDoctor     = !!a.doctor_id || !!a.provider_code;

        // "Current" = within 30 min before scheduled_for to 60 min after.
        // Only currently-due confirmed appointments may show "Start Consult".
        const now = new Date();
        const sched = a.scheduled_for ? new Date(a.scheduled_for) : null;
        const isCurrent = !!sched && (sched.getTime() - now.getTime() <= 30*60*1000)
          && (now.getTime() - sched.getTime() <= 60*60*1000);

        const src           = sourceInfo(a.source);
        const actioning     = actionLoading[a.id];

        return (
          <Card key={a.id} hover style={s.card}>
            <View style={s.cardTop}>
              <View style={[s.avatar, {
                backgroundColor: isRejected ? C.dangerLight
                  : isNotApproved ? C.warningLight || '#FFF3CD'
                  : isInProgress ? C.warningLight || '#FFF3CD'
                  : isCompleted ? C.successLight : C.primaryLight,
              }]}>
                <Icon name={isInProgress ? 'play-circle' : 'account'} lib={isInProgress ? 'feather' : 'mc'} size={22}
                  color={isRejected ? C.danger : (isNotApproved||isInProgress) ? C.warning || '#e6a817' : isCompleted ? C.success : C.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <T style={[s.patient, { color: C.text }]}>{a.patient}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 1 }}>
                  {a.phone ? <T style={[s.meta, { color: C.textMuted }]}>📞 {a.phone}</T> : null}
                  {a.email ? <T style={[s.meta, { color: C.textMuted }]}>✉ {a.email}</T> : null}
                </View>
                <T style={[s.sub, { color: C.textMuted }]}>
                  {[a.age ? `Age ${a.age}` : null, a.type].filter(Boolean).join(' · ')}
                </T>
                <T style={[s.time, { color: C.primary }]}>⏰ {a.date} at {a.time}</T>
                {a.doctor_name
                  ? <T style={{ color: C.textMuted, fontSize: 12 }}>👤 Dr. {a.doctor_name}</T>
                  : <T style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>⚠ No doctor assigned</T>}
                {getReadableReason(a.reason) ? (
                  <T style={[s.reason, { color: C.textSec }]} numberOfLines={2}>
                    {getReadableReason(a.reason)}
                  </T>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={statusLabel(a.status)} color={statusColor(a.status)} />
                {src && <Badge label={src.label} color={src.color} />}
              </View>
            </View>

            {/* ── Card actions ────────────────────────────────────────── */}
            <View style={s.actions}>
              {/* Assign-doctor button is universal — shown whenever a doctor */}
              {/* is missing, regardless of status. */}
              {!hasDoctor && canApprove && (
                <Btn label="Assign Doctor" size="sm" variant="secondary"
                  onPress={() => setAssignModal({ visible: true, apt: a })} />
              )}

              {isRecycleBinMode ? (
                canSoftDelete ? (
                <Btn label="Restore" size="sm" variant="secondary"
                  onPress={() => handleRestore(a)} />
                ) : (
                  <Text style={{ color: C.textMuted, fontSize: 11, fontStyle: 'italic' }}>
                    Restore allowed for admin/reception
                  </Text>
                )
              ) : isNotApproved && canApprove ? (
                <>
                  <Btn label="Approve" size="sm"
                    loading={actioning==='confirm'} disabled={!!actioning || !hasDoctor}
                    style={!hasDoctor ? null : { marginLeft: !hasDoctor ? 0 : 8 }}
                    onPress={() => handleConfirm(a)} />
                  <Btn label="Reject" variant="danger" size="sm"
                    loading={actioning==='reject'} disabled={!!actioning}
                    style={{ marginLeft: 8 }} onPress={() => handleReject(a)} />
                  <Btn label="Reschedule" variant="ghost" size="sm"
                    disabled={!!actioning} style={{ marginLeft: 8 }}
                    onPress={() => setRescheduleTarget(a)} />
                </>
              ) : isRejected ? (
                <Btn label="Reschedule" variant="secondary" size="sm"
                  style={{ marginLeft: !hasDoctor ? 8 : 0 }}
                  onPress={() => setRescheduleTarget(a)} />
              ) : isCompleted ? (
                <Text style={{ color: C.textMuted, fontSize: 12, fontStyle: 'italic' }}>
                  Consultation completed
                </Text>
              ) : isInProgress ? (
                <>
                  {isVirtual && (
                    <Btn label="Re-join" size="sm"
                      icon={<Icon name="video" lib="feather" size={14} color="#fff" />}
                      onPress={() => handleJoinMeeting(a)} />
                  )}
                  {!isVirtual && !isRec && (
                    <Btn label="Open EMR" size="sm" variant="secondary"
                      icon={<Icon name="file-text" lib="feather" size={14} />}
                      onPress={() => onOpenPatient?.(a.patient_id)} />
                  )}
                  <Btn label="Complete" size="sm" variant="primary"
                    loading={actioning==='complete'} disabled={!!actioning}
                    style={{ marginLeft: 8 }}
                    onPress={() => handleComplete(a)} />
                </>
              ) : isConfirmed ? (
                <>
                  {/* Start Consult only available when "current" (≤30 min before, ≤60 min after) */}
                  {!isRec && (
                    <Btn
                      label="Start Consult"
                      size="sm"
                      loading={actioning==='start'}
                      disabled={!!actioning || !hasDoctor || !isCurrent}
                      onPress={() => handleStart(a)}
                      icon={<Icon name="play-circle" lib="feather" size={14} color="#fff" />}
                    />
                  )}
                  <Btn label="Reschedule" variant="ghost" size="sm"
                    style={{ marginLeft: 8 }} onPress={() => setRescheduleTarget(a)} />
                  {!isCurrent && !isRec && (
                    <Text style={{ color: C.textMuted, fontSize: 10, marginLeft: 8, alignSelf: 'center' }}>
                      Available 30 min before start
                    </Text>
                  )}
                </>
              ) : null}
              {!isRecycleBinMode && canSoftDelete && !isInProgress && !isCompleted && (
                <Btn label="Delete" variant="danger" size="sm"
                  style={{ marginLeft: 8 }}
                  onPress={() => handleSoftDelete(a)} />
              )}
            </View>
          </Card>
        );
      })}

      {filtered.length > 0 && (
        <PaginationControls
          totalItems={filtered.length}
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

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <AssignModal visible={assignModal.visible} apt={assignModal.apt} user={user}
        onClose={() => setAssignModal({ visible: false, apt: null })}
        onAssigned={async () => { setSuccessToast('Doctor assigned ✓'); await reload(); }} />

      <FilterSheet visible={showFilterSheet} onClose={() => setShowFilterSheet(false)}
        dateMode={dateMode} setDateMode={setDateMode}
        typeMode={typeMode} setTypeMode={setTypeMode}
        doctorFilter={doctorFilter} setDoctorFilter={setDoctorFilter}
        doctorOptions={doctorOptions} />

      <RescheduleModal visible={!!rescheduleTarget} apt={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onAssignDoctor={(a) => setAssignModal({ visible: true, apt: a })}
        onSuccess={async (msg) => {
          setSuccessToast(msg);
          setRescheduleTarget(null);
          await reload();
        }} />

      <CreateAppointmentModal visible={createModal} user={user}
        onClose={() => setCreateModal(false)}
        onSuccess={async (msg) => {
          setSuccessToast(msg || 'Appointment booked.');
          await reload();
        }} />

      <ActionFeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  infoBar:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#e8f4fd', borderColor: '#90caf9' },
  headerRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBtn:    { borderWidth: 1.5, borderRadius: 10, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  filterBtn:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  searchInput:{ flex: 1, fontSize: 14, padding: 0 },
  statusTab:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  tabCount:   { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  card:       { marginBottom: 12, padding: 14 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  patient:    { fontSize: 15, fontWeight: '700', marginBottom: 1 },
  meta:       { fontSize: 12 },
  sub:        { fontSize: 13, marginTop: 2 },
  time:       { fontSize: 13, marginTop: 2 },
  reason:     { fontSize: 13, marginTop: 2 },
  actions:    { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  empty:      { alignItems: 'center', paddingVertical: 48, gap: 12 },
});
