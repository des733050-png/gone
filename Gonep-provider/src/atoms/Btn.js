import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Icon } from './Icon';

export function Btn({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  full = false,
  icon,
  disabled = false,
  loading = false,
  style,
}) {
  const { C } = useTheme();
  const { width } = useResponsive();
  const [hov, setHov] = useState(false);

  const vs = {
    primary: {
      backgroundColor: hov ? C.primaryDark : C.primary,
      color: '#fff',
      borderWidth: 0,
      shadowColor: C.shadowMd,
    },
    secondary: {
      backgroundColor: 'transparent',
      color: C.primary,
      borderWidth: 1.5,
      borderColor: C.primary,
    },
    ghost: {
      backgroundColor: hov ? C.divider : 'transparent',
      color: C.textSec,
      borderWidth: 1,
      borderColor: C.border,
    },
    danger: {
      backgroundColor: hov ? '#DC2626' : C.danger,
      color: '#fff',
      borderWidth: 0,
    },
    success: {
      backgroundColor: C.success,
      color: '#fff',
      borderWidth: 0,
    },
    white: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
  };

  const scale = width < 360 ? 1.12 : width < 640 ? 1.06 : 1;

  const sz = {
    sm: Math.round(12 * scale),
    md: Math.round(14 * scale),
    lg: Math.round(16 * scale),
  };
  const verticalPad = {
    sm: Math.round(8 * scale),
    md: Math.round(12 * scale),
    lg: Math.round(14 * scale),
  };
  const horizontalPad = {
    sm: Math.round(12 * scale),
    md: Math.round(18 * scale),
    lg: Math.round(24 * scale),
  };

  const v = vs[variant] || vs.primary;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      onHoverIn={() => setHov(true)}
      onHoverOut={() => setHov(false)}
      style={({ pressed }) => [
        styles.btnBase,
        {
          backgroundColor: v.backgroundColor,
          borderWidth: v.borderWidth,
          borderColor: v.borderColor,
          opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
          paddingVertical: verticalPad[size],
          paddingHorizontal: horizontalPad[size],
          minWidth: full ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.color || '#fff'} style={{ marginRight: 6 }} />
      ) : (
        icon && (
          <View style={{ marginRight: 6 }}>
            {typeof icon === 'string' ? (
              <Icon name={icon} size={sz[size] + 2} color={v.color || '#fff'} />
            ) : (
              icon
            )}
          </View>
        )
      )}
      <Text style={{ color: v.color || '#fff', fontWeight: '700', fontSize: sz[size] }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btnBase: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


