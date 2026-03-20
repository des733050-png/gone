import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function Badge({ label, color = 'primary', size = 'sm', style }) {
  const { C } = useTheme();
  const map = {
    primary: { bg: C.primaryLight, text: C.primary },
    success: { bg: C.successLight, text: C.success },
    warning: { bg: C.warningLight, text: C.warning },
    danger: { bg: C.dangerLight, text: C.danger },
    purple: { bg: C.purpleLight, text: C.purple },
    cyan: { bg: '#CFFAFE', text: '#0891B2' },
  };
  const s = map[color] || map.primary;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: s.bg,
          paddingVertical: size === 'sm' ? 3 : 5,
          paddingHorizontal: size === 'sm' ? 10 : 14,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: s.text,
          fontSize: size === 'sm' ? 11 : 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});


