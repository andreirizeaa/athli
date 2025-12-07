import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TranslucentStatusBarProps {
  visible?: boolean;
  blurIntensity?: number;
  tint?: 'light' | 'dark' | 'default';
  extraHeight?: number;
}

export function TranslucentStatusBar({
  visible = true,
  blurIntensity = Platform.OS === 'ios' ? 15 : 15,
  tint = 'light',
  extraHeight = 0,
}: TranslucentStatusBarProps) {
  const insets = useSafeAreaInsets();
  const height = Math.max(0, insets.top) - extraHeight;

  if (!visible || height === 0) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { height }]}>
      <BlurView intensity={blurIntensity} tint={tint} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100000,
    overflow: 'hidden',
  },
});
