// ─── molecules/PageHeader.js ─────────────────────────────────────────────────
// Top-of-screen title + subtitle row with optional right-side action slot.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function PageHeader({ title, subtitle, action }) {
  const { C } = useTheme();
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: C.text }]}>{title}</Text>
        {subtitle ? <Text style={[s.sub, { color: C.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {action ? action : null}
    </View>
  );
}

const s = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  sub:   { fontSize: 12 },
});
