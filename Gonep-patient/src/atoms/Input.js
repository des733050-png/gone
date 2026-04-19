import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
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
  const { width } = useResponsive();
  const [focused, setFocused] = useState(false);
  const [showSecureText, setShowSecureText] = useState(false);
  const shouldMask = Boolean(secureTextEntry) && !showSecureText;

  const scale = width < 360 ? 1.12 : width < 640 ? 1.06 : 1;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: C.textSec, fontSize: Math.round(13 * scale) }]}>
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
          secureTextEntry={shouldMask}
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
              paddingRight: secureTextEntry ? 44 : 14,
              fontSize: Math.round(15 * scale),
              paddingVertical: Math.round(12 * scale),
            },
          ]}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setShowSecureText((value) => !value)}
            style={styles.toggleButton}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Icon
              name={showSecureText ? 'eye-off' : 'eye'}
              lib="feather"
              size={18}
              color={focused ? C.primary : C.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginRight: 4 }} />
          <Text style={[styles.error, { color: C.danger, fontSize: Math.round(12 * scale) }]}>{error}</Text>
        </View>
      ) : (
        hint && <Text style={[styles.hint, { color: C.textMuted, fontSize: Math.round(11 * scale) }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
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
    paddingRight: 14,
  },
  toggleButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  error: {
    marginTop: 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hint: {
    marginTop: 4,
  },
});


