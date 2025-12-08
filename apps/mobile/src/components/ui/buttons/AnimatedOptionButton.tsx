import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

interface AnimatedOptionButtonProps {
  isSelected: boolean;
  delay?: number;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export function AnimatedOptionButton({
  isSelected,
  delay = 0,
  onPress,
  disabled = false,
  style,
  children,
}: AnimatedOptionButtonProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, [delay, fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

