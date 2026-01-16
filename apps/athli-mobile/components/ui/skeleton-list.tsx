import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useThemePreference } from '@/stores';

type SkeletonListProps = {
  itemCount?: number;
};

export const SkeletonList = ({ itemCount = 8 }: SkeletonListProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View style={styles.container}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <SkeletonItem
          key={index}
          themeColors={themeColors}
          isLastItem={index === itemCount - 1}
        />
      ))}
    </View>
  );
};

type SkeletonItemProps = {
  themeColors: any;
  isLastItem: boolean;
};

const SkeletonItem = React.memo(({ themeColors, isLastItem }: SkeletonItemProps) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View>
      <View style={styles.itemContainer}>
        {/* Avatar skeleton */}
        <Animated.View
          style={[
            styles.avatarSkeleton,
            { backgroundColor: themeColors.surfacePrimary },
            animatedStyle,
          ]}
        />

        {/* Content skeleton */}
        <View style={styles.contentSkeleton}>
          {/* Name line */}
          <Animated.View
            style={[
              styles.nameLine,
              { backgroundColor: themeColors.surfacePrimary },
              animatedStyle,
            ]}
          />
          {/* Subtitle line */}
          <Animated.View
            style={[
              styles.subtitleLine,
              { backgroundColor: themeColors.surfacePrimary },
              animatedStyle,
            ]}
          />
        </View>

        {/* Chevron skeleton */}
        <Animated.View
          style={[
            styles.chevronSkeleton,
            { backgroundColor: themeColors.surfacePrimary },
            animatedStyle,
          ]}
        />
      </View>

      {/* Separator */}
      <View style={styles.separatorContainer}>
        <View
          style={[
            styles.separator,
            { backgroundColor: themeColors.mutedText, opacity: 0.3 },
          ]}
        />
      </View>

      {isLastItem && <View style={{ height: 60 }} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  avatarSkeleton: {
    width: 54,
    height: 54,
    borderRadius: 8,
    marginRight: 12,
  },
  contentSkeleton: {
    flex: 1,
    justifyContent: 'center',
  },
  nameLine: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  subtitleLine: {
    height: 14,
    borderRadius: 4,
    width: '40%',
  },
  chevronSkeleton: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  separatorContainer: {
    paddingLeft: 82,
    paddingRight: 16,
  },
  separator: {
    height: 0.75,
  },
});
