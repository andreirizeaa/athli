import React from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

type FilledButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const FilledButton = ({ label, onPress, disabled = false, style, textStyle }: FilledButtonProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <PressableOpacity
      style={[
        styles.button,
        {
          backgroundColor: disabled ? themeColors.surfaceSecondary : themeColors.primary,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      onPress={onPress}
      enabled={!disabled}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: disabled ? themeColors.mutedText : themeColors.primaryForeground,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </PressableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.p1,
  },
});

