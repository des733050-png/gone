// ─── screens/clinical/Availability/molecules/AddSlotModal.js ─────────────────
// Full time dropdowns, no overlap, no slot on blocked days, type-bound.
// Each slot is for ONE consultation type; multiple types per day are allowed
// as long as their time windows do NOT overlap.
import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { useTheme } from '../../../../theme/ThemeContext';
import { DAYS, SLOT_TYPES } from '../../../../constants/availability';

// ── Time options — 30-min granularity from 06:00 to 22:00 (matches backend) ──
const TIME_OPTIONS = (() => {
  const list = [];
  for (let h = 6; h <= 22; h++) {
    list.push(`${String(h).padStart(2,'0')}:00`);
    if (h !== 22) list.push(`${String(h).padStart(2,'0')}:30`);
  }
  return list;
})();

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// ── Inline dropdown picker ───────────────────────────────────────────────────
function TimeDropdown({ label, value, onChange, options, C }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.fieldLabel, { color: C.textMuted }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={[s.input, { borderColor: C.border, backgroundColor: C.surface }]}
      >
        <Text style={{ color: value ? C.text : C.textMuted, fontSize: 13 }}>
          {value || 'Select…'}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 11 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={[s.dropdown, { borderColor: C.border, backgroundColor: C.card }]}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            {options.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { onChange(t); setOpen(false); }}
                style={[
                  s.dropdownItem,
                  value === t && { backgroundColor: C.primaryLight },
                ]}
              >
                <Text
                  style={{
                    color: value === t ? C.primary : C.text,
                    fontSize: 13,
                    fontWeight: value === t ? '700' : '500',
                  }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export function AddSlotModal({
  visible, onClose, onSave, doctorName,
  existingSlots = [], blockedDays = [], setBy, defaultDay,
}) {
  const { C } = useTheme();
  const [day,   setDay]   = useState(defaultDay || 'Mon');
  const [start, setStart] = useState('09:00');
  const [end,   setEnd]   = useState('09:30');
  const [type,  setType]  = useState('in_facility');
  const [err,   setErr]   = useState('');

  // Reset on open
  React.useEffect(() => {
    if (visible) {
      setDay(defaultDay || 'Mon');
      setStart('09:00');
      setEnd('09:30');
      setType('in_facility');
      setErr('');
    }
  }, [visible, defaultDay]);

  const isBlocked = blockedDays.includes(day);

  // Slots already set on this day, sorted by start
  const daySlots = useMemo(
    () => existingSlots
      .filter((sl) => sl.day === day)
      .map((sl) => ({ ...sl, _s: toMinutes(sl.start), _e: toMinutes(sl.end) }))
      .filter((sl) => sl._s !== null && sl._e !== null)
      .sort((a, b) => a._s - b._s),
    [existingSlots, day],
  );

  // End-time options: must be > start
  const endOptions = useMemo(() => {
    const sMin = toMinutes(start);
    if (sMin === null) return TIME_OPTIONS;
    return TIME_OPTIONS.filter((t) => toMinutes(t) > sMin);
  }, [start]);

  const validate = () => {
    if (isBlocked) {
      return `${day} is currently blocked. Unblock the day before adding slots.`;
    }
    const sMin = toMinutes(start);
    const eMin = toMinutes(end);
    if (sMin === null || eMin === null) return 'Pick a start and end time.';
    if (eMin - sMin < 30) return 'Slot must be at least 30 minutes long.';
    // Overlap check across ALL types on this day
    for (const sl of daySlots) {
      if (sMin < sl._e && sl._s < eMin) {
        return `Overlaps existing ${sl.type || 'slot'} (${sl.start}–${sl.end}).`;
      }
    }
    return null;
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setErr('');
    setSaving(true);
    try {
      const result = await onSave({ day, start, end, type, setBy });
      // onSave may return {ok, error} (new contract) or undefined (legacy)
      if (result && result.ok === false) {
        setErr(result.error || 'Could not add slot.');
      } else {
        onClose();
      }
    } catch (ex) {
      setErr(ex?.message || 'Could not add slot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }}>
            Add availability slot
          </Text>
          {doctorName ? (
            <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>{doctorName}</Text>
          ) : null}

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Day */}
            <Text style={[s.fieldLabel, { color: C.textMuted }]}>Day</Text>
            <View style={s.dayRow}>
              {DAYS.map((d) => {
                const blockedDay = blockedDays.includes(d);
                const active = day === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDay(d)}
                    style={[
                      s.dayChip,
                      {
                        borderColor: active ? C.primary : C.border,
                        backgroundColor: active ? C.primary : C.surface,
                        opacity: blockedDay ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text style={{
                      color: active ? '#fff' : (blockedDay ? C.danger : C.text),
                      fontSize: 12,
                      fontWeight: '600',
                    }}>
                      {d}{blockedDay ? ' 🚫' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isBlocked && (
              <View style={[s.warnBox, { backgroundColor: C.dangerLight, borderColor: C.danger }]}>
                <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>
                  ⚠ {day} is blocked. Unblock the day before adding slots.
                </Text>
              </View>
            )}

            {/* Show existing slots for this day */}
            {!!daySlots.length && (
              <View style={{ marginTop: 8, marginBottom: 4 }}>
                <Text style={[s.fieldLabel, { color: C.textMuted }]}>Existing on {day}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {daySlots.map((sl) => (
                    <View key={sl.id} style={[s.existingChip, { borderColor: C.border, backgroundColor: C.surface }]}>
                      <Text style={{ fontSize: 11, color: C.text }}>
                        {sl.start}–{sl.end}{' · '}
                        <Text style={{ color: C.textMuted }}>{sl.type}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Time dropdowns */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TimeDropdown label="Start" value={start} onChange={setStart} options={TIME_OPTIONS} C={C} />
              <TimeDropdown label="End"   value={end}   onChange={setEnd}   options={endOptions}    C={C} />
            </View>

            {/* Type */}
            <Text style={[s.fieldLabel, { color: C.textMuted, marginTop: 14 }]}>Consultation type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SLOT_TYPES.map((t) => (
                <Btn
                  key={t.value}
                  label={t.label}
                  size="sm"
                  variant={type === t.value ? 'primary' : 'ghost'}
                  onPress={() => setType(t.value)}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
            <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
              ℹ Each slot is bound to one type. Add another slot for a different type.
            </Text>
          </ScrollView>

          {err ? (
            <Text style={{ fontSize: 12, color: C.danger, marginTop: 10 }}>{err}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
            <Btn
              label={saving ? 'Adding…' : 'Add slot'}
              onPress={handleSave}
              disabled={isBlocked || saving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%', maxWidth: 480, borderWidth: 1, borderRadius: 16, padding: 18, maxHeight: '90%',
  },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 6, marginTop: 4,
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  dayChip: {
    borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6,
  },
  warnBox: {
    borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 4,
  },
  existingChip: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  input: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  dropdown: {
    marginTop: 4, borderWidth: 1, borderRadius: 10, overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12, paddingVertical: 10,
  },
});
