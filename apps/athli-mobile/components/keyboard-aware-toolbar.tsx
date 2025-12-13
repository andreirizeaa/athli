import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import { useGradualAnimation } from '@/hooks/useGradualAnimation';

const KEYBOARD_MAX_HEIGHT = 300;

type KeyboardAwareToolbarProps = {
  children: React.ReactNode;
  closedBaseHeight?: number;
  openBaseHeight?: number;
  backgroundColor?: string;
  contentStyle?: ViewStyle;
  containerStyle?: ViewStyle;
  onLayout?: (event: { nativeEvent: { layout: { height: number } } }) => void;
  replyPreview?: React.ReactNode;
};

export const KeyboardAwareToolbar = ({
  children,
  closedBaseHeight = 40,
  openBaseHeight = 12,
  backgroundColor,
  contentStyle,
  containerStyle,
  onLayout,
  replyPreview,
}: KeyboardAwareToolbarProps) => {
  const insets = useSafeAreaInsets();
  const { height } = useGradualAnimation();

  // Adjust base heights when reply preview is shown
  // Reply preview row adds approximately 54px (padding + 2 text lines + gap)
  const REPLY_PREVIEW_HEIGHT = 54;
  const adjustedClosedBaseHeight = replyPreview ? closedBaseHeight + REPLY_PREVIEW_HEIGHT : closedBaseHeight;
  const adjustedOpenBaseHeight = replyPreview ? openBaseHeight + REPLY_PREVIEW_HEIGHT : openBaseHeight;

  const containerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';

    // 0 → 1 smoothly as keyboard opens/closes
    const progress = interpolate(
      height.value,
      [0, KEYBOARD_MAX_HEIGHT],
      [0, 1],
      Extrapolate.CLAMP
    );

    const baseHeight = interpolate(
      progress,
      [0, 1],
      [adjustedClosedBaseHeight, adjustedOpenBaseHeight],
      Extrapolate.CLAMP
    );

    return {
      height: baseHeight + height.value + insets.bottom,
    };
  }, [adjustedClosedBaseHeight, adjustedOpenBaseHeight, insets.bottom]);

  return (
    <Animated.View
      style={[
        styles.container,
        containerAnimatedStyle,
        backgroundColor && { backgroundColor },
        containerStyle,
      ]}
      onLayout={onLayout}
    >
      {replyPreview}
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </Animated.View>
  );
};



const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-start',
  },
});

