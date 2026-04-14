// ─── molecules/SearchBar.js ──────────────────────────────────────────────────
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '../atoms/Icon';
import { useTheme } from '../theme/ThemeContext';

export function SearchBar({ value, onChangeText, placeholder = 'Search…', onSubmit, style }) {
  const { C } = useTheme();
  return (
    <View style={[s.wrap, { backgroundColor: C.inputBg, borderColor: C.border }, style]}>
      <Icon name="search" lib="feather" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        style={[s.input, { color: C.text }]}
        returnKeyType="search"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Icon name="x" lib="feather" size={14} color={C.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  input: { flex: 1, fontSize: 14 },
});
