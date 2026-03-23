import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, TextInput, ActivityIndicator,
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
import { appendLog } from '../../../api';

const FILTERS = [
  { id: 'all',        label: 'All'         },
  { id: 'today',      label: 'Today'       },
  { id: 'upcoming',   label: 'Upcoming'    },
  { id: 'confirmed',  label: 'Confirmed'   },
  { id: 'unassigned', label: 'Unassigned'  },
];

const statusColor = s => s === 'confirmed' ? 'success' : s === 'unassigned' ? 'danger' : 'warning';

function applyFilter(list, filter) {
  switch (filter) {
    case 'today':      return list.filter(a => a.date === 'Today');
    case 'upcoming':   return list.filter(a => a.date !== 'Today' && a.status !== 'unassigned');
    case 'confirmed':  return list.filter(a => a.status === 'confirmed');
    case 'unassigned': return list.filter(a => a.status === 'unassigned');
    default:           return list;
  }
}

// ─── Assign Doctor Modal ──────────────────────────────────────────────────────
function AssignModal({ visible, apt, onClose, onAssigned, user }) {
  const { C } = useTheme();
  const doctors = MOCK_STAFF.filter(s => s.role === 'doctor');
  const [saving, setSaving] = useState(false);

  const handleAssign = async (doc) => {
    setSaving(true);
    // Optimistic — real API call would go here
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

// ─── AppointmentsScreen ───────────────────────────────────────────────────────
export function AppointmentsScreen({ user, filter: propFilter }) {
  const { C } = useTheme();
  const { appointments, loading, reload } = useAppointments();
  const [filter,      setFilter]      = useState(propFilter || 'all');
  const [assignModal, setAssignModal] = useState({ visible: false, apt: null });
  // Local state for assignments (so UI updates without a full reload)
  const [assignments, setAssignments] = useState({});

  const ownOnly     = isOwnDataOnly(user?.role);
  const isRec       = user?.role === 'receptionist';
  const isAdmin     = user?.role === 'hospital_admin';
  const showUnassigned = isRec || isAdmin;

  // Sync filter from sidebar sub-item
  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);

  const visible = appointments.map(a => ({
    ...a,
    doctor_id: assignments[a.id] || a.doctor_id,
    status:    assignments[a.id] ? 'confirmed' : a.status,
  })).filter(a => {
    if (ownOnly) return a.doctor_id === user?.id;
    return true;
  });

  const filtered = applyFilter(visible, filter);
  const unassignedCount = visible.filter(a => a.status === 'unassigned').length;

  const handleAssigned = useCallback((aptId, docId) => {
    setAssignments(prev => ({ ...prev, [aptId]: docId }));
  }, []);

  const visibleFilters = FILTERS.filter(f =>
    f.id !== 'unassigned' || showUnassigned
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

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {visibleFilters.map(f => (
          <Btn key={f.id}
            label={f.id === 'unassigned' ? `Unassigned (${unassignedCount})` : f.label}
            variant={filter === f.id ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setFilter(f.id)}
            style={{ marginRight: 8 }}
          />
        ))}
      </ScrollView>

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
              <Badge label={a.status === 'unassigned' ? 'Unassigned' : a.status} color={statusColor(a.status)} />
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
  // Modal
  backdrop:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 36 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sheetSub:   { fontSize: 12, marginBottom: 14 },
  docRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});
