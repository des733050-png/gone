import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function SectionLoader({ label = 'Loading...', mode = 'section' }) {
  const { C } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const isFullScreen = mode === 'full';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: isFullScreen ? 900 : 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [isFullScreen, spin]);

  useEffect(() => {
    if (!isFullScreen) return undefined;
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 60);
    return () => clearInterval(timer);
  }, [isFullScreen]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ringStyle = useMemo(
    () => ({
      borderColor: `${C.success}33`,
      borderTopColor: C.success,
      borderRightColor: C.success,
    }),
    [C.success]
  );

  return (
    <View style={[styles.wrap, isFullScreen ? styles.fullWrap : null]}>
      {isFullScreen ? (
        <Text style={[styles.percent, { color: C.success }]}>{progress}%</Text>
      ) : null}
      <View style={styles.loaderStack}>
        <Animated.View
          style={[
            styles.ring,
            isFullScreen ? styles.ringFull : styles.ringSection,
            ringStyle,
            { transform: [{ rotate }] },
          ]}
        />
        <View
          style={[
            styles.logoWrap,
            isFullScreen ? styles.logoWrapFull : styles.logoWrapSection,
            { backgroundColor: C.primaryLight },
          ]}
        >
          <Image source={require('../../assets/logo.png')} style={isFullScreen ? styles.logoFull : styles.logo} resizeMode="contain" />
        </View>
      </View>
      <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
    </View>
  );
}

export function FullScreenLoader({ label = 'Loading...' }) {
  return <SectionLoader label={label} mode="full" />;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  fullWrap: {
    minHeight: 240,
    paddingVertical: 28,
  },
  percent: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  ring: {
    position: 'absolute',
    borderWidth: 5,
    borderRadius: 999,
  },
  loaderStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSection: {
    width: 62,
    height: 62,
  },
  ringFull: {
    width: 116,
    height: 116,
    borderWidth: 6,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapSection: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  logoWrapFull: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  logo: {
    width: 26,
    height: 26,
  },
  logoFull: {
    width: 46,
    height: 46,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
});
