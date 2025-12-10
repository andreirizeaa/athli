import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';

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
    <TouchableOpacity
      style={[
        styles.button,
        {
          borderColor: disabled ? themeColors.mutedText : themeColors.primary,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
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
    </TouchableOpacity>
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

