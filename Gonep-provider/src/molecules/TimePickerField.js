import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../atoms/Icon';

function toPickerDate(timeValue) {
  const [h = '09', m = '00'] = String(timeValue || '09:00').split(':');
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date;
}

export function TimePickerField({ label, value, onChange }) {
  const { C } = useTheme();
  const isWeb = Platform.OS === 'web';
  const [showPicker, setShowPicker] = useState(false);

  if (isWeb) {
    return (
      <View style={{ marginBottom: 12 }}>
        {label ? <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text> : null}
        {React.createElement('input', {
          type: 'time',
          value: value || '',
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
        <Text style={{ color: value ? C.text : C.textMuted }}>{value || 'Select time'}</Text>
        <Icon name="clock" lib="feather" size={16} color={C.textMuted} />
      </TouchableOpacity>
      {showPicker ? (
        <DateTimePicker
          value={toPickerDate(value)}
          mode="time"
          onChange={(_, timeDate) => {
            setShowPicker(false);
            if (!timeDate) return;
            const hours = String(timeDate.getHours()).padStart(2, '0');
            const mins = String(timeDate.getMinutes()).padStart(2, '0');
            onChange?.(`${hours}:${mins}`);
          }}
        />
      ) : null}
    </View>
  );
}
