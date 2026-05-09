import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function FloatingLabel({ label, size = 'md', style }) {
  const { C, typography } = useTheme();

  const fontSize = size === 'lg' ? typography.h3 : size === 'sm' ? typography.sm : typography.body;

  return (
    <View style={[
      styles.wrap,
      {
        backgroundColor: C.surface,
        borderColor: C.border,
        ...Platform.select({
          ios:     { shadowColor: C.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
          android: { elevation: 4 },
          web:     { boxShadow: '0 3px 10px rgba(0,0,0,0.10)' },
          default: {},
        }),
      },
      style,
    ]}>
      <Text style={{
        fontFamily:       typography.fontFamily,
        fontSize,
        fontWeight:       '700',
        letterSpacing:    0.2,
        color:            C.text,
        textShadowColor:  'rgba(0,0,0,0.15)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf:         'flex-start',
    borderWidth:       1,
    borderRadius:      10,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },
});
