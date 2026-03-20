import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';

export function ScreenContainer({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  ...rest
}) {
  const { C } = useTheme();
  const { isLarge } = useResponsive();

  const horizontalPadding = isLarge ? 32 : 16;

  const outerStyle = [
    styles.outer,
    {
      backgroundColor: C.bg,
      paddingHorizontal: horizontalPadding,
      paddingVertical: 16,
    },
    style,
  ];

  const innerStyle = [styles.inner];

  if (scroll) {
    return (
      <ScrollView
        {...rest}
        style={outerStyle}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={innerStyle}>{children}</View>
      </ScrollView>
    );
  }

  return (
    <View style={outerStyle}>
      <View style={innerStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  inner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  content: {
    paddingBottom: 24,
  },
});

