import React, { useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
  withSequence,
} from 'react-native-reanimated';
import { appColors } from '../../../constants/appColorScheme';

interface AnimatedOptionButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  isSelected: boolean;
  delay: number;
  style?: any;
  activeOpacity?: number;
  hasIcon?: boolean; // New prop to indicate if the button has an icon
  disabled?: boolean; // New prop to disable the button
}

export function AnimatedOptionButton({
  children,
  onPress,
  isSelected,
  delay,
  style,
  activeOpacity = 0.7,
  hasIcon = false, // Default to false
  disabled = false, // Default to false
}: AnimatedOptionButtonProps) {
  const translateY = useSharedValue(delay === 0 ? 0 : 30);
  const opacity = useSharedValue(delay === 0 ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // If delay is 0, don't animate - show immediately
    if (delay === 0) return;

    // Animate in with a staggered delay
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 25,
        stiffness: 200,
        mass: 0.6,
      })
    );

    opacity.value = withDelay(
      delay,
      withSpring(1, {
        damping: 25,
        stiffness: 200,
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePress = () => {
    // Don't handle press if disabled
    if (disabled) return;

    // Call the original onPress function immediately to update selection state
    onPress();

    // Bounce animation: scale down to 0.95, then back to 1 (slightly faster)
    scale.value = withSequence(
      withSpring(0.95, {
        damping: 18,
        stiffness: 250,
        mass: 0.6,
      }),
      withSpring(1, {
        damping: 18,
        stiffness: 250,
        mass: 0.6,
      })
    );
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isSelected
              ? appColors.onboarding.button.active.background
              : appColors.onboarding.button.inactive.background,
            paddingVertical: hasIcon ? 14 : 22, // Conditional padding
          },
          style,
        ]}
        onPress={handlePress}
        activeOpacity={disabled ? 1 : activeOpacity}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    // borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 24,
  },
});
