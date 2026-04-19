import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../atoms/Icon';

function formatDisplayDate(value) {
  if (!value) return 'Select date';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function DatePickerField({ label, value, min, onChange }) {
  const { C } = useTheme();
  const isWeb = Platform.OS === 'web';
  const [showPicker, setShowPicker] = useState(false);
  const selectedDate = value ? new Date(`${value}T00:00:00`) : new Date();

  if (isWeb) {
    return (
      <View style={{ marginBottom: 12 }}>
        {label ? <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text> : null}
        {React.createElement('input', {
          type: 'date',
          value: value || '',
          min: min || '',
          onChange: (event) => onChange?.(event?.target?.value || ''),
          style: {
            width: '100%',
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '10px 12px',
            backgroundColor: C.inputBg,
            color: C.text,
          },
        })}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text> : null}
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        style={{
          borderWidth: 1.5,
          borderColor: C.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: C.inputBg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: value ? C.text : C.textMuted }}>{formatDisplayDate(value)}</Text>
        <Icon name="calendar" lib="feather" size={16} color={C.textMuted} />
      </TouchableOpacity>
      {showPicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          minimumDate={min ? new Date(`${min}T00:00:00`) : undefined}
          onChange={(_, dateValue) => {
            setShowPicker(false);
            if (!dateValue) return;
            const normalized = dateValue.toISOString().slice(0, 10);
            onChange?.(normalized);
          }}
        />
      ) : null}
    </View>
  );
}
