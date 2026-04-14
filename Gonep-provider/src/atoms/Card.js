import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';

export function Card({ children, onPress, hover = false, style }) {
  const { C } = useTheme();
  const { width } = useResponsive();
  const [hov, setHov] = useState(false);

  const pad = width < 360 ? 16 : width < 640 ? 17 : 18;

  const interactive = hover || !!onPress;
  const baseStyle = [
    styles.base,
    {
      backgroundColor: interactive && hov ? C.cardHover : C.card,
      borderColor: C.border,
      padding: pad,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHov(true)}
        onHoverOut={() => setHov(false)}
        style={({ pressed }) => [
          baseStyle,
          { opacity: pressed ? 0.96 : 1 },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={baseStyle}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 14,
  },
});


