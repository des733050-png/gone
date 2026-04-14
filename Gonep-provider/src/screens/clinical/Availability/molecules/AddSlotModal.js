// ─── screens/clinical/Availability/molecules/AddSlotModal.js ─────────────────
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { PillSelector } from '../../../../molecules/PillSelector';
import { FormField }    from '../../../../molecules/FormField';
import { useTheme } from '../../../../theme/ThemeContext';
import {
  DAYS, SLOT_TYPES, slotDurationMins, dayTotalMins,
} from '../../../../constants/availability';

export function AddSlotModal({ visible, onClose, onSave, doctorName, existingSlots, setBy }) {
  const { C } = useTheme();
  const [day,   setDay]   = useState('Mon');
  const [start, setStart] = useState('08:00');
  const [end,   setEnd]   = useState('12:00');
  const [type,  setType]  = useState('in_facility');
  const [err,   setErr]   = useState('');

  const validate = () => {
    const dur = slotDurationMins(start, end);
    if (dur <= 0)  return 'End time must be after start time.';
    if (dur < 30)  return 'Minimum slot duration is 30 minutes.';
    if (dur > 240) return 'Maximum slot duration is 4 hours per slot.';
    const total = dayTotalMins(existingSlots, day);
    if (total + dur > 720) return 'Total slots for this day would exceed 12 hours.';
    return null;
  };

  const handleSave = () => {
    const e = validate();
    if (e) { setErr(e); return; }
    onSave({ day, start, end, type, setBy });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }}>
        Add availability slot
      </Text>
      {doctorName ? (
        <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>{doctorName}</Text>
      ) : null}

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Day
      </Text>
      <PillSelector options={DAYS} selected={day} onSelect={setDay} />

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <FormField label="Start time" value={start} onChangeText={setStart} placeholder="08:00" />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="End time"   value={end}   onChangeText={setEnd}   placeholder="12:00" />
        </View>
      </View>

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Consultation type
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {SLOT_TYPES.map(t => (
          <Btn key={t.value} label={t.label} size="sm"
            variant={type === t.value ? 'primary' : 'ghost'}
            onPress={() => setType(t.value)}
            style={{ flex: 1 }} />
        ))}
      </View>

      {err ? <Text style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn label="Cancel"   variant="ghost" onPress={onClose}    style={{ flex: 1 }} />
        <Btn label="Add slot"                 onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}
