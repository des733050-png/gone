import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../atoms/Icon';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

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
    const pickerValue = value ? dayjs(value, 'YYYY-MM-DD') : null;
    const minValue = min ? dayjs(min, 'YYYY-MM-DD') : undefined;
    return (
      <View style={{ marginBottom: 12 }}>
        <DatePicker
          label={label || 'Date'}
          value={pickerValue}
          minDate={minValue}
          onChange={(next) => {
            if (!next || !next.isValid?.()) return onChange?.('');
            onChange?.(next.format('YYYY-MM-DD'));
          }}
          slotProps={{
            textField: {
              fullWidth: true,
              size: 'small',
              sx: {
                '& .MuiInputBase-root': {
                  backgroundColor: C.inputBg,
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: C.primaryMid },
                '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: C.primary,
                  boxShadow: `0 0 0 3px ${C.shadowMd}`,
                },
              },
            },
          }}
        />
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
