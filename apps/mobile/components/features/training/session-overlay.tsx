import React from 'react';
import { StyleSheet, Text, Pressable, ViewStyle, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { typography } from '@/constants/typography';

type SessionOverlayProps = {
  visible: boolean;
  text: string;
  animatedStyle?: ViewStyle;
  textAnimatedStyle?: TextStyle;
  showConfetti?: boolean;
  onPress?: () => void;
};

/**
 * Generic overlay component for workout session transitions.
 * Used for rest periods, phase transitions, completion celebrations, etc.
 * Has high z-index (1100) to appear above header blur.
 */
export const SessionOverlay = ({
  visible,
  text,
  animatedStyle,
  textAnimatedStyle,
  showConfetti = false,
  onPress,
}: SessionOverlayProps) => {
  if (!visible) return null;

  const content = (
    <>
      {showConfetti && (
        <LottieView
          source={require('@/assets/animations/confetti.json')}
          autoPlay
          loop={false}
          style={styles.confettiAnimation}
        />
      )}
      {textAnimatedStyle ? (
        <Animated.Text style={[styles.overlayText, textAnimatedStyle]}>
          {text}
        </Animated.Text>
      ) : (
        <Text style={styles.overlayText}>{text}</Text>
      )}
    </>
  );

  return (
    <Animated.View style={[styles.overlay, animatedStyle]}>
      {onPress ? (
        <Pressable style={styles.pressableContainer} onPress={onPress}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: -500,
    left: -50,
    right: -50,
    bottom: -500,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confettiAnimation: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    zIndex: 0,
  },
  overlayText: {
    ...typography.h1,
    color: '#FFFFFF',
    textAlign: 'center',
    zIndex: 1,
  },
});
