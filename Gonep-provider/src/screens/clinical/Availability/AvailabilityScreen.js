import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { Avatar } from '../../../atoms/Avatar';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import {
  getAvailability, addAvailabilitySlot, removeAvailabilitySlot,
  toggleBlockDay, appendLog,
} from '../../../api';
import { isOwnDataOnly } from '../../../config/roles';
import { MOCK_STAFF } from '../../../mock/data';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SLOT_TYPES = [
  { value: 'in_facility', label: 'In-facility' },
  { value: 'home_visit',  label: 'Home visit'  },
  { value: 'chat',        label: 'Chat / text' },
];

const REASON_OPTIONS = {
  add:    ['New delivery', 'Stock correction', 'Transfer in', 'Opening stock'],
  reduce: ['Dispensed via Rx', 'Expired / damaged', 'Write-off', 'Stock correction', 'Transfer out'],
};

function slotTypeColor(type, C) {
  if (type === 'in_facility') return { bg: C.primaryLight, text: C.primary };
  if (type === 'home_visit')  return { bg: C.successLight, text: C.success };
  if (type === 'chat')        return { bg: C.purpleLight,  text: C.purple  };
  return { bg: C.primaryLight, text: C.primary };
}

function slotDurationMins(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function dayTotalMins(slots, day) {
  return slots
    .filter(s => s.day === day)
    .reduce((acc, s) => acc + slotDurationMins(s.start, s.end), 0);
}

// ─── AddSlotModal ─────────────────────────────────────────────────────────────
function AddSlotModal({ visible, onClose, onSave, doctorName, existingSlots, setBy }) {
  const { C } = useTheme();
  const [day,   setDay]   = useState('Mon');
  const [start, setStart] = useState('08:00');
  const [end,   setEnd]   = useState('12:00');
  const [type,  setType]  = useState('in_facility');
  const [err,   setErr]   = useState('');

  const validate = () => {
    const dur = slotDurationMins(start, end);
    if (dur < 30)  return 'Minimum slot duration is 30 minutes.';
    if (dur > 240) return 'Maximum slot duration is 4 hours per slot.';
    if (dur <= 0)  return 'End time must be after start time.';
    const total = dayTotalMins(existingSlots, day);
    if (total + dur > 720) return 'Total slots for this day would exceed 12 hours (3 × 4 hr max).';
    return null;
  };

  const handleSave = () => {
    const e = validate();
    if (e) { setErr(e); return; }
    onSave({ day, start, end, type, setBy });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={[s.modalSheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={s.modalHandle} />
          <Text style={[s.modalTitle, { color: C.text }]}>Add availability slot</Text>
          {doctorName ? <Text style={[s.modalSub, { color: C.textMuted }]}>{doctorName}</Text> : null}

          <Text style={[s.fieldLabel, { color: C.textMuted }]}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {DAYS.map(d => (
              <TouchableOpacity key={d} onPress={() => setDay(d)}
                style={[s.dayPill, { backgroundColor: day === d ? C.primary : C.surface, borderColor: day === d ? C.primary : C.border }]}>
                <Text style={{ color: day === d ? '#fff' : C.textSec, fontWeight: '600', fontSize: 12 }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.fieldLabel, { color: C.textMuted }]}>Start time</Text>
              <TextInput value={start} onChangeText={setStart} placeholder="08:00"
                style={[s.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.fieldLabel, { color: C.textMuted }]}>End time</Text>
              <TextInput value={end} onChangeText={setEnd} placeholder="12:00"
                style={[s.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} />
            </View>
          </View>

          <Text style={[s.fieldLabel, { color: C.textMuted }]}>Consultation type</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {SLOT_TYPES.map(t => (
              <TouchableOpacity key={t.value} onPress={() => setType(t.value)}
                style={[s.typePill, { backgroundColor: type === t.value ? C.primary : C.surface, borderColor: type === t.value ? C.primary : C.border, flex: 1 }]}>
                <Text style={{ color: type === t.value ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {err ? <Text style={[s.errText, { color: C.danger }]}>{err}</Text> : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Btn label="Add slot" onPress={handleSave} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── DayRow ───────────────────────────────────────────────────────────────────
function DayRow({ day, slots, blocked, onAddSlot, onRemoveSlot, onToggleBlock, C }) {
  const daySlots = slots.filter(s => s.day === day);
  return (
    <View style={[s.dayRow, { borderBottomColor: C.divider }]}>
      <View style={s.dayHeader}>
        <Text style={[s.dayLabel, { color: blocked ? C.textMuted : C.text }]}>{day}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {blocked ? <Badge label="Blocked" color="danger" /> : daySlots.length === 0 ? <Badge label="No slots" color="warning" /> : null}
          <TouchableOpacity onPress={() => onToggleBlock(day)}
            style={[s.blockBtn, { borderColor: C.border }]}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: blocked ? C.success : C.textMuted }}>{blocked ? 'Unblock' : 'Block'}</Text>
          </TouchableOpacity>
          {!blocked && (
            <TouchableOpacity onPress={() => onAddSlot(day)}
              style={[s.addSlotBtn, { backgroundColor: C.primaryLight }]}>
              <Icon name="plus" lib="feather" size={12} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {daySlots.map(slot => {
        const tc = slotTypeColor(slot.type, C);
        const typeLbl = SLOT_TYPES.find(t => t.value === slot.type)?.label || slot.type;
        return (
          <View key={slot.id} style={[s.slotRow, { backgroundColor: C.surface }]}>
            <View style={[s.slotTimePill, { backgroundColor: tc.bg }]}>
              <Text style={{ color: tc.text, fontSize: 11, fontWeight: '700' }}>{slot.start}–{slot.end}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{ fontSize: 11, color: C.textSec }}>{typeLbl}</Text>
              {slot.setBy === 'receptionist' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Icon name="alert-circle" lib="feather" size={10} color={C.warning} />
                  <Text style={{ fontSize: 10, color: C.warning }}>Set by receptionist</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => onRemoveSlot(slot.id)}>
              <Icon name="x" lib="feather" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function AvailabilityScreen({ user }) {
  const { C } = useTheme();
  const isDoctor = isOwnDataOnly(user?.role);
  const isRec    = user?.role === 'receptionist';
  const isAdmin  = user?.role === 'hospital_admin';

  const [availability, setAvailability] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [selectedDoc,  setSelectedDoc]  = useState(null); // for admin/rec multi-doctor view
  const [addModalVis,  setAddModalVis]  = useState(false);
  const [addDay,       setAddDay]       = useState(null);

  const doctors = MOCK_STAFF.filter(s => s.role === 'doctor');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAvailability();
      setAvailability(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Doctor sees own schedule
  const activeDocId = isDoctor ? user.id : selectedDoc;
  const schedule    = availability[activeDocId] || null;

  const handleAddSlot = async ({ day, start, end, type, setBy }) => {
    const slot = { day, start, end, type, setBy };
    await addAvailabilitySlot({ doctorId: activeDocId, slot });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Availability', action: 'Schedule updated',
      detail: `${day} ${start}–${end} ${type} slot added${isRec ? ' by receptionist' : ''}`,
      type: 'availability',
    });
    await load();
  };

  const handleRemoveSlot = async (slotId) => {
    await removeAvailabilitySlot({ doctorId: activeDocId, slotId });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Availability', action: 'Slot removed',
      detail: `Slot ${slotId} removed from ${schedule?.doctor_name || activeDocId}`,
      type: 'availability',
    });
    await load();
  };

  const handleToggleBlock = async (day) => {
    await toggleBlockDay({ doctorId: activeDocId, day });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Availability', action: 'Day toggled',
      detail: `${day} for ${schedule?.doctor_name || activeDocId}`,
      type: 'availability',
    });
    await load();
  };

  if (loading) {
    return (
      <ScreenContainer>
        <Text style={{ color: C.textMuted, textAlign: 'center', marginTop: 40 }}>Loading schedules…</Text>
      </ScreenContainer>
    );
  }

  // Admin / receptionist — doctor list first
  if (!isDoctor && !activeDocId) {
    return (
      <ScreenContainer scroll>
        <Text style={[s.pageTitle, { color: C.text }]}>
          {isRec ? 'Doctor schedules' : 'Availability management'}
        </Text>
        <Text style={[s.pageSub, { color: C.textMuted }]}>Select a doctor to view or manage their schedule</Text>
        {doctors.map(doc => {
          const sched = availability[doc.id];
          return (
            <Card key={doc.id} hover onPress={() => setSelectedDoc(doc.id)} style={s.docCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={`${doc.first_name} ${doc.last_name}`} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.docName, { color: C.text }]}>{doc.first_name} {doc.last_name}</Text>
                  <Text style={{ fontSize: 12, color: C.textMuted }}>{doc.specialty}</Text>
                  <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {(sched?.slots || []).length} slots · {(sched?.blocked_days || []).length} blocked days this week
                  </Text>
                </View>
                <Icon name="chevron-right" lib="feather" size={18} color={C.textMuted} />
              </View>
            </Card>
          );
        })}
      </ScreenContainer>
    );
  }

  const setBy = isRec ? 'receptionist' : 'self';

  return (
    <ScreenContainer scroll>
      {!isDoctor && (
        <TouchableOpacity onPress={() => setSelectedDoc(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Icon name="arrow-left" lib="feather" size={16} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>All doctors</Text>
        </TouchableOpacity>
      )}

      <View style={s.schedHeader}>
        <View>
          <Text style={[s.pageTitle, { color: C.text }]}>
            {isDoctor ? 'My availability' : (schedule?.doctor_name || 'Schedule')}
          </Text>
          <Text style={[s.pageSub, { color: C.textMuted }]}>This week · tap a day to add slots</Text>
        </View>
        <Btn label="+ Add slot" size="sm" onPress={() => setAddModalVis(true)} />
      </View>

      {isRec && (
        <View style={[s.infoBanner, { backgroundColor: C.warningLight, borderColor: C.warning }]}>
          <Icon name="alert-circle" lib="feather" size={13} color={C.warning} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: C.warning, flex: 1 }}>
            Slots you add will be marked "set by receptionist". The doctor can override them.
          </Text>
        </View>
      )}

      {schedule && DAYS.map(day => (
        <DayRow
          key={day} day={day}
          slots={schedule.slots || []}
          blocked={(schedule.blocked_days || []).includes(day)}
          onAddSlot={() => setAddModalVis(true)}
          onRemoveSlot={handleRemoveSlot}
          onToggleBlock={handleToggleBlock}
          C={C}
        />
      ))}

      <AddSlotModal
        visible={addModalVis}
        onClose={() => setAddModalVis(false)}
        onSave={handleAddSlot}
        doctorName={!isDoctor ? schedule?.doctor_name : null}
        existingSlots={schedule?.slots || []}
        setBy={setBy}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  pageTitle:    { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  pageSub:      { fontSize: 12, marginBottom: 14 },
  schedHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  docCard:      { marginBottom: 10, padding: 14 },
  docName:      { fontSize: 14, fontWeight: '700' },
  dayRow:       { paddingVertical: 10, borderBottomWidth: 1, marginBottom: 4 },
  dayHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayLabel:     { fontSize: 13, fontWeight: '700' },
  blockBtn:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  addSlotBtn:   { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  slotRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 8, marginBottom: 5 },
  slotTimePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  infoBanner:   { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  // Modal
  modalBackdrop:{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 36 },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  modalSub:     { fontSize: 12, marginBottom: 14 },
  fieldLabel:   { fontSize: 11, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayPill:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 6 },
  typePill:     { paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1 },
  inp:          { borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, fontSize: 14 },
  errText:      { fontSize: 12, marginBottom: 10 },
});
