import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../../theme/ThemeContext';

export function Step1Specialization({ specialties, loading, selected, onSelect }) {
  const { C } = useTheme();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={C.primary} />
        <Text style={[styles.hint, { color: C.textMuted }]}>Loading specializations…</Text>
      </View>
    );
  }

  if (!specialties.length) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.hint, { color: C.textMuted }]}>No specializations found. Add some in the Specializations screen.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {specialties.map((s) => {
        const name = s?.name || s;
        const isSelected = (selected?.name || selected) === name;
        return (
          <TouchableOpacity
            key={name}
            onPress={() => onSelect(s)}
            style={[
              styles.pill,
              { borderColor: C.border, backgroundColor: isSelected ? C.primary : C.card },
            ]}
          >
            <Text style={[styles.pillText, { color: isSelected ? '#fff' : C.text }]}>{name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  hint: { fontSize: 13, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 14, fontWeight: '500' },
});
