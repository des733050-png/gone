import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { Avatar } from '../../../atoms/Avatar';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useAppointments } from '../../../hooks/useAppointments';
import { isOwnDataOnly } from '../../../config/roles';
import { MOCK_STAFF } from '../../../mock/data';
import { appendLog, getStaff } from '../../../api';
import { CreateAppointmentModal } from './molecules/CreateAppointmentModal';
import { appointmentMatchesFilters, toggleSetMember } from '../../../utils/appointmentScreenFilters';

const STATUS_CHIPS = [
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'completed', label: 'Completed' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'pending', label: 'Pending' },
];

const DATE_CHIPS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
];

const TYPE_CHIPS = [
  { id: 'home_visit', label: 'Home Visit' },
  { id: 'in_facility', label: 'In Facility' },
  { id: 'chat', label: 'Chat' },
];

const statusColor = (s) => {
  if (s === 'confirmed') return 'success';
  if (s === 'completed') return 'success';
  if (s === 'cancelled') return 'danger';
  if (s === 'unassigned') return 'danger';
  return 'warning';
};

const statusLabel = (s) =>
  ({ cancelled: 'Cancelled', completed: 'Completed', confirmed: 'Confirmed', unassigned: 'Unassigned', pending: 'Pending' }[
    String(s || '').toLowerCase()
  ] || String(s || ''));

// ─── Assign Doctor Modal ──────────────────────────────────────────────────────
function AssignModal({ visible, apt, onClose, onAssigned, user }) {
  const { C } = useTheme();
  const doctors = MOCK_STAFF.filter(s => s.role === 'doctor');
  const [saving, setSaving] = useState(false);

  const handleAssign = async (doc) => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Appointments', action: 'Doctor assigned',
      detail: `${apt?.patient} assigned to ${doc.first_name} ${doc.last_name}`,
      type: 'appointments',
    });
    setSaving(false);
    onAssigned(apt?.id, doc.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.handle} />
          <Text style={[s.sheetTitle, { color: C.text }]}>Assign doctor</Text>
          <Text style={[s.sheetSub, { color: C.textMuted }]}>Patient: {apt?.patient}</Text>

          {saving ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
          ) : (
            doctors.map(doc => (
              <TouchableOpacity key={doc.id} onPress={() => handleAssign(doc)}
                style={[s.docRow, { borderColor: C.border, backgroundColor: C.surface }]}>
                <Avatar name={`${doc.first_name} ${doc.last_name}`} size={38} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{doc.first_name} {doc.last_name}</Text>
                  <Text style={{ fontSize: 11, color: C.textMuted }}>{doc.specialty}</Text>
                </View>
                <Badge label="Available" color="success" />
              </TouchableOpacity>
            ))
          )}
          <Btn label="Cancel" variant="ghost" onPress={onClose} full style={{ marginTop: 10 }} />
        </View>
      </View>
    </Modal>
  );
}

function FilterChipRow({ items, selectedSet, dateMode, onToggleStatus, onToggleType, onPickDate }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
      {items.map((item) => {
        const isDate = DATE_CHIPS.some((d) => d.id === item.id);
        const active = isDate ? dateMode === item.id : selectedSet.has(item.id);
        return (
          <Btn
            key={item.id}
            label={item.label}
            variant={active ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => {
              if (isDate) onPickDate(item.id);
              else if (STATUS_CHIPS.some((x) => x.id === item.id)) onToggleStatus(item.id);
              else onToggleType(item.id);
            }}
            style={{ marginRight: 8 }}
          />
        );
      })}
    </ScrollView>
  );
}

// ─── AppointmentsScreen ───────────────────────────────────────────────────────
export function AppointmentsScreen({ user, filter: propFilter }) {
  const { C } = useTheme();
  const { appointments, loading, reload } = useAppointments();
  const [statusFilters, setStatusFilters] = useState(() => new Set());
  const [typeFilters, setTypeFilters] = useState(() => new Set());
  const [dateMode, setDateMode] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [doctorOptions, setDoctorOptions] = useState([]);
  const [assignModal, setAssignModal] = useState({ visible: false, apt: null });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [assignments, setAssignments] = useState({});

  const ownOnly = isOwnDataOnly(user?.role);
  const isRec = user?.role === 'receptionist';
  const isAdmin = user?.role === 'hospital_admin';
  const canBookAppointment = ['hospital_admin', 'facility_admin', 'doctor', 'receptionist'].includes(
    String(user?.role || '')
  );
  const showUnassigned = isRec || isAdmin;
  const showDoctorFilter = ['hospital_admin', 'facility_admin', 'receptionist'].includes(String(user?.role || ''));

  useEffect(() => {
    if (!propFilter || propFilter === 'all') {
      setStatusFilters(new Set());
      setTypeFilters(new Set());
      setDateMode('');
      setDoctorFilter('');
      return;
    }
    setTypeFilters(new Set());
    setDoctorFilter('');
    if (propFilter === 'today') {
      setStatusFilters(new Set());
      setDateMode('today');
    } else if (propFilter === 'upcoming') {
      setStatusFilters(new Set());
      setDateMode('upcoming');
    } else if (propFilter === 'unassigned') {
      setDateMode('');
      setStatusFilters(new Set(['unassigned']));
    } else if (propFilter === 'confirmed') {
      setDateMode('');
      setStatusFilters(new Set(['confirmed']));
    }
  }, [propFilter]);

  useEffect(() => {
    if (!showDoctorFilter) return undefined;
    let cancelled = false;
    getStaff()
      .then((rows) => {
        if (!cancelled) setDoctorOptions((rows || []).filter((r) => r.role === 'doctor'));
      })
      .catch(() => {
        if (!cancelled) setDoctorOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showDoctorFilter]);

  const visible = appointments.map(a => ({
    ...a,
    doctor_id: assignments[a.id] || a.doctor_id,
    status: assignments[a.id] ? 'confirmed' : a.status,
  })).filter(a => {
    if (ownOnly) return a.doctor_id === user?.id;
    return true;
  });

  const filtered = useMemo(
    () =>
      visible.filter((a) =>
        appointmentMatchesFilters(a, {
          statuses: statusFilters,
          types: typeFilters,
          dateMode,
          doctorId: doctorFilter,
        })
      ),
    [visible, statusFilters, typeFilters, dateMode, doctorFilter]
  );

  const unassignedCount = visible.filter(a => a.status === 'unassigned').length;

  const hasActiveFilters =
    statusFilters.size > 0 || typeFilters.size > 0 || Boolean(dateMode) || Boolean(doctorFilter);

  const clearFilters = useCallback(() => {
    setStatusFilters(new Set());
    setTypeFilters(new Set());
    setDateMode('');
    setDoctorFilter('');
  }, []);

  const toggleStatus = useCallback((id) => {
    setStatusFilters((prev) => toggleSetMember(prev, id));
  }, []);

  const toggleType = useCallback((id) => {
    setTypeFilters((prev) => toggleSetMember(prev, id));
  }, []);

  const pickDateMode = useCallback((id) => {
    setDateMode((prev) => (prev === id ? '' : id));
  }, []);

  const handleAssigned = useCallback((aptId, docId) => {
    setAssignments(prev => ({ ...prev, [aptId]: docId }));
  }, []);

  useEffect(() => {
    if (!successToast) return undefined;
    const timer = setTimeout(() => setSuccessToast(''), 2500);
    return () => clearTimeout(timer);
  }, [successToast]);

  const statusChipsWithCount = useMemo(
    () =>
      STATUS_CHIPS.map((c) =>
        c.id === 'unassigned' ? { ...c, label: `Unassigned (${unassignedCount})` } : c
      ),
    [unassignedCount]
  );

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      {ownOnly && (
        <View style={[s.scopeNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
          <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.primary, fontSize: 12 }}>Showing your patients only</Text>
        </View>
      )}

      {!!successToast && (
        <View style={[s.scopeNote, { backgroundColor: C.successLight, borderColor: C.success }]}>
          <Icon name="check-circle" lib="feather" size={13} color={C.success} style={{ marginRight: 6 }} />
          <Text style={{ color: C.success, fontSize: 12 }}>{successToast}</Text>
        </View>
      )}
      {canBookAppointment && (
        <Btn
          label="+ Book Appointment"
          onPress={() => setCreateModalVisible(true)}
          icon={<Icon name="plus" lib="feather" size={14} color="#fff" />}
          style={{ marginBottom: 10, alignSelf: 'flex-start' }}
          size="sm"
        />
      )}

      <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>STATUS</Text>
      <FilterChipRow
        items={statusChipsWithCount.filter((c) => (c.id === 'unassigned' ? showUnassigned : true))}
        selectedSet={statusFilters}
        dateMode=""
        onToggleStatus={toggleStatus}
        onToggleType={toggleType}
        onPickDate={() => {}}
      />

      <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>DATE</Text>
      <FilterChipRow
        items={DATE_CHIPS}
        selectedSet={statusFilters}
        dateMode={dateMode}
        onToggleStatus={toggleStatus}
        onToggleType={toggleType}
        onPickDate={pickDateMode}
      />

      <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>TYPE</Text>
      <FilterChipRow
        items={TYPE_CHIPS}
        selectedSet={typeFilters}
        dateMode=""
        onToggleStatus={toggleStatus}
        onToggleType={toggleType}
        onPickDate={() => {}}
      />

      {showDoctorFilter && doctorOptions.length > 0 && (
        <>
          <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>BY DOCTOR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <Btn
              label="All doctors"
              variant={doctorFilter ? 'ghost' : 'primary'}
              size="sm"
              onPress={() => setDoctorFilter('')}
              style={{ marginRight: 8 }}
            />
            {doctorOptions.map((doc) => {
              const label = `${doc.first_name || ''} ${doc.last_name || ''}`.trim() || doc.email || 'Doctor';
              const id = String(doc.id);
              return (
                <Btn
                  key={id}
                  label={label}
                  variant={doctorFilter === id ? 'primary' : 'ghost'}
                  size="sm"
                  onPress={() => setDoctorFilter((prev) => (prev === id ? '' : id))}
                  style={{ marginRight: 8 }}
                />
              );
            })}
          </ScrollView>
        </>
      )}

      {hasActiveFilters && (
        <TouchableOpacity onPress={clearFilters} style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
          <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>Clear filters</Text>
        </TouchableOpacity>
      )}

      {filtered.length === 0 && (
        <View style={s.empty}>
          <Icon name="calendar" lib="feather" size={36} color={C.textMuted} />
          <Text style={[s.emptyText, { color: C.textMuted }]}>No appointments to show</Text>
        </View>
      )}

      {filtered.map(a => (
        <Card key={a.id} hover style={s.card}>
          <View style={s.cardTop}>
            <View style={[s.avatar, { backgroundColor: a.status === 'unassigned' ? C.dangerLight : C.primaryLight }]}>
              <Icon name="account" lib="mc" size={22} color={a.status === 'unassigned' ? C.danger : C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.patient, { color: C.text }]}>{a.patient}</Text>
              <Text style={[s.sub, { color: C.textMuted }]}>Age {a.age} · {a.type}</Text>
              <Text style={[s.time, { color: C.primary }]}>⏰ {a.date} at {a.time}</Text>
              <Text style={[s.reason, { color: C.textSec }]}>{a.reason}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge label={statusLabel(a.status)} color={statusColor(a.status)} />
              <Text style={[s.phone, { color: C.textMuted }]}>{a.phone}</Text>
            </View>
          </View>
          <View style={s.actions}>
            {a.status === 'unassigned' && showUnassigned ? (
              <>
                <Btn label="Assign doctor" size="sm"
                  icon={<Icon name="user-plus" lib="feather" size={14} color="#fff" />}
                  onPress={() => setAssignModal({ visible: true, apt: a })} />
                <Btn label="Reschedule" variant="secondary" size="sm" style={{ marginLeft: 8 }} />
              </>
            ) : (
              <>
                {!isRec && (
                  <Btn label="Start Consult" size="sm"
                    icon={<Icon name="message-square" lib="feather" size={14} color="#fff" />} />
                )}
                {!isRec && (
                  <Btn label="Write Rx" variant="secondary" size="sm" style={{ marginLeft: 8 }} />
                )}
                <Btn label={isRec ? 'Reschedule' : 'Cancel'} variant="ghost" size="sm" style={{ marginLeft: 8 }} />
              </>
            )}
          </View>
        </Card>
      ))}

      <AssignModal
        visible={assignModal.visible}
        apt={assignModal.apt}
        user={user}
        onClose={() => setAssignModal({ visible: false, apt: null })}
        onAssigned={handleAssigned}
      />
      <CreateAppointmentModal
        visible={createModalVisible}
        user={user}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={async (message) => {
          setSuccessToast(message || 'Appointment booked successfully.');
          await reload();
        }}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  scopeNote:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 },
  card:       { marginBottom: 12, padding: 14 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatar:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  patient:    { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sub:        { fontSize: 12, marginBottom: 2 },
  time:       { fontSize: 12, marginBottom: 2 },
  reason:     { fontSize: 13 },
  phone:      { fontSize: 11 },
  actions:    { flexDirection: 'row', flexWrap: 'wrap' },
  empty:      { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText:  { fontSize: 14 },
  backdrop:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 36 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sheetSub:   { fontSize: 12, marginBottom: 14 },
  docRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});
