import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BookingDateGrid } from '../../../../molecules/BookingDateGrid';
import { BookingTimeSlotList } from '../../../../molecules/BookingTimeSlotList';
import { PillSelector } from '../../../../molecules/PillSelector';
import { useTheme } from '../../../../theme/ThemeContext';

const APPOINTMENT_TYPES = ['In Facility', 'Home Visit', 'Virtual'];

export function Step4TypeAndSlots({
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

  // Extract unique dates from slots
  const availableDates = [...new Set((slots || []).map((s) => s.date))];

  // Filter time slots for selected date
  const timeSlotsForDate = selectedDate
    ? (slots || [])
        .filter((s) => s.date === selectedDate)
        .map((s) => s.time || s.start)
    : [];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Appointment type</Text>
      <PillSelector
        options={APPOINTMENT_TYPES}
        selected={appointmentType}
        onSelect={onTypeChange}
        style={styles.pills}
      />

      {slotsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
          <Text style={[styles.hint, { color: C.textMuted }]}>Loading availability…</Text>
        </View>
      ) : !slots.length ? (
        <View style={styles.centered}>
          <Text style={[styles.hint, { color: C.textMuted }]}>
            No available slots for {appointmentType}. Try a different type.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Select date</Text>
          <BookingDateGrid
            availableDates={availableDates}
            value={selectedDate}
            onChange={onDateChange}
            minDateIso={new Date().toISOString().split('T')[0]}
          />

          {selectedDate ? (
            <>
              <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Select time</Text>
              <BookingTimeSlotList
                times={timeSlotsForDate}
                value={selectedTime?.time || selectedTime}
                onChange={(t) => {
                  const slot = (slots || []).find((s) => s.date === selectedDate && (s.time === t || s.start === t));
                  onTimeChange(slot || t);
                }}
              />
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pills: { marginBottom: 4 },
  centered: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  hint: { fontSize: 13, textAlign: 'center' },
});
