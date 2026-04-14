// ─── screens/clinical/Availability/molecules/DayRow.js ───────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Badge } from '../../../../atoms/Badge';
import { Icon }  from '../../../../atoms/Icon';
import { useTheme } from '../../../../theme/ThemeContext';
import { SLOT_TYPES, slotTypeColor } from '../../../../constants/availability';

export function DayRow({ day, slots, blocked, onAddSlot, onRemoveSlot, onToggleBlock }) {
  const { C } = useTheme();
  const daySlots = slots.filter(slot => slot.day === day);

  return (
    <View style={[s.row, { borderBottomColor: C.divider }]}>
      {/* Day header */}
      <View style={s.header}>
        <Text style={[s.dayLabel, { color: blocked ? C.textMuted : C.text }]}>{day}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {blocked
            ? <Badge label="Blocked"  color="danger"  />
            : daySlots.length === 0
              ? <Badge label="No slots" color="warning" />
              : null}
          <TouchableOpacity onPress={() => onToggleBlock(day)} style={[s.blockBtn, { borderColor: C.border }]}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: blocked ? C.success : C.textMuted }}>
              {blocked ? 'Unblock' : 'Block'}
            </Text>
          </TouchableOpacity>
          {!blocked && (
            <TouchableOpacity onPress={() => onAddSlot(day)} style={[s.addBtn, { backgroundColor: C.primaryLight }]}>
              <Icon name="plus" lib="feather" size={12} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Slot rows */}
      {daySlots.map(slot => {
        const tc      = slotTypeColor(slot.type, C);
        const typeLbl = SLOT_TYPES.find(t => t.value === slot.type)?.label || slot.type;
        return (
          <View key={slot.id} style={[s.slotRow, { backgroundColor: C.surface }]}>
            <View style={[s.timePill, { backgroundColor: tc.bg }]}>
              <Text style={{ color: tc.text, fontSize: 11, fontWeight: '700' }}>
                {slot.start}–{slot.end}
              </Text>
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

const s = StyleSheet.create({
  row:      { paddingVertical: 10, borderBottomWidth: 1, marginBottom: 4 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayLabel: { fontSize: 13, fontWeight: '700' },
  blockBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  addBtn:   { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  slotRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 8, marginBottom: 5 },
  timePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});
