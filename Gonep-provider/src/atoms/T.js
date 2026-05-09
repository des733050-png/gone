import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function T({ style, children, ...props }) {
  const { typography } = useTheme();
  return (
    <Text style={[{ fontFamily: typography.fontFamily }, style]} {...props}>
      {children}
    </Text>
  );
}
