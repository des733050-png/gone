import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Btn } from '../atoms/Btn';
import { useTheme } from '../theme/ThemeContext';

export function BookingTimeSlotList({ label, times, value, onChange }) {
  const { C } = useTheme();
  if (!times?.length) {
    return (
      <View style={{ marginBottom: 12 }}>
        {label ? <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text> : null}
        <Text style={{ color: C.textMuted, fontSize: 13 }}>No open times for this day and duration.</Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text> : null}
      <View style={styles.row}>
        {times.map((t) => (
          <Btn
            key={t}
            label={t}
            size="sm"
            variant={value === t ? 'primary' : 'ghost'}
            onPress={() => onChange?.(t)}
            style={{ marginRight: 8, marginBottom: 8 }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
