import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
  attachmentPicker?: React.ReactNode;
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
  attachmentPicker,
}: KeyboardAwareToolbarProps) => {
  const insets = useSafeAreaInsets();
  const { height } = useGradualAnimation();

  // Adjust base heights when reply preview is shown
  // Reply preview row adds approximately 54px (padding + 2 text lines + gap)
  const REPLY_PREVIEW_HEIGHT = 54;
  // Attachment picker row adds approximately 112px (paddingVertical 32px + icon circle 56px + gap 8px + text ~16px)
  const ATTACHMENT_PICKER_HEIGHT = 112;

  // Animated values for smooth height transitions
  const animatedReplyHeight = useSharedValue(0);
  const animatedAttachmentHeight = useSharedValue(0);

  // Animate height adjustments when reply preview or attachment picker appears/disappears
  useEffect(() => {
    animatedReplyHeight.value = withTiming(
      replyPreview ? REPLY_PREVIEW_HEIGHT : 0,
      { duration: 250 }
    );
  }, [replyPreview, animatedReplyHeight]);

  useEffect(() => {
    animatedAttachmentHeight.value = withTiming(
      attachmentPicker ? ATTACHMENT_PICKER_HEIGHT : 0,
      { duration: 250 }
    );
  }, [attachmentPicker, animatedAttachmentHeight]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';

    // Calculate total height adjustment from animated values
    const heightAdjustment = animatedReplyHeight.value + animatedAttachmentHeight.value;

    const adjustedClosedBaseHeight = closedBaseHeight + heightAdjustment;
    const adjustedOpenBaseHeight = openBaseHeight + heightAdjustment;

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
  }, [closedBaseHeight, openBaseHeight, insets.bottom]);

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
      {attachmentPicker}
    </Animated.View>
  );
};



const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-start',
  },
});

