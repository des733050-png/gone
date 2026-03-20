import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  error,
  icon,
  hint,
  style,
}) {
  const { C } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: C.textSec }]}>
          {label}
        </Text>
      )}
      <View style={styles.inputRow}>
        {icon && (
          <View style={styles.icon}>
            <Icon
              name={icon}
              lib="feather"
              size={18}
              color={focused ? C.primary : C.textMuted}
            />
          </View>
        )}
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={C.textMuted}
          style={[
            styles.input,
            {
              borderColor: error ? C.danger : focused ? C.primary : C.border,
              backgroundColor: C.inputBg,
              color: C.text,
              paddingLeft: icon ? 38 : 14,
            },
          ]}
        />
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginRight: 4 }} />
          <Text style={[styles.error, { color: C.danger }]}>{error}</Text>
        </View>
      ) : (
        hint && <Text style={[styles.hint, { color: C.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  icon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 10,
    fontSize: 14,
    paddingVertical: 10,
    paddingRight: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
});


