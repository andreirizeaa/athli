import React, { useRef, useLayoutEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

type ButtonTabGroupOption<T extends string> = {
  value: T;
  label: string;
};

type ButtonTabGroupProps<T extends string> = {
  options: ButtonTabGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export const ButtonTabGroup = <T extends string>({
  options,
  value,
  onChange,
}: ButtonTabGroupProps<T>) => {
  const { colors: themeColors } = useThemePreference();
  const pillPosition = useRef(new Animated.Value(0)).current;
  const [buttonDimensions, setButtonDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const index = options.findIndex((option) => option.value === value);
    Animated.spring(pillPosition, {
      toValue: index * buttonDimensions.width,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [value, buttonDimensions.width, options]);

  const handleButtonLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setButtonDimensions({ width, height });
  };

  return (
    <View style={[styles.buttonGroup, { backgroundColor: themeColors.surfaceSecondary }]}>
      {/* Animated pill background */}
      {buttonDimensions.width > 0 && (
        <Animated.View
          style={[
            styles.animatedPill,
            {
              backgroundColor: themeColors.background,
              width: buttonDimensions.width,
              height: buttonDimensions.height,
              transform: [{ translateX: pillPosition }],
            },
          ]}
        />
      )}
      {options.map((option, index) => {
        const isSelected = value === option.value;
        return (
          <PressableOpacity
            key={option.value}
            onLayout={index === 0 ? handleButtonLayout : undefined}
            style={styles.buttonGroupButton}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                styles.buttonGroupText,
                { color: isSelected ? themeColors.text : themeColors.mutedText },
                isSelected && styles.buttonGroupTextActive,
              ]}
            >
              {option.label}
            </Text>
          </PressableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  buttonGroup: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 4,
    position: 'relative',
  },
  animatedPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonGroupButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  buttonGroupText: {
    ...typography.p2,
    fontWeight: '600',
  },
  buttonGroupTextActive: {
    fontWeight: '700',
  },
});

