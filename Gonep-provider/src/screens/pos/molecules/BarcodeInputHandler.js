// ─── screens/pos/molecules/BarcodeInputHandler.js ────────────────────────────
import React, { useState, useRef } from 'react';
import { TextInput, Platform, StyleSheet } from 'react-native';

export function BarcodeInputHandler({ onScan }) {
  const [buf,    setBuf]    = useState('');
  const timerRef            = useRef(null);

  const handleChange = (text) => {
    setBuf(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (text.trim().length >= 4) { onScan(text.trim()); setBuf(''); }
    }, 350);
  };

  const handleSubmit = () => {
    clearTimeout(timerRef.current);
    if (buf.trim().length >= 4) { onScan(buf.trim()); setBuf(''); }
  };

  return (
    <TextInput
      value={buf}
      onChangeText={handleChange}
      onSubmitEditing={handleSubmit}
      style={s.hidden}
      autoFocus={Platform.OS === 'web'}
      blurOnSubmit={false}
      placeholder=""
      accessible={false}
      importantForAccessibility="no"
    />
  );
}

const s = StyleSheet.create({
  hidden: { position: 'absolute', top: -100, left: -100, width: 1, height: 1, opacity: 0 },
});
