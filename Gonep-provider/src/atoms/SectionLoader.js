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
    <View style={[styles.wrap, isFullScreen ? styles.wrapFull : styles.wrapSection]}>
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
  wrap: { alignItems: 'center', justifyContent: 'center' },
  wrapSection: { paddingVertical: 12 },
  wrapFull: { flex: 1, paddingVertical: 24 },
  percent: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  loaderStack: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  ring: { position: 'absolute', borderWidth: 4 },
  ringSection: { width: 56, height: 56, borderRadius: 28 },
  ringFull: { width: 104, height: 104, borderRadius: 52, borderWidth: 6 },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logoWrapSection: { width: 34, height: 34, borderRadius: 17 },
  logoWrapFull: { width: 62, height: 62, borderRadius: 31 },
  logo: { width: 24, height: 24 },
  logoFull: { width: 42, height: 42 },
  label: { fontSize: 12, fontWeight: '600' },
});
