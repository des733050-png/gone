// ─── molecules/PillSelector.js ───────────────────────────────────────────────
// Horizontal scrolling row of selectable pills.
// Usage:
//   <PillSelector options={['a','b']} selected={x} onSelect={setX} />
//   <PillSelector options={[{id,label},...]} selected={x} onSelect={setX} labelKey="label" valueKey="id" />
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function PillSelector({
  options,
  selected,
  onSelect,
  valueKey = null,   // if objects, the key for the value
  labelKey = null,   // if objects, the key for the label
  style,
}) {
  const { C } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ marginBottom: 12 }, style]}>
      {options.map(opt => {
        const val   = valueKey ? opt[valueKey] : opt;
        const label = labelKey ? opt[labelKey] : opt;
        const active = selected === val;
        return (
          <TouchableOpacity
            key={String(val)}
            onPress={() => onSelect(val)}
            style={[s.pill, {
              backgroundColor: active ? C.primary : C.surface,
              borderColor:     active ? C.primary : C.border,
              marginRight: 6,
            }]}
          >
            <Text style={{ color: active ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600' }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
});
