// ─── molecules/EmptyState.js ─────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../atoms/Icon';
import { useTheme } from '../theme/ThemeContext';

export function EmptyState({ icon, iconLib = 'feather', message }) {
  const { C } = useTheme();
  return (
    <View style={s.wrap}>
      <Icon name={icon} lib={iconLib} size={32} color={C.textMuted} />
      <Text style={[s.msg, { color: C.textMuted }]}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40 },
  msg:  { fontSize: 13, marginTop: 10 },
});
