import React from 'react';
import { Platform, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function SelectField({ label, value, options = [], onChange, disabled = false }) {
  const { C } = useTheme();
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    return (
      <View style={{ marginBottom: 12 }}>
        {label ? <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text> : null}
        {React.createElement(
          'select',
          {
            value: value || '',
            disabled,
            onChange: (event) => onChange?.(event?.target?.value || ''),
            style: {
              width: '100%',
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              padding: '10px 12px',
              backgroundColor: C.inputBg,
              color: C.text,
            },
          },
          options.map((item) =>
            React.createElement('option', { key: item.value, value: item.value }, item.label)
          )
        )}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text> : null}
      <View
        style={{
          borderWidth: 1.5,
          borderColor: C.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: C.inputBg,
        }}
      >
        <Text style={{ color: C.text }}>
          {options.find((item) => item.value === value)?.label || 'Select option'}
        </Text>
      </View>
    </View>
  );
}
