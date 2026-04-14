// ─── molecules/FormField.js ──────────────────────────────────────────────────
// Label + TextInput pair with consistent styling across all modals.
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  numberOfLines,
  error,
  style,
  inputStyle,
}) {
  const { C } = useTheme();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? (
        <Text style={[s.label, { color: C.textMuted }]}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor={C.textMuted}
        style={[
          s.input,
          multiline && s.textarea,
          { backgroundColor: C.inputBg, borderColor: error ? C.danger : C.border, color: C.text },
          inputStyle,
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  label:   { fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4, },
  input:   { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  textarea:{ minHeight: 80, textAlignVertical: 'top' },
});
