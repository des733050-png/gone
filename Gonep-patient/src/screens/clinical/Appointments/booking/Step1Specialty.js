import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../../atoms/Icon';
import { useTheme } from '../../../../theme/ThemeContext';

export function Step1Specialty({ specialties, loading, selected, onSelect }) {
  const { C } = useTheme();

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.primary} />
        <Text style={[s.hint, { color: C.textMuted }]}>Loading specialties…</Text>
      </View>
    );
  }

  if (!specialties.length) {
    return (
      <View style={s.centered}>
        <Icon name="stethoscope" lib="mc" size={36} color={C.textMuted} />
        <Text style={[s.hint, { color: C.textMuted }]}>No specialties available yet.</Text>
      </View>
    );
  }

  return (
    <View style={s.grid}>
      {specialties.map((item) => {
        const name = typeof item === 'string' ? item : item?.name || '';
        const isSelected = selected === name || selected === item;
        return (
          <TouchableOpacity
            key={name}
            onPress={() => onSelect(name)}
            style={[
              s.pill,
              {
                borderColor: isSelected ? C.primary : C.border,
                backgroundColor: isSelected ? C.primary + '12' : C.card,
              },
            ]}
            activeOpacity={0.75}
          >
            <Icon name="stethoscope" lib="mc" size={20} color={isSelected ? C.primary : C.textMuted} style={{ marginBottom: 6 }} />
            <Text style={[s.pillLabel, { color: isSelected ? C.primary : C.text }]} numberOfLines={2}>
              {name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  centered: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  hint: { fontSize: 13, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pill: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  pillLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
