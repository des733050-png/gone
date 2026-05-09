import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BookingDateGrid } from '../../../../molecules/BookingDateGrid';
import { useTheme } from '../../../../theme/ThemeContext';

const APPOINTMENT_TYPES = ['In Facility', 'Home Visit', 'Virtual'];

export function Step3TypeAndSlots({
  appointmentType,
  onTypeChange,
  slots,
  slotsLoading,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
}) {
  const { C } = useTheme();

  // All unique dates that have at least one slot (for this type)
  const availableDates = useMemo(
    () => [...new Set((slots || []).map((s) => s.date).filter(Boolean))].sort(),
    [slots],
  );

  // Time slots for the chosen date
  const timeSlotsForDate = useMemo(
    () => (selectedDate ? (slots || []).filter((s) => s.date === selectedDate) : []),
    [slots, selectedDate],
  );

  const selectedTimeKey = selectedTime?.time || selectedTime?.start || selectedTime;

  return (
    <View style={s.container}>
      {/* Appointment type pills */}
      <Text style={[s.label, { color: C.textMuted }]}>Appointment type</Text>
      <View style={s.typeRow}>
        {APPOINTMENT_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => { onTypeChange(t); onDateChange(null); onTimeChange(null); }}
            style={[
              s.typeBtn,
              {
                backgroundColor: appointmentType === t ? C.primary : C.card,
                borderColor: appointmentType === t ? C.primary : C.border,
              },
            ]}
          >
            <Text style={{ color: appointmentType === t ? '#fff' : C.textSec, fontSize: 12, fontWeight: '600' }}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading state */}
      {slotsLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={C.primary} />
          <Text style={[s.hint, { color: C.textMuted }]}>Loading availability…</Text>
        </View>
      ) : availableDates.length === 0 ? (
        <View style={s.centered}>
          <Text style={[s.hint, { color: C.textMuted }]}>
            No available slots for {appointmentType}.{'\n'}Try a different appointment type.
          </Text>
        </View>
      ) : (
        <>
          {/* Calendar — only available dates are pressable */}
          <Text style={[s.label, { color: C.textMuted }]}>Select date</Text>
          <BookingDateGrid
            availableDates={availableDates}
            value={selectedDate}
            onChange={(date) => { onDateChange(date); onTimeChange(null); }}
            minDateIso={new Date().toISOString().split('T')[0]}
          />

          {/* Time slots */}
          {selectedDate ? (
            <>
              <Text style={[s.label, { color: C.textMuted }]}>Select time</Text>
              {timeSlotsForDate.length === 0 ? (
                <Text style={[s.hint, { color: C.textMuted }]}>
                  No {appointmentType} slots on this date.
                </Text>
              ) : (
                <View style={s.timeGrid}>
                  {timeSlotsForDate.map((slot) => {
                    const key = slot.time || slot.start;
                    const isSelected = selectedTimeKey === key;
                    return (
                      <TouchableOpacity
                        key={`${slot.slot_id || ''}-${key}`}
                        onPress={() => onTimeChange(slot)}
                        style={[
                          s.timeSlot,
                          {
                            borderColor: isSelected ? C.primary : C.border,
                            backgroundColor: isSelected ? C.primary + '15' : C.card,
                          },
                        ]}
                      >
                        <Text style={{ color: isSelected ? C.primary : C.text, fontWeight: '600', fontSize: 13 }}>
                          {key}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <Text style={[s.hint, { color: C.textMuted, marginTop: 4 }]}>
              Tap an available date above to see time slots.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 14 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  centered: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  hint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
});
