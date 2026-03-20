import React, { useState } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
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

  const sz = { sm: 12, md: 14, lg: 16 };
  const verticalPad = { sm: 6, md: 10, lg: 12 };
  const horizontalPad = { sm: 12, md: 18, lg: 24 };

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


