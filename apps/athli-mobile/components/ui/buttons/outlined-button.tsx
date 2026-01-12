import React from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

type OutlinedButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const OutlinedButton = ({ label, onPress, disabled = false, style, textStyle }: OutlinedButtonProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <PressableOpacity
      style={[
        styles.button,
        {
          borderColor: disabled ? themeColors.mutedText : themeColors.primary,
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
            color: disabled ? themeColors.mutedText : themeColors.primary,
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
    flex: 1,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonText: {
    ...typography.p1,
    fontWeight: '600',
  },
});

