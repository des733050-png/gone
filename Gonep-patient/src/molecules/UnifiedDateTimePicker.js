/**
 * UnifiedDateTimePicker
 * Cross-platform date/time picker.
 *   - Android / iOS: @react-native-community/datetimepicker
 *   - Web: HTML5 <input type="date|time">
 *
 * Props:
 *   mode        'date' | 'time'
 *   value       Date | null
 *   onChange    (Date) => void
 *   minimumDate Date | undefined
 *   maximumDate Date | undefined
 *   disabled    bool
 *   label       string (optional)
 *   style       ViewStyle (optional)
 */
import React, { useState } from 'react';
import { Platform, Pressable, Text, View, StyleSheet } from 'react-native';

const IS_WEB = Platform.OS === 'web';

function pad(n) { return String(n).padStart(2, '0'); }

function dateToIsoDate(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateToIsoTime(d) {
  if (!d) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoDateToDate(str, base) {
  if (!str) return base;
  const [y, m, day] = str.split('-').map(Number);
  const out = base ? new Date(base) : new Date();
  out.setFullYear(y, m - 1, day);
  return out;
}

function isoTimeToDate(str, base) {
  if (!str) return base;
  const [h, min] = str.split(':').map(Number);
  const out = base ? new Date(base) : new Date();
  out.setHours(h, min, 0, 0);
  return out;
}

function formatDisplay(date, mode) {
  if (!date) return mode === 'date' ? 'Select date' : 'Select time';
  if (mode === 'date') {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function WebPicker({ mode, value, onChange, minimumDate, maximumDate, disabled, style }) {
  const inputType = mode === 'date' ? 'date' : 'time';
  const inputValue = mode === 'date' ? dateToIsoDate(value) : dateToIsoTime(value);

  function handleChange(e) {
    const v = e.target.value;
    if (!v) return;
    const updated = mode === 'date' ? isoDateToDate(v, value) : isoTimeToDate(v, value);
    onChange(updated);
  }

  return (
    <input
      type={inputType}
      value={inputValue}
      min={mode === 'date' && minimumDate ? dateToIsoDate(minimumDate) : undefined}
      max={mode === 'date' && maximumDate ? dateToIsoDate(maximumDate) : undefined}
      disabled={disabled}
      onChange={handleChange}
      style={{
        height: 44,
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        paddingLeft: 12,
        paddingRight: 12,
        fontSize: 14,
        color: '#1e293b',
        background: disabled ? '#f8fafc' : '#fff',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  );
}

function NativePicker({ mode, value, onChange, minimumDate, maximumDate, disabled }) {
  const [show, setShow] = useState(false);
  let DateTimePicker;
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch {
    return null;
  }

  const display = Platform.OS === 'ios' ? 'spinner' : 'default';

  function handleChange(event, selected) {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') return;
    if (selected) onChange(selected);
  }

  return (
    <>
      <Pressable
        onPress={() => !disabled && setShow(true)}
        style={[styles.nativeButton, disabled && styles.nativeButtonDisabled]}
      >
        <Text style={[styles.nativeButtonText, disabled && styles.nativeButtonTextDisabled]}>
          {formatDisplay(value, mode)}
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display={display}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      )}
    </>
  );
}

export default function UnifiedDateTimePicker({
  mode = 'date',
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled = false,
  label,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {IS_WEB ? (
        <WebPicker
          mode={mode}
          value={value}
          onChange={onChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          disabled={disabled}
        />
      ) : (
        <NativePicker
          mode={mode}
          value={value}
          onChange={onChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          disabled={disabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#64748b',
  },
  nativeButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  nativeButtonDisabled: {
    backgroundColor: '#f8fafc',
  },
  nativeButtonText: {
    fontSize: 14,
    color: '#1e293b',
  },
  nativeButtonTextDisabled: {
    color: '#94a3b8',
  },
});
