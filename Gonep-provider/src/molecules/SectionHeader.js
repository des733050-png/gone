// ─── molecules/SectionHeader.js ──────────────────────────────────────────────
// Section header row used across detail views (PatientDetail, etc.)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../atoms/Icon';
import { useTheme } from '../theme/ThemeContext';

export function SectionHeader({ title, icon, iconLib = 'feather', count }) {
  const { C } = useTheme();
  return (
    <View style={[s.row, { borderBottomColor: C.divider }]}>
      <Icon name={icon} lib={iconLib} size={15} color={C.primary} style={{ marginRight: 8 }} />
      <Text style={[s.title, { color: C.text }]}>{title}</Text>
      {count != null && (
        <View style={[s.pill, { backgroundColor: C.primaryLight }]}>
          <Text style={{ color: C.primary, fontSize: 10, fontWeight: '700' }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, marginBottom: 6, borderBottomWidth: 1 },
  title: { fontSize: 13, fontWeight: '700', flex: 1 },
  pill:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
});
